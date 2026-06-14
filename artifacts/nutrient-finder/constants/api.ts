export const API_BASE = "https://drgily.com/app-api";

export const FREE_PAGES_LIMIT = 2;

export const PLANT_GROUP_CODES = [
  "0200",
  "0800",
  "0900",
  "1100",
  "1200",
  "1600",
  "1800",
  "2000",
];

export const ANIMAL_GROUP_CODES = [
  "0100",
  "0500",
  "0700",
  "1000",
  "1300",
  "1500",
  "1700",
];

export const ALL_GROUP_CODES = [...PLANT_GROUP_CODES, ...ANIMAL_GROUP_CODES];

// Nutrient numbers that are always free (no subscription required)
// 208=Energy(kcal), 203=Protein, 204=Fat, 504=Histidine,
// 301=Calcium, 306=Potassium, 320=Vitamin A RAE, 318=Vitamin A IU,
// 430=Vitamin K, 629=EPA, 513=Alanine,
// 511=Arginine, 851=Alpha-Linolenic Acid (ALA), 431=Folic acid
export const FREE_NUTRIENT_NOS = new Set([
  "208", "203", "204", "504",
  "301", "306", "320", "318",
  "430", "629",
  "513", "511", "851", "431",
]);

export const SUBSCRIPTION_PRICE = "$7.99 / year";
export const STRIPE_CHECKOUT_URL = `${API_BASE}/create-checkout.php`;
export const STRIPE_VERIFY_URL = `${API_BASE}/check-subscription.php`;
