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
        return false;
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
        return false;
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
$page = max(1, (int)($input['page'] ?? 1));

if (!$nutr_no || empty($food_groups)) {
    http_response_code(400);
    echo json_encode(['error' => 'nutrient_no and food_groups are required']);
    exit;
}

// --- Server-side entitlement enforcement ---
if (!in_array($nutr_no, FREE_NUTRIENT_NOS, true)) {
    $rc_entitlement_token = isset($input['rc_entitlement_token']) ? trim($input['rc_entitlement_token']) : '';
    if (empty($rc_entitlement_token) || !verify_entitlement_token($rc_entitlement_token)) {
        http_response_code(403);
        echo json_encode(['error' => 'Subscription required']);
        exit;
    }
}

// ---------------------------------------------------------------------------
// NLEA detection: true when Msre_Desc identifies this as the labeled serving.
// ---------------------------------------------------------------------------
function is_nlea_serving(string $desc): bool {
    return (bool) preg_match('/\bnlea\b|^(1\s+)?serving$/i', trim($desc));
}

// ---------------------------------------------------------------------------
// STEP A — Compute RACC target (grams) for a food.
// Keyword overrides (first hit wins) take precedence over the group default.
// ---------------------------------------------------------------------------
function get_racc_target(string $fd_grp_cd, string $long_desc): float {
    $d = strtolower($long_desc);

    // -----------------------------------------------------------------------
    // 1. BAKED PRODUCTS (1800) — complete self-contained keyword table.
    //    Ingredient words like "milk" or "buttermilk" in the name are noise;
    //    only baked-goods shape/form keywords and ingredient forms matter here.
    // -----------------------------------------------------------------------
    if ($fd_grp_cd === '1800') {
        if (preg_match('/bagel|muffin|biscuit|waffle|pancake/', $d))               return 110.0;
        if (preg_match('/bread|cornbread|\broll\b|\bbun\b/', $d))                   return  50.0;
        if (preg_match('/cookie|cracker|wafer/', $d))                               return  30.0;
        if (preg_match('/cake|pie|pastr(y|ies)|pop.?tart|toaster\s+past|danish|donut|doughnut/', $d))
                                                                                    return  80.0;
        // Ingredient forms sold by weight — not a portion food
        if (preg_match('/baking powder|baking soda|\bleavening\b/', $d))           return   3.0;
        if (str_contains($d, 'yeast'))                                              return   3.0;
        if (preg_match('/cornstarch|\bstarch\b/', $d))                              return   8.0;
        if (str_contains($d, 'extract'))                                            return   4.0;
        if (preg_match('/flour|\bmeal\b|cornmeal/', $d))                            return  30.0;
        return 55.0; // group default
    }

    // -----------------------------------------------------------------------
    // 2. DAIRY & EGG (0100) + BEVERAGES (1400)
    //    Dairy/beverage keywords are scoped to these groups only.
    // -----------------------------------------------------------------------
    if (in_array($fd_grp_cd, ['0100', '1400'], true)) {
        if (str_contains($d, 'yogurt'))                                             return 170.0;
        if (preg_match('/sour cream|cream cheese/', $d))                            return  30.0;
        if (str_contains($d, 'cottage cheese'))                                     return 110.0;
        if (str_contains($d, 'cheese'))                                             return  30.0;
        if ($fd_grp_cd === '0100' && str_contains($d, 'egg'))                       return  50.0;
        if (preg_match('/nut butter|seed butter|peanut butter/', $d))               return  32.0;
        if (preg_match('/juice|nectar/', $d))                                       return 240.0;
        if (preg_match('/dry|dried|powder/', $d) && preg_match('/\b(milk|whey)\b/', $d))
                                                                                    return  30.0;
        if (preg_match('/milk|buttermilk/', $d))                                    return 240.0;
        if (preg_match('/\boil\b|\bbutter\b|margarine|lard/', $d))                  return  14.0;
        return (float)($fd_grp_cd === '0100' ? 30 : 240);
    }

    // -----------------------------------------------------------------------
    // 3. SPICES & HERBS (0200) — ingredient overrides scoped to this group
    // -----------------------------------------------------------------------
    if ($fd_grp_cd === '0200') {
        if (preg_match('/baking powder|baking soda|\bleavening\b/', $d))           return   3.0;
        if (str_contains($d, 'yeast'))                                              return   3.0;
        if (preg_match('/\bsalt\b/', $d) && !str_contains($d, 'salted'))           return   1.0;
        if (preg_match('/cornstarch|\bstarch\b/', $d))                              return   8.0;
        if (str_contains($d, 'gelatin'))                                            return   7.0;
        if (str_contains($d, 'cocoa') && str_contains($d, 'powder'))               return   5.0;
        if (str_contains($d, 'extract'))                                            return   4.0;
        if (str_contains($d, 'vinegar'))                                            return  15.0;
        return 2.0; // group default
    }

    // -----------------------------------------------------------------------
    // 4. SWEETS (1900) — ingredient and confection overrides
    // -----------------------------------------------------------------------
    if ($fd_grp_cd === '1900') {
        if (str_contains($d, 'cocoa') && str_contains($d, 'powder'))               return   5.0;
        if (str_contains($d, 'gelatin'))                                            return   7.0;
        if (str_contains($d, 'extract'))                                            return   4.0;
        if (preg_match('/cornstarch|\bstarch\b/', $d))                              return   8.0;
        if (str_contains($d, 'sugar'))                                              return   4.0;
        if (preg_match('/chocolate|cand(y|ies)/', $d))                             return  40.0;
        if (preg_match('/syrup|honey|\bjam\b|\bjelly\b|preserves/', $d))           return  21.0;
        return 40.0; // group default
    }

    // -----------------------------------------------------------------------
    // 5. FATS & OILS (0400) — dressings and condiments ~1 tbsp
    // -----------------------------------------------------------------------
    if ($fd_grp_cd === '0400') {
        if (preg_match('/dressing|mayonnaise|\bmayo\b/', $d))                      return  15.0;
        return 14.0; // group default (1 tbsp)
    }

    // -----------------------------------------------------------------------
    // 6. GLOBAL KEYWORD OVERRIDES — all remaining groups
    //    Dairy/beverage keywords (milk, yogurt, juice …) intentionally absent;
    //    they are only meaningful inside groups 0100 and 1400.
    // -----------------------------------------------------------------------
    if (preg_match('/spice|herb|\bleaves,\s*dried\b/', $d))                        return   2.0;
    if (str_contains($d, 'bacon'))                                                  return  15.0;
    if (preg_match('/nut butter|seed butter|peanut butter/', $d))                  return  32.0;
    if ($fd_grp_cd === '0900' && str_contains($d, 'dried'))                        return  40.0;
    if (preg_match('/\boil\b|\bbutter\b|margarine|lard/', $d))                     return  14.0;
    if (str_contains($d, 'soup'))                                                   return 245.0;
    if (preg_match('/sauce|gravy/', $d))                                            return  60.0;
    if (preg_match('/syrup|honey|\bjam\b|\bjelly\b|preserves/', $d))               return  21.0;
    if (preg_match('/chocolate|cand(y|ies)/', $d))                                 return  40.0;
    if (preg_match('/flour|\bmeal\b|cornmeal/', $d))                               return  30.0;
    if ($fd_grp_cd === '2000' && str_contains($d, 'cooked'))                       return 140.0;
    if (preg_match('/lettuce|spinach, raw|greens, raw/', $d))                      return  85.0;
    // "tofu" scoped to legumes (1600) only — prevents "Mayonnaise, made with tofu"
    // and similar condiments from picking up the legume serving size.
    if ($fd_grp_cd === '1600' && str_contains($d, 'tofu'))                         return  85.0;

    // Group defaults — plain array (not static) so every call is guaranteed a value.
    // Hard fallback of 100 g for any group code not in the table.
    $defaults = [
        '0100' => 30,  '0200' => 2,   '0300' => 60,  '0400' => 14,  '0500' => 85,
        '0600' => 120, '0700' => 55,  '0800' => 40,  '0900' => 140, '1000' => 85,
        '1100' => 85,  '1200' => 30,  '1300' => 85,  '1400' => 240, '1500' => 85,
        '1600' => 90,  '1700' => 85,  '1800' => 55,  '1900' => 40,  '2000' => 50,
        '2100' => 140, '2200' => 140, '2500' => 30,  '3500' => 140, '3600' => 140,
    ];
    return (float)($defaults[$fd_grp_cd] ?? 100);
}

