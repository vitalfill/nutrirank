<?php
// Issues a short-lived (5-minute) session token that search.php validates for premium
// nutrient searches.
//
// Accepts ONLY the server-generated device credential returned by register-subscription.php.
// Never accepts rc_app_user_id.  An attacker who learns a subscriber's RevenueCat app
// user ID cannot call this endpoint — they would need the device credential, which is a
// random 64-hex-character value generated server-side and stored only in the device's
// AsyncStorage.
//
// Residual risk: if a device credential is extracted from AsyncStorage (e.g. jailbroken
// device) it can be used from another host.  Full protection against this requires device
// attestation (Apple App Attest / Google Play Integrity), which is outside the scope of
// this server-side fix.  The 5-minute session TTL and periodic RC re-verification limit
// the blast radius.

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

const SESSION_TTL_SECONDS      = 300;    // 5 minutes
const RC_REVERIFY_INTERVAL_SEC = 14400;  // Re-check RevenueCat every 4 hours

function ensure_sessions_table(PDO $db): void {
    $db->exec("
        CREATE TABLE IF NOT EXISTS entitlement_sessions (
            id               INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
            token_hash       CHAR(64)      NOT NULL UNIQUE,
            credential_hash  CHAR(64)      NOT NULL,
            expires_at       DATETIME      NOT NULL,
            created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_cred_hash (credential_hash),
            INDEX idx_expires   (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
}

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
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$response) {
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST required']);
    exit;
}

$input      = json_decode(file_get_contents('php://input'), true);
$credential = isset($input['credential']) ? trim($input['credential']) : '';

if (empty($credential) || strlen($credential) !== 64 || !ctype_xdigit($credential)) {
    http_response_code(400);
    echo json_encode(['error' => 'credential is required']);
    exit;
}

try {
    $db             = get_db();
    $credentialHash = hash('sha256', $credential);

    // Look up the credential in the server-maintained registry.
    // This record was created by register-subscription.php after either:
    //   (a) verifying a RevenueCat webhook claim (webhook path), or
    //   (b) directly confirming an active RC entitlement (migration fallback).
    $regStmt = $db->prepare("
        SELECT rc_app_user_id, last_verified_at
        FROM   device_credentials
        WHERE  credential_hash = ?
        LIMIT 1
    ");
    $regStmt->execute([$credentialHash]);
    $credential_row = $regStmt->fetch();

    if (!$credential_row) {
        http_response_code(403);
        echo json_encode(['error' => 'Credential not recognised — re-register via the app']);
        exit;
    }

    // Periodically re-verify with RevenueCat to catch lapsed subscriptions.
    $lastVerified = strtotime($credential_row['last_verified_at']);
    if (time() - $lastVerified > RC_REVERIFY_INTERVAL_SEC) {
        if (!verify_rc_entitlement($credential_row['rc_app_user_id'])) {
            // Subscription lapsed — remove the credential so future calls also fail.
            $db->prepare("DELETE FROM device_credentials WHERE credential_hash = ?")
               ->execute([$credentialHash]);
            $db->prepare("DELETE FROM entitlement_sessions WHERE credential_hash = ?")
               ->execute([$credentialHash]);
            http_response_code(403);
            echo json_encode(['error' => 'Subscription required']);
            exit;
        }
        $db->prepare("UPDATE device_credentials SET last_verified_at = NOW() WHERE credential_hash = ?")
           ->execute([$credentialHash]);
    }

    ensure_sessions_table($db);

    // Invalidate any existing session for this credential (single active session per device)
    // and purge globally expired sessions to keep the table lean.
    $db->prepare("DELETE FROM entitlement_sessions WHERE credential_hash = ?")
       ->execute([$credentialHash]);
    $db->exec("DELETE FROM entitlement_sessions WHERE expires_at < NOW()");

    // Issue a fresh random session token.  Only the SHA-256 hash is persisted.
    $token      = bin2hex(random_bytes(32));
    $token_hash = hash('sha256', $token);
    $expires_at = date('Y-m-d H:i:s', time() + SESSION_TTL_SECONDS);

    $db->prepare("
        INSERT INTO entitlement_sessions (token_hash, credential_hash, expires_at)
        VALUES (?, ?, ?)
    ")->execute([$token_hash, $credentialHash, $expires_at]);

    echo json_encode([
        'token'      => $token,
        'expires_in' => SESSION_TTL_SECONDS,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Service unavailable']);
}
