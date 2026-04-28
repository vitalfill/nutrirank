<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST required']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$email = isset($input['email']) ? strtolower(trim($input['email'])) : '';

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid email address']);
    exit;
}

try {
    $db = get_db();

    // Create the table if it doesn't exist
    $db->exec("
        CREATE TABLE IF NOT EXISTS app_unlocks (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            email      VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // Insert or ignore duplicate
    $stmt = $db->prepare(
        "INSERT IGNORE INTO app_unlocks (email) VALUES (?)"
    );
    $stmt->execute([$email]);

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
