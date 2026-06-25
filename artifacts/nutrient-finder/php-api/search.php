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
if (!in_array($nutr_no, FREE_NUTRIENT_NOS, true)) {
    $rc_entitlement_token = isset($input['rc_entitlement_token']) ? trim($input['rc_entitlement_token']) : '';

    if (empty($rc_entitlement_token) || !verify_entitlement_token($rc_entitlement_token)) {
        http_response_code(403);
        echo json_encode(['error' => 'Subscription required']);
        exit;
    }
}

// ---------------------------------------------------------------------------
// Returns true if the Msre_Desc string identifies this as the NLEA/label serving.
// ---------------------------------------------------------------------------
function is_nlea_serving(string $desc): bool {
    return (bool) preg_match('/\bnlea\b|^(1\s+)?serving$/i', trim($desc));
}

// ---------------------------------------------------------------------------
// Choose the best single serving for a food given its weight options and group.
//
// Priority:
//   1. NLEA serving (Msre_Desc matches NLEA pattern)
//   2. Nuts & seeds (FdGrp_Cd 1200) → 1 oz (28.35 g), synthesised if absent
//   3. Most-realistic heuristic: household measure in 15–250 g, closest to 100 g
//   4. Returns null → caller falls back to 100 g and sets is_fallback = true
//
// Returns [$chosen_weight_or_null, $weights_array]
// $weights_array may have a synthetic entry prepended (nuts case only).
// ---------------------------------------------------------------------------
function select_serving(array $weights, string $fd_grp_cd): array {

    // 1. NLEA serving
    foreach ($weights as $w) {
        if (!empty($w['is_nlea'])) {
            return [$w, $weights];
        }
    }

    // 2. Nuts & seeds → 1 oz
    if ($fd_grp_cd === '1200') {
        // Prefer existing entry near 28.35 g
        foreach ($weights as $w) {
            if (preg_match('/\b(oz|ounce)\b/i', $w['Msre_Desc']) && abs($w['Gm_Wgt'] - 28.35) < 5) {
                return [$w, $weights];
            }
        }
        // Any oz entry
        foreach ($weights as $w) {
            if (preg_match('/\b(oz|ounce)\b/i', $w['Msre_Desc'])) {
                return [$w, $weights];
            }
        }
        // Synthesise
        $syn = ['Amount' => 1.0, 'Msre_Desc' => '1 oz', 'Gm_Wgt' => 28.35, 'is_nlea' => false];
        array_unshift($weights, $syn);
        return [$syn, $weights];
    }

    // 3. Most-realistic serving heuristic
    $household_re = '/\b(cup|piece|slice|oz|ounce|tbsp|tsp|tablespoon|teaspoon|fl\s+oz|fluid\s+oz|serving|portion|item|unit|medium|large|small|fillet|steak|chop|breast|thigh|wing|leg|can|bottle|package|pkg|bar|patty|link|strip|nugget)\b/i';

    // Build candidates with gram weights in [15, 250]
    $candidates = [];
    foreach ($weights as $w) {
        if ($w['Gm_Wgt'] >= 15 && $w['Gm_Wgt'] <= 250) {
            $candidates[] = array_merge($w, ['_hh' => (int)(bool) preg_match($household_re, $w['Msre_Desc'])]);
        }
    }

    // Widen range if nothing in range
    if (empty($candidates)) {
        foreach ($weights as $w) {
            if ($w['Gm_Wgt'] >= 5 && $w['Gm_Wgt'] <= 500) {
                $candidates[] = array_merge($w, ['_hh' => (int)(bool) preg_match($household_re, $w['Msre_Desc'])]);
            }
        }
    }

    // Accept any positive weight as last resort before true fallback
    if (empty($candidates)) {
        foreach ($weights as $w) {
            if ($w['Gm_Wgt'] > 0) {
                $candidates[] = array_merge($w, ['_hh' => 0]);
            }
        }
    }

    if (empty($candidates)) {
        return [null, $weights];
    }

    // Sort: prefer household measures, then closest to 100 g (deterministic)
    usort($candidates, function ($a, $b) {
        if ($a['_hh'] !== $b['_hh']) {
            return $b['_hh'] - $a['_hh'];
        }
        return abs($a['Gm_Wgt'] - 100) - abs($b['Gm_Wgt'] - 100);
    });

    $chosen = $candidates[0];
    unset($chosen['_hh']);
    return [$chosen, $weights];
}

