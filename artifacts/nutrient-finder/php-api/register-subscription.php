<?php
// Issues a server-generated device credential to a mobile client.
//
// This endpoint ONLY issues credentials by atomically consuming an unclaimed row in
// rc_webhook_claims — a table written exclusively by rc-webhook.php in response to
// HMAC-verified RevenueCat server-to-server webhooks.  It NEVER calls the RevenueCat
// REST API directly.  It does NOT accept rc_app_user_id alone as proof of entitlement.
//
// Two credential-issuance paths (both require a webhook claim to exist):
//
// PRIMARY — { transaction_id }
//   The mobile client sends the transaction identifier returned by the RC SDK's
//   purchasePackage() result (transaction.transactionIdentifier).  This value is:
//     - present in the RC webhook payload (event.transaction_id), and
//     - visible only to the device whose purchase triggered the webhook.
//   An attacker who knows only rc_app_user_id cannot reproduce this value.
//
// RESTORE — { restore_nonce }
//   The mobile client first calls generate-restore-nonce.php (gets a server-generated
//   256-bit nonce), then calls Purchases.setAttributes({ restore_nonce: <nonce> }) to
//   embed the nonce in the subscriber's RevenueCat profile, then calls
//   Purchases.restorePurchases(), which causes RC to fire a server-to-server webhook.
//   rc-webhook.php reads the nonce from the webhook's subscriber_attributes and stores
//   it in rc_webhook_claims.restore_nonce.  The client then calls this endpoint with
//   { restore_nonce }; the server looks up the webhook claim by nonce.
//
//   Why this prevents spoofing:
//     Writing to a subscriber's RC attributes requires running the SDK under that
//     user's app_user_id context.  A third party who merely knows the subscriber's
//     rc_app_user_id cannot set attributes on that account — the SDK sets attributes
//     on the caller's own (different) account.  Therefore the nonce stored in the
//     webhook is guaranteed to have been placed there by the legitimate device.
//     An attacker who calls generate-restore-nonce.php and gets their OWN nonce cannot
//     inject it into the target subscriber's RC account.
//
// Security properties
// -------------------
// - Possession of rc_app_user_id alone cannot obtain a credential.
// - Webhook rows are one-time-use (atomic UPDATE WHERE claimed_at IS NULL, rowCount).
// - Webhook-verified credentials (source='webhook') are never overwritten by
//   restore-path credentials, preventing credential rotation attacks.
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

// Issues a 256-bit server-generated credential for rc_app_user_id.
// Uses ON DUPLICATE KEY UPDATE with IF() guards so a webhook-verified credential
// (source='webhook') is never overwritten by a later restore-path credential.
// If a webhook credential already exists for this user, returns 409 — the client
// should use its stored credential rather than overwrite it.
function issue_credential(PDO $db, string $rc_app_user_id, string $source): string {
    $credential     = bin2hex(random_bytes(32));
    $credentialHash = hash('sha256', $credential);

    $db->prepare("
        INSERT INTO device_credentials (credential_hash, rc_app_user_id, source, last_verified_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
            credential_hash  = IF(source = 'webhook' AND VALUES(source) = 'restore',
                                  credential_hash, VALUES(credential_hash)),
            source           = IF(source = 'webhook' AND VALUES(source) = 'restore',
                                  source, VALUES(source)),
            last_verified_at = IF(source = 'webhook' AND VALUES(source) = 'restore',
                                  last_verified_at, NOW())
    ")->execute([$credentialHash, $rc_app_user_id, $source]);

    // Verify our credential was actually persisted (the IF() guards may have blocked it).
    $stmt = $db->prepare("SELECT credential_hash FROM device_credentials WHERE rc_app_user_id = ? LIMIT 1");
    $stmt->execute([$rc_app_user_id]);
    $stored = $stmt->fetchColumn();

    if ($stored !== $credentialHash) {
        // A webhook-verified credential already exists for this user.
        http_response_code(409);
        echo json_encode(['error' => 'A webhook-verified credential already exists; use your stored credential']);
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

// Validate restore_nonce format (64 hex chars) to prevent injection.
if (!empty($restore_nonce) && !preg_match('/^[a-f0-9]{64}$/', $restore_nonce)) {
    $restore_nonce = '';
}

if (empty($transaction_id) && empty($restore_nonce)) {
    http_response_code(400);
    echo json_encode(['error' => 'transaction_id or restore_nonce is required']);
    exit;
}

try {
    $db = get_db();

    ensure_webhook_claims_table($db);
    ensure_credentials_table($db);

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
    // The restore_nonce was generated by generate-restore-nonce.php, embedded in the
    // subscriber's RevenueCat attributes via Purchases.setAttributes(), and then
    // delivered to rc-webhook.php via a trusted server-to-server webhook payload.
    //
    // An attacker who knows rc_app_user_id cannot inject their nonce into the
    // target's RC attribute — the SDK writes attributes under the caller's own
    // account context.  Therefore this nonce is trusted to have been set by the
    // legitimate device.
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

    // No unclaimed webhook claim matches this nonce.
    // Either the webhook has not yet arrived (RC delivery can be delayed by a few
    // seconds) or the nonce was already claimed.  Return 202 so the client can
    // retry after a short delay.
    http_response_code(202);
    echo json_encode(['message' => 'No matching claim found; retry shortly or restore purchases again']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Service unavailable']);
}
