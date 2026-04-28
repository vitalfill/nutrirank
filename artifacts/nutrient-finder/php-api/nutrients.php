<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

try {
    $db = get_db();
    $stmt = $db->query(
        "SELECT Nutr_No, NutrDesc, Units
         FROM NUTR_DEF
         ORDER BY NutrDesc ASC"
    );
    $nutrients = $stmt->fetchAll();

    echo json_encode(['nutrients' => $nutrients], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error', 'message' => $e->getMessage()]);
}
