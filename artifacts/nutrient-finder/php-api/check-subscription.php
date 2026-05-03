<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$input = json_decode(file_get_contents('php://input'), true);
$email = isset($input['email']) ? strtolower(trim($input['email'])) : '';

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'subscribed' => false, 'message' => 'Valid email required']);
    exit;
}

// --- Check local DB cache first ---
try {
    $db = get_db();

    // Auto-create subscriptions table if not present
    $db->exec("
        CREATE TABLE IF NOT EXISTS app_subscriptions (
            email       VARCHAR(255) NOT NULL UNIQUE,
            expires_at  DATETIME     NOT NULL,
            stripe_sub_id VARCHAR(255),
            created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $stmt = $db->prepare("SELECT expires_at FROM app_subscriptions WHERE email = ?");
    $stmt->execute([$email]);
    $row = $stmt->fetch();

    if ($row && strtotime($row['expires_at']) > time()) {
        echo json_encode([
            'success'    => true,
            'subscribed' => true,
            'expires_at' => strtotime($row['expires_at']),
        ]);
        exit;
    }
} catch (PDOException $e) {
    // Non-fatal — fall through to Stripe check
}

// --- Live Stripe check ---
if (!defined('STRIPE_SECRET_KEY') || empty(STRIPE_SECRET_KEY)) {
    echo json_encode(['success' => true, 'subscribed' => false]);
    exit;
}

$ch = curl_init('https://api.stripe.com/v1/customers/search?query=' . urlencode("email:\"$email\"") . '&limit=1');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_USERPWD, STRIPE_SECRET_KEY . ':');
$response = curl_exec($ch);
curl_close($ch);

$customers = json_decode($response, true);
if (empty($customers['data'][0]['id'])) {
    echo json_encode(['success' => true, 'subscribed' => false]);
    exit;
}

$customerId = $customers['data'][0]['id'];

$ch = curl_init("https://api.stripe.com/v1/subscriptions?customer={$customerId}&status=active&limit=5");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_USERPWD, STRIPE_SECRET_KEY . ':');
$response = curl_exec($ch);
curl_close($ch);

$subs = json_decode($response, true);
$activeSub = null;
foreach ($subs['data'] ?? [] as $sub) {
    if ($sub['status'] === 'active') {
        $activeSub = $sub;
        break;
    }
}

if (!$activeSub) {
    echo json_encode(['success' => true, 'subscribed' => false]);
    exit;
}

$expiresAt = $activeSub['current_period_end'];

// Cache in DB
try {
    $db = get_db();
    $stmt = $db->prepare("
        INSERT INTO app_subscriptions (email, expires_at, stripe_sub_id)
        VALUES (?, FROM_UNIXTIME(?), ?)
        ON DUPLICATE KEY UPDATE expires_at = FROM_UNIXTIME(?), stripe_sub_id = ?, updated_at = NOW()
    ");
    $stmt->execute([$email, $expiresAt, $activeSub['id'], $expiresAt, $activeSub['id']]);
} catch (PDOException $e) {
    // Non-fatal
}

echo json_encode(['success' => true, 'subscribed' => true, 'expires_at' => $expiresAt]);
