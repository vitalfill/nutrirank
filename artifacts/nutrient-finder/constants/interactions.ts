/**
 * Short, evidence-based "pairs with" interaction hints shown in NutrientInfoBox.
 * Keys are Nutr_No strings.
 */
export const NUTRIENT_INTERACTIONS: Record<string, string> = {
  "203": "Pair with Vitamin B6 — it's required to metabolize protein and build neurotransmitters.",
  "204": "Fat unlocks fat-soluble vitamins A, D, E & K — eat them together for full absorption.",
  "205": "Pair with fiber-rich carbs to slow digestion and avoid blood sugar spikes.",
  "208": "Balance caloric intake with protein and fiber to stay fuller longer.",
  "291": "Pair with water — soluble fiber needs hydration to form the gel that slows digestion.",
  "301": "Vitamin D boosts calcium absorption by up to 40%; avoid excess zinc, which competes.",
  "303": "Vitamin C (e.g., lemon juice) dramatically increases non-heme iron absorption from plants.",
  "304": "Pair with Vitamin D & Calcium — magnesium helps activate Vitamin D and regulate calcium.",
  "305": "Works with calcium and magnesium to build bone; Vitamin D controls phosphorus balance.",
  "306": "Works best alongside low sodium intake to lower blood pressure.",
  "307": "Balance sodium with potassium (K) to reduce its effect on blood pressure.",
  "309": "Vitamin C improves zinc absorption; avoid calcium and iron supplements at the same time.",
  "312": "Iron and copper are interdependent — copper is needed to release iron from storage.",
  "315": "Vitamin C enhances manganese uptake from plant sources.",
  "317": "Pairs synergistically with Vitamin E for antioxidant protection at the cell membrane.",
  "318": "Fat is required for absorption; zinc helps convert beta-carotene to active Vitamin A.",
  "320": "Fat is required for absorption; zinc helps convert beta-carotene to active Vitamin A.",
  "323": "Selenium regenerates Vitamin E after it neutralizes free radicals.",
  "324": "Required for calcium and phosphorus absorption; magnesium helps activate Vitamin D.",
  "328": "Required for calcium and phosphorus absorption; magnesium helps activate Vitamin D.",
  "401": "Enhances non-heme iron absorption — add citrus to iron-rich plant meals.",
  "404": "Pairs with magnesium and other B vitamins for energy production in the citric acid cycle.",
  "405": "Works with B3 (Niacin) and B6 in the electron transport chain for ATP production.",
  "406": "Pairs with Riboflavin (B2) and Tryptophan; tryptophan can convert to niacin.",
  "415": "Works with folate and B12 in one-carbon metabolism; high B6 can deplete B12.",
  "417": "Pairs with Vitamin B12 — both are essential for methylation and DNA synthesis.",
  "435": "Pairs with Vitamin B12 — both are essential for methylation and DNA synthesis.",
  "418": "Pairs with folate; Vitamin C can destroy B12 in high doses — don't take together.",
  "421": "Pairs with Inositol for liver health; Vitamin B12 and folate support choline metabolism.",
  "430": "Pairs with Vitamin D for bone mineralization; Vitamin A in excess can antagonize K.",
  "601": "Dietary fat and Vitamin D enable cholesterol conversion to hormones and Vitamin D3.",
  "606": "Balance saturated fat with omega-3s (EPA, DHA) to offset cardiovascular effects.",
  "621": "Vitamin E protects DHA from oxidation; pairs with EPA for full omega-3 benefit.",
  "629": "Works synergistically with DHA; Vitamin D enhances EPA's anti-inflammatory effects.",
  "851": "Alpha-Linolenic Acid converts to EPA/DHA at low efficiency (~5%); eating preformed EPA/DHA is more effective.",
};

export function getInteraction(nutrNo: string): string | null {
  return NUTRIENT_INTERACTIONS[nutrNo] ?? null;
}
