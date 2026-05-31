<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

// Nutrient numbers that are always free (no subscription required).
// This is the canonical server-side list; search.php enforces it on every request.
const FREE_NUTRIENT_NOS = ['208', '203', '204', '504', '301', '306', '320', '318', '430', '629', '257', '513'];

// Fatty acids to keep and rename to their common abbreviation
$FATTY_ACID_RENAMES = [
    '22:6 n-3 (DHA)' => 'DHA',
    '20:5 n-3 (EPA)' => 'EPA',
    '18:3 n-3 c,c,c (ALA)' => 'ALA',
    // Also handle variants without parentheses
    '22:6 n-3'       => 'DHA',
    '20:5 n-3'       => 'EPA',
    '18:3 n-3 c,c,c' => 'ALA',
];

try {
    $db = get_db();
    $stmt = $db->query(
        "SELECT Nutr_No, NutrDesc, Units
         FROM NUTR_DEF
         ORDER BY NutrDesc ASC"
    );
    $rows = $stmt->fetchAll();

    $nutrients = [];
    foreach ($rows as $row) {
        $desc = $row['NutrDesc'];

        // Check if it's one of the special fatty acids to keep
        if (isset($FATTY_ACID_RENAMES[$desc])) {
            $row['NutrDesc'] = $FATTY_ACID_RENAMES[$desc];
            $row['is_free']  = in_array($row['Nutr_No'], FREE_NUTRIENT_NOS, true);
            $nutrients[] = $row;
            continue;
        }

        // Skip nutrients whose description starts with a digit (fatty acid chains etc.)
        if (preg_match('/^[0-9]/', $desc)) {
            continue;
        }

        $row['is_free'] = in_array($row['Nutr_No'], FREE_NUTRIENT_NOS, true);
        $nutrients[] = $row;
    }

    // Sort by renamed description
    usort($nutrients, function($a, $b) {
        return strcasecmp($a['NutrDesc'], $b['NutrDesc']);
    });

    echo json_encode(['nutrients' => $nutrients], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
