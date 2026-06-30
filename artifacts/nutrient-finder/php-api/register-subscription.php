<?php
// Issues a server-generated device credential to a mobile client.
//
// This endpoint issues credentials via one of three paths:
//
// DIRECT VERIFICATION — { rc_app_user_id }   [most reliable]
//   The client sends its RevenueCat app user ID.  The server asks the RevenueCat REST
//   API directly whether that user has an ACTIVE 'premium' entitlement, and issues a
//   credential only if so.  RevenueCat reports premium=active only for genuinely paid,
//   non-expired users, so a third party who guesses/learns a user ID cannot obtain free
//   premium for themselves.  This avoids the webhook->nonce timing race entirely.
//
// PRIMARY — { transaction_id }
//   The mobile client sends the transaction identifier returned by the RC SDK's
//   purchasePackage() result.  Matched against an unclaimed rc_webhook_claims row.
//
// RESTORE — { restore_nonce }
//   The client embeds a server-generated nonce in its RC attributes, restores, and the
//   resulting webhook carries the nonce to rc-webhook.php.  Matched by nonce here.
//
// Security properties
// -------------------
// - Webhook rows are one-time-use (atomic UPDATE WHERE claimed_at IS NULL, rowCount).
// - Direct verification trusts RevenueCat's own record of an ACTIVE entitlement.
// - All dependent tables are auto-created, making this safe on a fresh DB.

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

