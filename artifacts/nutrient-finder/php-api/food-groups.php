<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

try {
    $db = get_db();
    $stmt = $db->query(
        "SELECT FdGrp_Cd, FdGrp_Desc
         FROM FD_GROUP
         ORDER BY FdGrp_Desc ASC"
    );
    $groups = $stmt->fetchAll();

    echo json_encode(['groups' => $groups], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error', 'message' => $e->getMessage()]);
}
