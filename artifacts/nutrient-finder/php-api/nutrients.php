<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

// Nutrient numbers that are always free (no subscription required).
// This is the canonical server-side list; search.php enforces it on every request.
// 208=Energy(kcal), 203=Protein, 204=Fat, 504=Histidine,
// 301=Calcium, 306=Potassium, 320=Vitamin A RAE, 318=Vitamin A IU,
// 430=Vitamin K, 629=EPA, 513=Alanine, 511=Arginine,
// 851=Alpha-Linolenic Acid (ALA), 431=Folic acid
const FREE_NUTRIENT_NOS = ['208', '203', '204', '504', '301', '306', '320', '318', '430', '629', '513', '511', '851', '431'];

// Nutrient numbers to exclude entirely from the list
const EXCLUDE_NUTR_NOS = [
    '257',  // Adjusted Protein
    '435',  // Folate, DFE
    '432',  // Folate, food
    '417',  // Folate, total
];

// Fatty acids to keep and rename to their common name
$FATTY_ACID_RENAMES = [
    '22:6 n-3 (DHA)' => 'DHA',
    '20:5 n-3 (EPA)' => 'EPA',
    '18:3 n-3 c,c,c (ALA)' => 'Alpha-Linolenic Acid',
    // Also handle variants without parentheses
    '22:6 n-3'       => 'DHA',
    '20:5 n-3'       => 'EPA',
    '18:3 n-3 c,c,c' => 'Alpha-Linolenic Acid',
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
        $desc    = $row['NutrDesc'];
        $nutr_no = $row['Nutr_No'];

        // Skip explicitly excluded nutrients (Adjusted Protein, Folate variants)
        if (in_array($nutr_no, EXCLUDE_NUTR_NOS, true)) {
            continue;
        }

        // Check if it's one of the special fatty acids to keep and rename
        if (isset($FATTY_ACID_RENAMES[$desc])) {
            $row['NutrDesc'] = $FATTY_ACID_RENAMES[$desc];
            $row['is_free']  = in_array($nutr_no, FREE_NUTRIENT_NOS, true);
            $nutrients[] = $row;
            continue;
        }

        // Skip nutrients whose description starts with a digit (fatty acid chains etc.)
        if (preg_match('/^[0-9]/', $desc)) {
            continue;
        }

        $row['is_free'] = in_array($nutr_no, FREE_NUTRIENT_NOS, true);
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
