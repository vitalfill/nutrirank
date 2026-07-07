const FOOD_GROUP_ICONS: Record<string, string> = {
  "0100": "🧀",
  "0200": "🌿",
  "0300": "👶",
  "0400": "🫒",
  "0500": "🍗",
  "0600": "🍲",
  "0700": "🌭",
  "0800": "🥣",
  "0900": "🍎",
  "1000": "🥩",
  "1100": "🥦",
  "1200": "🥜",
  "1300": "🐄",
  "1400": "🥤",
  "1500": "🐟",
  "1600": "🫘",
  "1700": "🐑",
  "1800": "🍞",
  "1900": "🍬",
  "2000": "🌾",
  "2100": "🍔",
  "2200": "🍽️",
  "2500": "🍿",
  "3500": "🪶",
  "3600": "🍴",
};

const FALLBACK_FOOD_GROUP_ICON = "🥗";

export function getFoodGroupIcon(fdGrpCd: string): string {
  return FOOD_GROUP_ICONS[fdGrpCd] ?? FALLBACK_FOOD_GROUP_ICON;
}
