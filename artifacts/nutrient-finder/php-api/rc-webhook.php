<?php
// Receives RevenueCat purchase-lifecycle webhooks and records the store transaction_id
// bound to the rc_app_user_id that completed each purchase.
//
// Security model
// --------------
// This endpoint is called by RevenueCat's servers, not by the mobile client.  It
// validates the Authorization: Bearer <NUTRIRANK_RC_WEBHOOK_SECRET> header, which
// RevenueCat signs using the shared secret configured in the project's webhook settings.
// All data written here — transaction_id and restore_nonce — therefore originates from a
// trusted server-to-server call, not from the mobile app.
//
// restore_nonce handling
// ----------------------
// For restore flows, the mobile client calls generate-restore-nonce.php to get a
// server-generated nonce, then calls Purchases.setAttributes({ restore_nonce: nonce })
// to embed it in the subscriber's RevenueCat profile BEFORE calling
// Purchases.restorePurchases().  When RC fires the webhook after a restore, it includes
// the subscriber's current attributes (event.subscriber_attributes.restore_nonce.value).
// This webhook handler reads that value and stores it alongside the transaction_id.
//
// Security guarantee: writing subscriber attributes to a RevenueCat account requires
// running the RC SDK under that user's app_user_id context.  A third party who merely
// knows a subscriber's rc_app_user_id cannot set attributes on that account; the SDK
// would set the attribute on their own (different) account.  Therefore the nonce in the
// webhook payload is trusted to have been written by the legitimate device.
//
// After the webhook arrives, the client calls register-subscription.php with:
//   { transaction_id }   — for purchase flows (no nonce needed)
//   { restore_nonce }    — for restore flows (no rc_app_user_id needed)
// In both cases the server issues a credential only if a matching webhook claim exists.
//
// Setup: RevenueCat Dashboard → Project → Integrations → Webhooks → add endpoint
// https://drgily.com/app-api/rc-webhook.php and copy the shared secret into the
// NUTRIRANK_RC_WEBHOOK_SECRET server environment variable.

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

const TRUSTED_EVENTS = [
    'INITIAL_PURCHASE',
    'RENEWAL',
    'RESUBSCRIBE',
    'NON_RENEWING_PURCHASE',
    'UNCANCELLATION',
];

// 24-hour window during which the mobile client may claim this transaction.
const CLAIM_TTL_SECONDS = 86400;

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

    // Add restore_nonce column if upgrading from an earlier schema.
    try {
        $db->exec("ALTER TABLE rc_webhook_claims ADD COLUMN restore_nonce VARCHAR(64) DEFAULT NULL");
        $db->exec("ALTER TABLE rc_webhook_claims ADD INDEX idx_restore_nonce (restore_nonce)");
    } catch (PDOException $e) {
        // Column already exists — safe to ignore.
        if (strpos($e->getMessage(), 'Duplicate column') === false &&
            strpos($e->getMessage(), 'already exists')   === false) {
            throw $e;
        }
    }
}

function is_authorized(): bool {
    $secret = defined('NUTRIRANK_RC_WEBHOOK_SECRET') ? NUTRIRANK_RC_WEBHOOK_SECRET : '';
    if (empty($secret)) {
        return false;
    }
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (strncmp($authHeader, 'Bearer ', 7) !== 0) {
        return false;
    }
    return hash_equals($secret, substr($authHeader, 7));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

if (!is_authorized()) {
    http_response_code(401);
    exit;
}

$body  = file_get_contents('php://input');
$event = json_decode($body, true);

$eventType     = $event['event']['type']           ?? '';
$appUserId     = $event['event']['app_user_id']    ?? '';
$transactionId = $event['event']['transaction_id'] ?? '';

// Read the restore_nonce the mobile client embedded via Purchases.setAttributes()
// before triggering the restore.  Present only on restore/renewal webhooks where the
// client went through the generate-restore-nonce.php flow.
$restoreNonce = $event['event']['subscriber_attributes']['restore_nonce']['value'] ?? null;
if (!empty($restoreNonce)) {
    $restoreNonce = substr(preg_replace('/[^a-f0-9]/', '', $restoreNonce), 0, 64);
    if (strlen($restoreNonce) !== 64) {
        $restoreNonce = null; // Ignore malformed nonces.
    }
}

if (!in_array($eventType, TRUSTED_EVENTS, true) || empty($appUserId) || empty($transactionId)) {
    // Non-purchase event or missing identifiers — acknowledge but do nothing.
    http_response_code(200);
    echo json_encode(['received' => true]);
    exit;
}

try {
    $db = get_db();
    ensure_webhook_claims_table($db);

    // Prune expired unclaimed rows before inserting.
    $db->exec("DELETE FROM rc_webhook_claims WHERE expires_at < NOW() AND claimed_at IS NULL");

    $expiresAt = date('Y-m-d H:i:s', time() + CLAIM_TTL_SECONDS);

    // Use INSERT IGNORE so duplicate transaction_ids from RC retries are silent no-ops.
    // If a later webhook retry includes the nonce but the earlier one did not, update it.
    $db->prepare("
        INSERT INTO rc_webhook_claims
            (rc_app_user_id, event_type, transaction_id, restore_nonce, expires_at)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            restore_nonce = COALESCE(restore_nonce, VALUES(restore_nonce))
    ")->execute([$appUserId, $eventType, $transactionId, $restoreNonce, $expiresAt]);

    http_response_code(200);
    echo json_encode(['received' => true]);

} catch (Exception $e) {
    // Return 500 so RevenueCat retries delivery.
    http_response_code(500);
    exit;
}
