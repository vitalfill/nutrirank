import AsyncStorage from "@react-native-async-storage/async-storage";

export type UserProfile = "male" | "female" | "pregnant";

export const PROFILE_STORAGE_KEY = "nutrirank_user_profile";
export const DEFAULT_PROFILE: UserProfile = "male";

export const PROFILE_LABELS: Record<UserProfile, string> = {
  male:     "Male",
  female:   "Female",
  pregnant: "Female – Pregnant / Lactating",
};

export async function loadProfile(): Promise<UserProfile> {
  try {
    const stored = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
    if (stored === "male" || stored === "female" || stored === "pregnant") return stored;
  } catch {}
  return DEFAULT_PROFILE;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_STORAGE_KEY, profile);
}

/**
 * FDA Dietary Reference Intakes by profile.
 *
 * All values are in the units USDA SR28 stores them:
 *   - Fatty acids (621 DHA, 629 EPA, 851 ALA): grams
 *   - Minerals: mg (except Selenium 317 in mcg)
 *   - Vitamins: mg / mcg / IU / kcal as noted
 *
 * "pregnant" uses the higher of pregnant vs. lactating RDA/AI for each nutrient.
 */
export const DV_BY_PROFILE: Record<UserProfile, Record<string, number>> = {
  male: {
    // Macronutrients
    "208": 2500, "203": 56,   "204": 78,   "205": 275,  "291": 38,   "269": 50,
    // Lipids
    "606": 20,   "601": 300,
    // Fatty acids (g — DB stores in g)
    "621": 0.5,  "629": 0.5,  "851": 1.6,
    // Minerals (mg except Selenium in mcg)
    "301": 1000, "303": 8,    "304": 420,  "305": 700,  "306": 3400, "307": 2300,
    "309": 11,   "312": 0.9,  "315": 2.3,  "317": 55,
    // Vitamin A (mcg RAE for 320, IU for 318), D (mcg), E (mg), K (mcg)
    "320": 900,  "318": 3000, "323": 15,   "324": 20,   "328": 20,   "430": 120,
    // Water-soluble vitamins (mg, except B12 418 and folates in mcg)
    "401": 90,   "404": 1.2,  "405": 1.3,  "406": 16,   "410": 5,    "415": 1.7,
    "431": 400,  "417": 400,  "435": 400,  "418": 2.4,  "421": 550,
  },
  female: {
    "208": 2000, "203": 46,   "204": 78,   "205": 275,  "291": 25,   "269": 50,
    "606": 20,   "601": 300,
    "621": 0.5,  "629": 0.5,  "851": 1.1,
    "301": 1000, "303": 18,   "304": 320,  "305": 700,  "306": 2600, "307": 2300,
    "309": 8,    "312": 0.9,  "315": 1.8,  "317": 55,
    "320": 700,  "318": 2333, "323": 15,   "324": 20,   "328": 20,   "430": 90,
    "401": 75,   "404": 1.1,  "405": 1.1,  "406": 14,   "410": 5,    "415": 1.5,
    "431": 400,  "417": 400,  "435": 400,  "418": 2.4,  "421": 425,
  },
  pregnant: {
    // Higher of pregnant vs. lactating for each nutrient
    "208": 2400, "203": 71,   "204": 78,   "205": 275,  "291": 28,   "269": 50,
    "606": 20,   "601": 300,
    "621": 0.5,  "629": 0.5,  "851": 1.4,
    "301": 1000, "303": 27,   "304": 360,  "305": 700,  "306": 2900, "307": 2300,
    "309": 12,   "312": 1.3,  "315": 2.6,  "317": 70,
    "320": 1300, "318": 4333, "323": 19,   "324": 20,   "328": 20,   "430": 90,
    "401": 120,  "404": 1.4,  "405": 1.6,  "406": 18,   "410": 7,    "415": 2.0,
    "431": 600,  "417": 600,  "435": 500,  "418": 2.8,  "421": 550,
  },
};

/** Returns the DV value (in DB units) for a given nutrient + profile, or null if not defined. */
export function getDV(nutrNo: string, profile: UserProfile): number | null {
  const v = DV_BY_PROFILE[profile][nutrNo];
  return v !== undefined ? v : null;
}

// Fatty acids stored in g in the DB but conventionally labelled in mg
const FATTY_ACID_NOS = new Set(["621", "629", "851"]);

/**
 * Formats a profile-specific DV number into a human-readable label.
 * `unit` should be the raw DB unit string from NUTRIENT_DATA (e.g. "g", "mg", "mcg_RAE").
 */
export function formatDVLabel(nutrNo: string, dvValue: number, unit: string): string {
  if (FATTY_ACID_NOS.has(nutrNo)) {
    const mg = Math.round(dvValue * 1000);
    const formatted = mg >= 1000 ? mg.toLocaleString() : String(mg);
    if (nutrNo === "621" || nutrNo === "629") return `${formatted} mg (combined EPA+DHA)`;
    return `${formatted} mg`;
  }
  if (unit === "mcg_RAE") return `${dvValue} mcg RAE`;
  if (unit === "mcg_DFE") return `${dvValue} mcg DFE`;
  const formatted = dvValue >= 1000 ? dvValue.toLocaleString() : String(dvValue);
  return `${formatted} ${unit}`;
}