try {
    $db    = get_db();
    $limit = 10;

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

    // --- Fetch ALL foods + ALL their weights in one query (no LIMIT) ---
    // Ranking must happen in PHP so the serving-selection heuristic determines sort order.
    // MySQL filters by nutrient + food groups; PHP groups, applies heuristic, sorts, paginates.
    $params = array_merge([$nutr_no], $food_groups);
    $allStmt = $db->prepare("
        SELECT f.NDB_No, f.Long_Desc, f.FdGrp_Cd, d.Nutr_Val,
               w.Amount    AS w_Amount,
               w.Msre_Desc AS w_Msre_Desc,
               w.Gm_Wgt    AS w_Gm_Wgt
        FROM FOOD_DES f
        JOIN NUT_DATA d ON f.NDB_No = d.NDB_No
        LEFT JOIN WEIGHT w ON f.NDB_No = w.NDB_No
        WHERE d.Nutr_No = ?
          AND f.FdGrp_Cd IN ($groupPh)
        ORDER BY f.NDB_No, w.Seq
    ");
    $allStmt->execute($params);

    // --- Group rows by food, annotating each weight with is_nlea ---
    $foods = [];
    while ($row = $allStmt->fetch()) {
        $ndb = $row['NDB_No'];
        if (!isset($foods[$ndb])) {
            $foods[$ndb] = [
                'NDB_No'    => $ndb,
                'Long_Desc' => $row['Long_Desc'],
                'FdGrp_Cd'  => $row['FdGrp_Cd'],
                'Nutr_Val'  => (float)$row['Nutr_Val'],
                'weights'   => [],
            ];
        }
        if ($row['w_Gm_Wgt'] !== null && (float)$row['w_Gm_Wgt'] > 0) {
            $foods[$ndb]['weights'][] = [
                'Amount'    => (float)$row['w_Amount'],
                'Msre_Desc' => (string)$row['w_Msre_Desc'],
                'Gm_Wgt'    => (float)$row['w_Gm_Wgt'],
                'is_nlea'   => is_nlea_serving((string)$row['w_Msre_Desc']),
            ];
        }
    }

    // --- Apply serving selection + compute serve_val per food ---
    foreach ($foods as &$food) {
        [$chosen, $food['weights']] = select_serving($food['weights'], $food['FdGrp_Cd']);

        if ($chosen !== null) {
            $food['chosen_gm_wgt'] = (float)$chosen['Gm_Wgt'];
            $food['is_fallback']   = false;
        } else {
            $food['chosen_gm_wgt'] = 100.0;
            $food['is_fallback']   = true;
        }

        $food['serve_val'] = round(($food['Nutr_Val'] / 100) * $food['chosen_gm_wgt'], 4);
    }
    unset($food);

    // --- Sort descending by serve_val, then by Nutr_Val for ties (deterministic) ---
    $foods = array_values($foods);
    usort($foods, function ($a, $b) {
        if ($b['serve_val'] !== $a['serve_val']) {
            return $b['serve_val'] <=> $a['serve_val'];
        }
        return $b['Nutr_Val'] <=> $a['Nutr_Val'];
    });

    // --- Paginate ---
    $total       = count($foods);
    $total_pages = max(1, (int)ceil($total / $limit));
    $page        = min($page, $total_pages);
    $offset      = ($page - 1) * $limit;
    $page_foods  = array_slice($foods, $offset, $limit);

    echo json_encode([
        'nutrient'    => $nutrient,
        'total'       => $total,
        'total_pages' => $total_pages,
        'page'        => $page,
        'foods'       => $page_foods,
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