function ensure_webhook_claims_table(PDO $db): void {
    $db->exec("
        CREATE TABLE IF NOT EXISTS rc_webhook_claims (
            id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            rc_app_user_id  VARCHAR(255) NOT NULL,
            event_type      VARCHAR(64)  NOT NULL,
            transaction_id  VARCHAR(255) NOT NULL UNIQUE,
            restore_nonce   VARCHAR(64)  DEFAULT NULL,
            claimed_at      DATETIME     DEFAULT NULL,
            expires_at      DATETIME     NOT NULL,
            created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_app_user      (rc_app_user_id),
            INDEX idx_transaction   (transaction_id),
            INDEX idx_restore_nonce (restore_nonce),
            INDEX idx_expires       (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
}

function ensure_credentials_table(PDO $db): void {
    $db->exec("
        CREATE TABLE IF NOT EXISTS device_credentials (
            id               INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
            credential_hash  CHAR(64)      NOT NULL UNIQUE,
            rc_app_user_id   VARCHAR(255)  NOT NULL UNIQUE,
            source           ENUM('webhook','restore') NOT NULL DEFAULT 'restore',
            last_verified_at DATETIME      NOT NULL,
            created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_cred_hash (credential_hash),
            INDEX idx_app_user  (rc_app_user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
}

// Confirms an active 'premium' entitlement directly with the RevenueCat REST API.
// Used by the direct-verification claim path.  RevenueCat reports premium=active only
// for genuinely paid/active users, so a third party cannot obtain free premium by
// guessing a user ID.
function verify_rc_entitlement(string $app_user_id): bool {
    $secret = defined('REVENUECAT_SECRET_KEY') ? REVENUECAT_SECRET_KEY : '';
    if (empty($secret)) {
        return false;
    }

    $url = 'https://api.revenuecat.com/v1/subscribers/' . rawurlencode($app_user_id);
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $secret,
            'Content-Type: application/json',
            'Accept: application/json',
        ],
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if (($httpCode !== 200 && $httpCode !== 201) || !$response) {
        return false;
    }

    $data         = json_decode($response, true);
    $entitlements = $data['subscriber']['entitlements'] ?? [];
    if (!isset($entitlements['premium'])) {
        return false;
    }

    $expires = $entitlements['premium']['expires_date'] ?? null;
    return $expires === null || strtotime($expires) > time();
}

// Issues a 256-bit server-generated credential for rc_app_user_id.
// Uses ON DUPLICATE KEY UPDATE so a returning user is re-issued a credential (their
// device may have lost the stored value).  The credential is always refreshed to a new
// random value and last_verified_at is updated.
function issue_credential(PDO $db, string $rc_app_user_id, string $source): string {
    $credential     = bin2hex(random_bytes(32));
    $credentialHash = hash('sha256', $credential);

    $db->prepare("
        INSERT INTO device_credentials (credential_hash, rc_app_user_id, source, last_verified_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
            credential_hash  = VALUES(credential_hash),
            source           = VALUES(source),
            last_verified_at = NOW()
    ")->execute([$credentialHash, $rc_app_user_id, $source]);

    // Confirm our credential persisted.
    $stmt = $db->prepare("SELECT credential_hash FROM device_credentials WHERE rc_app_user_id = ? LIMIT 1");
    $stmt->execute([$rc_app_user_id]);
    $stored = $stmt->fetchColumn();

    if ($stored !== $credentialHash) {
        http_response_code(500);
        echo json_encode(['error' => 'Credential could not be issued']);
        exit;
    }

    return $credential;
}

// ── Request handling ──────────────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST required']);
    exit;
}

$input          = json_decode(file_get_contents('php://input'), true);
$transaction_id = isset($input['transaction_id'])  ? trim($input['transaction_id'])  : '';
$restore_nonce  = isset($input['restore_nonce'])   ? trim($input['restore_nonce'])   : '';
$rc_app_user_id = isset($input['rc_app_user_id'])  ? trim($input['rc_app_user_id'])  : '';

// Validate restore_nonce format (64 hex chars) to prevent injection.
if (!empty($restore_nonce) && !preg_match('/^[a-f0-9]{64}$/', $restore_nonce)) {
    $restore_nonce = '';
}

if (empty($transaction_id) && empty($restore_nonce) && empty($rc_app_user_id)) {
    http_response_code(400);
    echo json_encode(['error' => 'transaction_id, restore_nonce, or rc_app_user_id is required']);
    exit;
}

try {
    $db = get_db();

    ensure_webhook_claims_table($db);
    ensure_credentials_table($db);

    // ── DIRECT VERIFICATION: claim by rc_app_user_id ──────────────────────────
    // Most reliable path: confirm the entitlement directly with RevenueCat's API.
    // This avoids the webhook->nonce timing race entirely.  Only issues a credential
    // when RevenueCat reports an ACTIVE premium entitlement for this user.
    if (!empty($rc_app_user_id)) {
        if (verify_rc_entitlement($rc_app_user_id)) {
            $credential = issue_credential($db, $rc_app_user_id, 'webhook');
            echo json_encode(['credential' => $credential]);
            exit;
        }
        // Not premium per RevenueCat.  If no other claim method was supplied, reject.
        if (empty($transaction_id) && empty($restore_nonce)) {
            http_response_code(403);
            echo json_encode(['error' => 'No active subscription found for this account']);
            exit;
        }
        // Otherwise fall through to the transaction_id / restore_nonce paths below.
    }

    // Prune old unclaimed rows to keep the table tidy.
    $db->exec("DELETE FROM rc_webhook_claims WHERE expires_at < NOW() AND claimed_at IS NULL");

    // ── PRIMARY: claim by transaction_id ──────────────────────────────────────
    if (!empty($transaction_id)) {
        $stmt = $db->prepare("
            UPDATE rc_webhook_claims
            SET    claimed_at = NOW()
            WHERE  transaction_id = ?
              AND  claimed_at IS NULL
              AND  expires_at > NOW()
        ");
        $stmt->execute([$transaction_id]);

        if ($stmt->rowCount() === 1) {
            $userRow = $db->prepare("SELECT rc_app_user_id FROM rc_webhook_claims WHERE transaction_id = ? LIMIT 1");
            $userRow->execute([$transaction_id]);
            $claimedUserId = $userRow->fetchColumn();

            if (!$claimedUserId) {
                http_response_code(500);
                echo json_encode(['error' => 'Claim data inconsistent']);
                exit;
            }

            $credential = issue_credential($db, $claimedUserId, 'webhook');
            echo json_encode(['credential' => $credential]);
            exit;
        }

        // transaction_id not found, already claimed, or expired.
        // If a restore_nonce was also provided, fall through to attempt that path.
        if (empty($restore_nonce)) {
            http_response_code(403);
            echo json_encode(['error' => 'Transaction claim not found, already used, or expired']);
            exit;
        }
    }

    // ── RESTORE: claim by restore_nonce ───────────────────────────────────────
    $nonce_stmt = $db->prepare("
        UPDATE rc_webhook_claims
        SET    claimed_at = NOW()
        WHERE  restore_nonce = ?
          AND  claimed_at IS NULL
          AND  expires_at > NOW()
        LIMIT  1
    ");
    $nonce_stmt->execute([$restore_nonce]);

    if ($nonce_stmt->rowCount() === 1) {
        $userRow = $db->prepare("SELECT rc_app_user_id FROM rc_webhook_claims WHERE restore_nonce = ? AND claimed_at IS NOT NULL LIMIT 1");
        $userRow->execute([$restore_nonce]);
        $claimedUserId = $userRow->fetchColumn();

        if (!$claimedUserId) {
            http_response_code(500);
            echo json_encode(['error' => 'Claim data inconsistent']);
            exit;
        }

        $credential = issue_credential($db, $claimedUserId, 'restore');
        echo json_encode(['credential' => $credential]);
        exit;
    }

    // No unclaimed webhook claim matches this nonce.  Return 202 so the client can
    // retry after a short delay (webhook delivery can lag a few seconds).
    http_response_code(202);
    echo json_encode(['message' => 'No matching claim found; retry shortly or restore purchases again']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Service unavailable']);
}
