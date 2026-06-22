<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';


// Nutrient numbers that are always free (no subscription required).
// This list is the authoritative server-side source of truth — the mobile client
// mirrors it for UI purposes only.
const FREE_NUTRIENT_NOS = ['208', '203', '204', '504', '301', '306', '320', '318', '430', '629', '513', '511', '851', '431'];

// Validate an entitlement session token issued by verify-entitlement.php.
// The raw token is never stored; only its SHA-256 hash lives in the DB.
// Fails closed on any error (DB down, malformed token, expired, not found).
function verify_entitlement_token(string $token): bool {
    if (strlen($token) !== 64 || !ctype_xdigit($token)) {
        return false; // Fast-reject clearly invalid tokens before hitting the DB
    }

    try {
        $db         = get_db();
        $token_hash = hash('sha256', $token);
        $stmt       = $db->prepare("
            SELECT 1 FROM entitlement_sessions
            WHERE token_hash = ? AND expires_at > NOW()
            LIMIT 1
        ");
        $stmt->execute([$token_hash]);
        return $stmt->fetchColumn() !== false;
    } catch (Exception $e) {
        return false; // DB error → fail closed, never grant access
    }
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
// Premium nutrients require a valid short-lived session token issued by verify-entitlement.php.
// The token is a random 256-bit credential stored (hashed) server-side.  Only one active
// token exists per subscriber: re-issuing revokes the previous one, so a third party who
// obtained a shared app user ID can get at most one 5-minute window before the legitimate
// subscriber's next refresh invalidates their access.
if (!in_array($nutr_no, FREE_NUTRIENT_NOS, true)) {
    $rc_entitlement_token = isset($input['rc_entitlement_token']) ? trim($input['rc_entitlement_token']) : '';

    if (empty($rc_entitlement_token) || !verify_entitlement_token($rc_entitlement_token)) {
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
    // Rank by nutrient amount in the primary household serving:
    //   serve_val = (Nutr_Val / 100) × primary_Gm_Wgt
    // Foods without a WEIGHT entry fall back to 100 g (i.e. serve_val = Nutr_Val).
    $fStmt = $db->prepare("
        SELECT f.NDB_No, f.Long_Desc, f.FdGrp_Cd, d.Nutr_Val,
               COALESCE(pw.Gm_Wgt, 100)                           AS primary_gm_wgt,
               (d.Nutr_Val / 100) * COALESCE(pw.Gm_Wgt, 100)     AS serve_val
        FROM FOOD_DES f
        JOIN NUT_DATA d ON f.NDB_No = d.NDB_No
        LEFT JOIN (
            SELECT w1.NDB_No, w1.Gm_Wgt
            FROM WEIGHT w1
            JOIN (
                SELECT NDB_No, MIN(Seq) AS min_seq
                FROM WEIGHT
                GROUP BY NDB_No
            ) wmin ON w1.NDB_No = wmin.NDB_No AND w1.Seq = wmin.min_seq
        ) pw ON f.NDB_No = pw.NDB_No
        WHERE d.Nutr_No = ?
          AND f.FdGrp_Cd IN ($groupPh)
        ORDER BY serve_val DESC
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
            'serve_val'=> round((float)$f['serve_val'], 4),
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
