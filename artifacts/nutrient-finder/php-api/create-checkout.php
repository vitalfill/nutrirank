<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';

$input = json_decode(file_get_contents('php://input'), true);
$email = isset($input['email']) ? trim($input['email']) : '';

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

$success_url = defined('APP_BASE_URL') ? APP_BASE_URL . '/subscribe-success.php?session_id={CHECKOUT_SESSION_ID}' : 'https://drgily.com/app-api/subscribe-success.php?session_id={CHECKOUT_SESSION_ID}';
$cancel_url  = defined('APP_BASE_URL') ? APP_BASE_URL . '/subscribe-cancel.php' : 'https://drgily.com/app-api/subscribe-cancel.php';

$payload = [
    'mode'                   => 'subscription',
    'customer_email'         => $email,
    'success_url'            => $success_url,
    'cancel_url'             => $cancel_url,
    'line_items[0][price]'   => defined('STRIPE_PRICE_ID') ? STRIPE_PRICE_ID : '',
    'line_items[0][quantity]'=> '1',
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