// ---------------------------------------------------------------------------
// STEP B — Snap to the closest available weight within the acceptance band.
// Returns ['chosen' => $weight_or_null, 'in_band' => bool].
// ---------------------------------------------------------------------------
function snap_to_weight(array $weights, float $target): array {
    if (empty($weights)) return ['chosen' => null, 'in_band' => false];

    // Drop bulk-container descriptors unless that leaves nothing.
    // "container" is intentionally excluded here: single-serve containers such as
    // "container (6 oz)" are valid household measures and must not be filtered out.
    $bulk_re = '/package|carton|bottle|\bcan\b|\bjar\b|\blb\b|pound|\bkg\b|quart|gallon|\bbulk\b/i';
    $filtered = array_values(array_filter($weights, fn($w) => !preg_match($bulk_re, $w['Msre_Desc'])));
    if (empty($filtered)) $filtered = array_values($weights);

    // Only positive gram weights.
    $candidates = array_values(array_filter($filtered, fn($w) => $w['Gm_Wgt'] > 0));
    if (empty($candidates)) return ['chosen' => null, 'in_band' => false];

    $hh_re = '/\boz\b|slice|piece|\bcup\b|\beach\b|medium|large|\btbsp\b/i';

    // Sort by: Δ from target ASC (spaceship on floats) → household preferred →
    //          Amount closest to 1 → smaller Gm_Wgt → first in list.
    usort($candidates, function ($a, $b) use ($target, $hh_re) {
        $cmp = abs($a['Gm_Wgt'] - $target) <=> abs($b['Gm_Wgt'] - $target);
        if ($cmp !== 0) return $cmp;
        $ha = (int)(bool) preg_match($hh_re, $a['Msre_Desc']);
        $hb = (int)(bool) preg_match($hh_re, $b['Msre_Desc']);
        if ($ha !== $hb) return $hb - $ha;
        $cmp2 = abs($a['Amount'] - 1) <=> abs($b['Amount'] - 1);
        if ($cmp2 !== 0) return $cmp2;
        return $a['Gm_Wgt'] <=> $b['Gm_Wgt'];
    });

    $chosen  = $candidates[0];
    // Tightened acceptance band: 0.65×–1.5× of target.
    $in_band = ($chosen['Gm_Wgt'] >= $target * 0.65 && $chosen['Gm_Wgt'] <= $target * 1.5);

    return ['chosen' => $chosen, 'in_band' => $in_band];
}

