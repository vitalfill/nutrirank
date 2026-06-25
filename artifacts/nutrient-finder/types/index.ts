export interface Nutrient {
  Nutr_No: string;
  NutrDesc: string;
  Units: string;
  is_free?: boolean;
}

export interface FoodGroup {
  FdGrp_Cd: string;
  FdGrp_Desc: string;
}

export interface FoodWeight {
  Amount: number;
  Msre_Desc: string;
  Gm_Wgt: number;
  /** True when the server identified this as the NLEA/label serving */
  is_nlea?: boolean;
}

export interface FoodResult {
  NDB_No: string;
  Long_Desc: string;
  FdGrp_Cd: string;
  Nutr_Val: number;
  /** Nutrient amount in the server-chosen household serving */
  serve_val: number;
  /** Gram weight of the server-chosen serving (drives the default in the picker) */
  chosen_gm_wgt: number;
  /** True when no usable weight data existed — value is per 100 g */
  is_fallback: boolean;
  weights: FoodWeight[];
}

export interface SearchResponse {
  nutrient: Nutrient;
  total: number;
  total_pages: number;
  page: number;
  foods: FoodResult[];
  error?: string;
}

export interface Favorite {
  id: string;
  nutrientNo: string;
  nutrientDesc: string;
  nutrientUnits: string;
  foodNDB_No: string;
  foodName: string;
  nutrientValue: number;
  selectedGroupIds: string[];
  savedAt: number;
}

export interface Subscription {
  email: string;
  expiresAt: number;
}
