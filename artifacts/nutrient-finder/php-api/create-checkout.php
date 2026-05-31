<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$input = json_decode(file_get_contents('php://input'), true);
$email = isset($input['email']) ? strtolower(trim($input['email'])) : '';

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Valid email required']);
    exit;
}

if (!defined('STRIPE_SECRET_KEY') || empty(STRIPE_SECRET_KEY)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Stripe not configured']);
    exit;
}

// Generate a one-time verify token bound to this checkout session.
// Only someone who completes payment and sees the Stripe success redirect
// will have this token, which is required to call check-subscription.php.
$token     = bin2hex(random_bytes(32));
$tokenHash = hash('sha256', $token);
$expiresAt = date('Y-m-d H:i:s', strtotime('+48 hours'));

try {
    $db = get_db();
    $db->exec("
        CREATE TABLE IF NOT EXISTS app_verify_tokens (
            id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            email       VARCHAR(255) NOT NULL,
            token_hash  CHAR(64)     NOT NULL,
            expires_at  DATETIME     NOT NULL,
            used        TINYINT(1)   NOT NULL DEFAULT 0,
            created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_email_token (email, token_hash)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    $stmt = $db->prepare(
        "INSERT INTO app_verify_tokens (email, token_hash, expires_at) VALUES (?, ?, ?)"
    );
    $stmt->execute([$email, $tokenHash, $expiresAt]);
} catch (PDOException $e) {
    // If token storage fails we cannot proceed — the caller must have the
    // token to verify their subscription, so returning a URL without one
    // would leave them unable to complete verification.
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Could not create checkout']);
    exit;
}

$base        = defined('APP_BASE_URL') ? APP_BASE_URL : 'https://drgily.com/app-api';
$success_url = $base . '/subscribe-success.php'
    . '?session_id={CHECKOUT_SESSION_ID}'
    . '&token=' . urlencode($token)
    . '&email='  . urlencode($email);
$cancel_url  = $base . '/subscribe-cancel.php';

$payload = [
    'mode'                    => 'subscription',
    'customer_email'          => $email,
    'success_url'             => $success_url,
    'cancel_url'              => $cancel_url,
    'line_items[0][price]'    => defined('STRIPE_PRICE_ID') ? STRIPE_PRICE_ID : '',
    'line_items[0][quantity]' => '1',
];

$ch = curl_init('https://api.stripe.com/v1/checkout/sessions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($payload));
curl_setopt($ch, CURLOPT_USERPWD, STRIPE_SECRET_KEY . ':');
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode($response, true);

if ($httpCode !== 200 || empty($data['url'])) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $data['error']['message'] ?? 'Stripe error']);
    exit;
}

echo json_encode(['success' => true, 'url' => $data['url']]);