// ---------------------------------------------------------------------------
// Main serving-selection entry point.
// Priority: 1. NLEA weight  2. RACC snap  3. RACC target direct (is_fallback).
//
// Returns a flat array with all fields needed for the food result, including
// a possibly-modified $weights array (synthetic entry prepended for fallback).
// ---------------------------------------------------------------------------
function select_serving(array $weights, string $fd_grp_cd, string $long_desc): array {

    // 1. NLEA serving
    foreach ($weights as $w) {
        if (!empty($w['is_nlea'])) {
            return [
                'chosen_gm_wgt'    => (float)$w['Gm_Wgt'],
                'chosen_msre_desc' => (string)$w['Msre_Desc'],
                'chosen_amount'    => (float)$w['Amount'],
                'racc_target_g'    => get_racc_target($fd_grp_cd, $long_desc),
                'is_nlea'          => true,
                'is_fallback'      => false,
                'weights'          => $weights,
            ];
        }
    }

    // 2. RACC snap
    $racc = get_racc_target($fd_grp_cd, $long_desc);
    $snap = snap_to_weight($weights, $racc);

    if ($snap['chosen'] !== null && $snap['in_band']) {
        $w = $snap['chosen'];
        return [
            'chosen_gm_wgt'    => (float)$w['Gm_Wgt'],
            'chosen_msre_desc' => (string)$w['Msre_Desc'],
            'chosen_amount'    => (float)$w['Amount'],
            'racc_target_g'    => $racc,
            'is_nlea'          => false,
            'is_fallback'      => false,
            'weights'          => $weights,
        ];
    }

    // 3. RACC target direct — synthesise a weight entry so the picker matches.
    $syn_desc = ((int)round($racc)) . ' g (typical serving)';
    $syn      = ['Amount' => 1.0, 'Msre_Desc' => $syn_desc, 'Gm_Wgt' => (float)$racc, 'is_nlea' => false];

    return [
        'chosen_gm_wgt'    => (float)$racc,
        'chosen_msre_desc' => $syn_desc,
        'chosen_amount'    => 1.0,
        'racc_target_g'    => $racc,
        'is_nlea'          => false,
        'is_fallback'      => true,
        'weights'          => array_merge([$syn], $weights), // prepend so picker finds it first
    ];
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
    // Ranking happens in PHP so the serving-selection heuristic can determine sort order
    // correctly before pagination is applied.
    $params  = array_merge([$nutr_no], $food_groups);
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

    // --- Group rows by food; annotate each weight with is_nlea ---
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

    // --- Apply RACC-based serving selection + compute serve_val ---
    foreach ($foods as &$food) {
        $sel = select_serving($food['weights'], $food['FdGrp_Cd'], $food['Long_Desc']);

        $food['chosen_gm_wgt']    = $sel['chosen_gm_wgt'];
        $food['chosen_msre_desc'] = $sel['chosen_msre_desc'];
        $food['chosen_amount']    = $sel['chosen_amount'];
        $food['racc_target_g']    = $sel['racc_target_g'];
        $food['is_nlea']          = $sel['is_nlea'];
        $food['is_fallback']      = $sel['is_fallback'];
        $food['weights']          = $sel['weights'];
        $food['serve_val']        = round(($food['Nutr_Val'] / 100) * $food['chosen_gm_wgt'], 4);
    }
    unset($food);

    // --- Sort descending by serve_val; break ties by Nutr_Val (deterministic) ---
    $foods = array_values($foods);
    usort($foods, function ($a, $b) {
        if ($b['serve_val'] !== $a['serve_val']) return $b['serve_val'] <=> $a['serve_val'];
        return $b['Nutr_Val']  <=> $a['Nutr_Val'];
    });

    // --- Paginate ---
    $total       = count($foods);
    $total_pages = max(1, (int) ceil($total / $limit));
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
