import { PLANT_GROUP_CODES, ANIMAL_GROUP_CODES } from "./api";

export interface DietaryFilter {
  id: string;
  label: string;
  emoji: string;
  groupCodes: string[];
}

// Keto: all animal + nuts/seeds/fats (high fat, low carb)
const KETO_CODES = [...ANIMAL_GROUP_CODES, "1200"]; // + Nut and Seed Products

// Vegetarian: all plants + dairy/eggs (0100)
const VEGETARIAN_CODES = [...PLANT_GROUP_CODES, "0100"];

// Paleo: meat + fish + eggs + vegetables + fruits + nuts (no dairy, no grains, no legumes)
const PALEO_CODES = [
  "0100", // Dairy & Egg Products (eggs only, but group-level)
  "0500", // Poultry
  "0700", // Sausages & Luncheon Meats
  "0900", // Fruits & Fruit Juices
  "1000", // Pork
  "1100", // Vegetables
  "1200", // Nut & Seed Products
  "1300", // Beef
  "1500", // Finfish & Shellfish
  "1700", // Lamb, Veal & Game
];

export const DIETARY_FILTERS: DietaryFilter[] = [
  {
    id: "__VEGAN__",
    label: "Vegan",
    emoji: "🌱",
    groupCodes: PLANT_GROUP_CODES,
  },
  {
    id: "__VEGETARIAN__",
    label: "Vegetarian",
    emoji: "🥚",
    groupCodes: VEGETARIAN_CODES,
  },
  {
    id: "__KETO__",
    label: "Keto",
    emoji: "🥑",
    groupCodes: KETO_CODES,
  },
  {
    id: "__PALEO__",
    label: "Paleo",
    emoji: "🥩",
    groupCodes: PALEO_CODES,
  },
];
