/**
 * 5-question deficiency quiz.
 * Each answer carries a list of nutrient Nutr_No strings that are implicated.
 */

export interface QuizOption {
  label: string;
  nutrients: string[]; // Nutr_No codes to add weight to
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  multi?: boolean;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    question: "How often do you eat meat, fish, or eggs?",
    options: [
      { label: "Daily",               nutrients: [] },
      { label: "A few times a week",  nutrients: [] },
      { label: "Rarely",              nutrients: ["418", "303", "309", "629", "621"] },
      { label: "Never (vegan)",       nutrients: ["418", "303", "309", "629", "621", "301", "430"] },
    ],
  },
  {
    id: "q2",
    question: "Do you often feel tired or low on energy?",
    options: [
      { label: "Yes, frequently",    nutrients: ["303", "418", "304", "324", "208"] },
      { label: "Sometimes",          nutrients: ["303", "324", "304"] },
      { label: "Rarely / Never",     nutrients: [] },
    ],
  },
  {
    id: "q3",
    question: "How much direct sunlight do you get daily?",
    options: [
      { label: "Under 15 minutes",   nutrients: ["324", "328"] },
      { label: "15–30 minutes",      nutrients: ["324"] },
      { label: "Over 30 minutes",    nutrients: [] },
    ],
  },
  {
    id: "q4",
    question: "Do you experience any of these? (pick all that apply)",
    multi: true,
    options: [
      { label: "Muscle cramps",       nutrients: ["304", "301", "306"] },
      { label: "Hair loss",           nutrients: ["309", "303", "405"] },
      { label: "Brittle nails",       nutrients: ["309"] },
      { label: "Poor wound healing",  nutrients: ["309", "401"] },
      { label: "Bone or joint pain",  nutrients: ["301", "324", "430"] },
      { label: "Mood swings / brain fog", nutrients: ["629", "621", "415", "418"] },
      { label: "None of these",       nutrients: [] },
    ],
  },
  {
    id: "q5",
    question: "How would you describe your typical diet?",
    options: [
      { label: "Balanced & varied",        nutrients: [] },
      { label: "Lots of processed foods",  nutrients: ["404", "405", "406", "309", "401"] },
      { label: "Mostly plant-based",       nutrients: ["418", "303", "309", "301", "629"] },
      { label: "High protein / low carb",  nutrients: ["306", "304", "301"] },
      { label: "I eat everything",         nutrients: [] },
    ],
  },
];

/** Human-readable names for nutrient codes used in quiz results */
export const NUTR_LABELS: Record<string, string> = {
  "208": "Energy (kcal)",
  "203": "Protein",
  "204": "Fat",
  "301": "Calcium",
  "303": "Iron",
  "304": "Magnesium",
  "306": "Potassium",
  "309": "Zinc",
  "324": "Vitamin D",
  "328": "Vitamin D",
  "401": "Vitamin C",
  "404": "Thiamin (B1)",
  "405": "Riboflavin (B2)",
  "406": "Niacin (B3)",
  "415": "Vitamin B6",
  "418": "Vitamin B12",
  "430": "Vitamin K",
  "621": "DHA",
  "629": "EPA",
};
