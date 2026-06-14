<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

$ndb_no = isset($_GET['ndb_no']) ? trim($_GET['ndb_no']) : '';
if (empty($ndb_no) || !preg_match('/^\d+$/', $ndb_no)) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid ndb_no required']);
    exit;
}

try {
    $db = get_db();

    // Food description
    $stmt = $db->prepare("SELECT Long_Desc, FdGrp_Cd FROM FOOD_DES WHERE NDB_No = ?");
    $stmt->execute([$ndb_no]);
    $food = $stmt->fetch();
    if (!$food) {
        http_response_code(404);
        echo json_encode(['error' => 'Food not found']);
        exit;
    }

    // All nutrients ordered by SR_Order (standard USDA display order)
    $stmt = $db->prepare(
        "SELECT n.Nutr_No, n.NutrDesc, n.Units, COALESCE(n.SR_Order, 9999) AS SR_Order, nd.Nutr_Val
         FROM NUT_DATA nd
         JOIN NUTR_DEF n ON nd.Nutr_No = n.Nutr_No
         WHERE nd.NDB_No = ? AND nd.Nutr_Val > 0
         ORDER BY COALESCE(n.SR_Order, 9999) ASC"
    );
    $stmt->execute([$ndb_no]);
    $rows = $stmt->fetchAll();

    // Serving weights from WEIGHT table
    $wStmt = $db->prepare(
        "SELECT Amount, Msre_Desc, Gm_Wgt
         FROM WEIGHT
         WHERE NDB_No = ?
         ORDER BY Seq ASC"
    );
    $wStmt->execute([$ndb_no]);
    $weightRows = $wStmt->fetchAll();

    // Rename the key fatty acids
    $RENAMES = [
        '22:6 n-3 (DHA)' => 'DHA (22:6 n-3)',
        '20:5 n-3 (EPA)'  => 'EPA (20:5 n-3)',
        '18:3 n-3 c,c,c (ALA)' => 'Alpha-Linolenic Acid (18:3 n-3)',
        '22:6 n-3'  => 'DHA',
        '20:5 n-3'  => 'EPA',
        '18:3 n-3 c,c,c' => 'Alpha-Linolenic Acid',
    ];

    $nutrients = [];
    foreach ($rows as $row) {
        if (isset($RENAMES[$row['NutrDesc']])) {
            $row['NutrDesc'] = $RENAMES[$row['NutrDesc']];
        }
        $nutrients[] = [
            'Nutr_No'  => $row['Nutr_No'],
            'NutrDesc' => $row['NutrDesc'],
            'Units'    => $row['Units'],
            'Nutr_Val' => (float)$row['Nutr_Val'],
            'SR_Order' => (int)$row['SR_Order'],
        ];
    }

    $weights = [];
    foreach ($weightRows as $w) {
        $weights[] = [
            'Amount'    => (float)$w['Amount'],
            'Msre_Desc' => $w['Msre_Desc'],
            'Gm_Wgt'    => (float)$w['Gm_Wgt'],
        ];
    }

    echo json_encode([
        'ndb_no'    => $ndb_no,
        'Long_Desc' => $food['Long_Desc'],
        'FdGrp_Cd'  => $food['FdGrp_Cd'],
        'nutrients' => $nutrients,
        'weights'   => $weights,
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error', 'message' => $e->getMessage()]);
}
