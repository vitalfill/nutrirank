<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

// Nutrient numbers that are always free (no subscription required).
// This list is the authoritative server-side source of truth — the mobile client
// mirrors it for UI purposes only.
const FREE_NUTRIENT_NOS = ['208', '203', '204', '504', '301', '306', '320', '318', '430', '629', '257', '513'];

// Verify that a RevenueCat subscriber has an active "premium" entitlement.
// Returns true only when the secret key is configured, the API returns HTTP 200,
// and the entitlement exists with a future (or null) expiry date.
// Fails closed on any error so that a mis-configured key never grants free access.
function verify_revenuecat_entitlement(string $app_user_id, string $entitlement = 'premium'): bool {
    if (!defined('REVENUECAT_SECRET_KEY') || empty(REVENUECAT_SECRET_KEY) || REVENUECAT_SECRET_KEY === 'sk_...') {
        return false;
    }

    $url = 'https://api.revenuecat.com/v1/subscribers/' . rawurlencode($app_user_id);
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . REVENUECAT_SECRET_KEY,
            'Content-Type: application/json',
            'Accept: application/json',
        ],
    ]);
    $response = curl_exec($ch);
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$response) {
        return false;
    }

    $data         = json_decode($response, true);
    $entitlements = $data['subscriber']['entitlements'] ?? [];

    if (!isset($entitlements[$entitlement])) {
        return false;
    }

    $expiresDate = $entitlements[$entitlement]['expires_date'] ?? null;
    if ($expiresDate === null) {
        return true; // Lifetime entitlement
    }

    return strtotime($expiresDate) > time();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST required']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$nutr_no    = isset($input['nutrient_no']) ? trim($input['nutrient_no']) : '';
$food_groups = isset($input['food_groups']) && is_array($input['food_groups'])
    ? array_map('trim', $input['food_groups'])
    : [];
$page       = max(1, (int)($input['page'] ?? 1));

if (!$nutr_no || empty($food_groups)) {
    http_response_code(400);
    echo json_encode(['error' => 'nutrient_no and food_groups are required']);
    exit;
}

// --- Server-side entitlement enforcement ---
// Premium nutrients require a valid RevenueCat subscription verified server-side.
// The mobile client sends its RevenueCat appUserID with every search request;
// we use that to query RevenueCat's REST API for the "premium" entitlement.
if (!in_array($nutr_no, FREE_NUTRIENT_NOS, true)) {
    $rc_app_user_id = isset($input['rc_app_user_id']) ? trim($input['rc_app_user_id']) : '';

    if (empty($rc_app_user_id)) {
        http_response_code(403);
        echo json_encode(['error' => 'Subscription required']);
        exit;
    }

    if (!verify_revenuecat_entitlement($rc_app_user_id)) {
        http_response_code(403);
        echo json_encode(['error' => 'Subscription required']);
        exit;
    }
}

try {
    $db = get_db();
    $limit  = 10;
    $offset = ($page - 1) * $limit;

    // Build placeholders for IN clause
    $groupPh = implode(',', array_fill(0, count($food_groups), '?'));

    // --- Nutrient meta ---
    $nStmt = $db->prepare("SELECT Nutr_No, NutrDesc, Units FROM NUTR_DEF WHERE Nutr_No = ?");
    $nStmt->execute([$nutr_no]);
    $nutrient = $nStmt->fetch();

    if (!$nutrient) {
        http_response_code(404);
        echo json_encode(['error' => 'Nutrient not found']);
        exit;
    }

    // --- Total count ---
    $cStmt = $db->prepare("
        SELECT COUNT(*)
        FROM FOOD_DES f
        JOIN NUT_DATA d ON f.NDB_No = d.NDB_No
        WHERE d.Nutr_No = ?
          AND f.FdGrp_Cd IN ($groupPh)
    ");
    $cStmt->execute(array_merge([$nutr_no], $food_groups));
    $total       = (int)$cStmt->fetchColumn();
    $total_pages = max(1, (int)ceil($total / $limit));
    $page        = min($page, $total_pages);

    // --- Foods page ---
    $fStmt = $db->prepare("
        SELECT f.NDB_No, f.Long_Desc, f.FdGrp_Cd, d.Nutr_Val
        FROM FOOD_DES f
        JOIN NUT_DATA d ON f.NDB_No = d.NDB_No
        WHERE d.Nutr_No = ?
          AND f.FdGrp_Cd IN ($groupPh)
        ORDER BY d.Nutr_Val DESC
        LIMIT $limit OFFSET $offset
    ");
    $fStmt->execute(array_merge([$nutr_no], $food_groups));
    $foods = $fStmt->fetchAll();

    // --- Weights ---
    $ndb_nos = array_column($foods, 'NDB_No');
    $weights = [];

    if (!empty($ndb_nos)) {
        $wPh   = implode(',', array_fill(0, count($ndb_nos), '?'));
        $wStmt = $db->prepare("
            SELECT NDB_No, Amount, Msre_Desc, Gm_Wgt
            FROM WEIGHT
            WHERE NDB_No IN ($wPh)
            ORDER BY NDB_No, Seq
        ");
        $wStmt->execute($ndb_nos);

        while ($row = $wStmt->fetch()) {
            $nid = $row['NDB_No'];
            unset($row['NDB_No']);
            $weights[$nid][] = [
                'Amount'    => (float)$row['Amount'],
                'Msre_Desc' => $row['Msre_Desc'],
                'Gm_Wgt'    => (float)$row['Gm_Wgt'],
            ];
        }
    }

    // --- Attach weights to foods ---
    $result_foods = array_map(function ($f) use ($weights) {
        return [
            'NDB_No'   => $f['NDB_No'],
            'Long_Desc'=> $f['Long_Desc'],
            'FdGrp_Cd' => $f['FdGrp_Cd'],
            'Nutr_Val' => (float)$f['Nutr_Val'],
            'weights'  => $weights[$f['NDB_No']] ?? [],
        ];
    }, $foods);

    echo json_encode([
        'nutrient'    => $nutrient,
        'total'       => $total,
        'total_pages' => $total_pages,
        'page'        => $page,
        'foods'       => $result_foods,
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
