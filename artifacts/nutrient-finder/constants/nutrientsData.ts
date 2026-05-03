export interface DailyValue {
  dv: number;
  unit: string;
  label: string;
}

export interface NutrientRole {
  icon: string;
  title: string;
  description: string;
}

export interface NutrientInfo {
  roles: NutrientRole[];
  dailyValue?: DailyValue;
}

export const NUTRIENT_DATA: Record<string, NutrientInfo> = {
  "203": {
    roles: [
      { icon: "fitness-center", title: "Muscle Building", description: "Essential for building and repairing muscle tissue after exercise and daily wear." },
      { icon: "science", title: "Enzyme Production", description: "Forms the structural basis of enzymes that drive nearly every chemical reaction in the body." },
      { icon: "security", title: "Immune Function", description: "Antibodies that defend against infections are made entirely from proteins." },
    ],
    dailyValue: { dv: 50, unit: "g", label: "50 g" },
  },
  "204": {
    roles: [
      { icon: "psychology", title: "Brain Function", description: "The brain is ~60% fat; dietary fat provides essential fatty acids for cognitive health." },
      { icon: "monitor-heart", title: "Hormone Production", description: "Cholesterol and fatty acids are building blocks for steroid hormones like estrogen and testosterone." },
      { icon: "opacity", title: "Vitamin Absorption", description: "Fat-soluble vitamins A, D, E, and K require dietary fat to be absorbed from the gut." },
    ],
    dailyValue: { dv: 78, unit: "g", label: "78 g" },
  },
  "205": {
    roles: [
      { icon: "bolt", title: "Primary Energy Source", description: "Carbohydrates are the body's and brain's preferred and most efficient fuel." },
      { icon: "psychology", title: "Brain Fuel", description: "Glucose derived from carbohydrates is the exclusive fuel source for brain cells." },
      { icon: "eco", title: "Fiber Source", description: "Complex carbohydrates provide dietary fiber that supports gut health and blood sugar stability." },
    ],
    dailyValue: { dv: 275, unit: "g", label: "275 g" },
  },
  "208": {
    roles: [
      { icon: "bolt", title: "Energy Production", description: "Fuels all cellular processes — from heartbeat to muscle contraction and brain activity." },
      { icon: "trending-up", title: "Metabolic Rate", description: "Adequate caloric intake maintains basal metabolic rate and supports organ function." },
      { icon: "directions-run", title: "Physical Performance", description: "Powers athletic performance, endurance, and recovery from physical exertion." },
    ],
    dailyValue: { dv: 2000, unit: "kcal", label: "2,000 kcal" },
  },
  "291": {
    roles: [
      { icon: "eco", title: "Digestive Health", description: "Feeds beneficial gut bacteria and promotes regular bowel movements, preventing constipation." },
      { icon: "monitor-heart", title: "Blood Sugar Control", description: "Slows glucose absorption, preventing blood sugar spikes after meals." },
      { icon: "favorite", title: "Heart Health", description: "Soluble fiber binds to cholesterol in the gut, reducing LDL (bad) cholesterol levels." },
    ],
    dailyValue: { dv: 28, unit: "g", label: "28 g" },
  },
  "269": {
    roles: [
      { icon: "bolt", title: "Quick Energy", description: "Sugars are rapidly converted to glucose, providing fast energy for the body and brain." },
      { icon: "psychology", title: "Brain Glucose", description: "The brain relies on blood glucose (from sugars) for moment-to-moment cognitive function." },
      { icon: "restaurant", title: "Food Palatability", description: "Natural sugars in fruit and dairy enhance palatability and encourage consumption of nutrient-rich foods." },
    ],
    dailyValue: { dv: 50, unit: "g", label: "50 g" },
  },
  "301": {
    roles: [
      { icon: "accessibility", title: "Bone & Teeth Strength", description: "99% of the body's calcium is stored in bones and teeth, providing structural rigidity." },
      { icon: "fitness-center", title: "Muscle Contraction", description: "Calcium ions trigger muscle fibers to contract — essential for every muscle movement." },
      { icon: "cable", title: "Nerve Signaling", description: "Regulates neurotransmitter release at nerve synapses, enabling brain-body communication." },
    ],
    dailyValue: { dv: 1300, unit: "mg", label: "1,300 mg" },
  },
  "303": {
    roles: [
      { icon: "water-drop", title: "Oxygen Transport", description: "Iron is the core of hemoglobin in red blood cells, which carries oxygen to every cell." },
      { icon: "bolt", title: "Energy Metabolism", description: "Required by mitochondria to produce ATP — the cell's primary energy currency." },
      { icon: "security", title: "Immune Function", description: "Supports the proliferation and maturation of immune cells that fight infections." },
    ],
    dailyValue: { dv: 18, unit: "mg", label: "18 mg" },
  },
  "304": {
    roles: [
      { icon: "cable", title: "Nerve & Muscle Function", description: "Regulates electrical signals in nerves and the release of neurotransmitters." },
      { icon: "monitor-heart", title: "Blood Sugar Control", description: "Acts as a cofactor for insulin, helping regulate blood glucose metabolism." },
      { icon: "science", title: "Protein Synthesis", description: "Required by hundreds of enzymes involved in building proteins and DNA." },
    ],
    dailyValue: { dv: 420, unit: "mg", label: "420 mg" },
  },
  "305": {
    roles: [
      { icon: "accessibility", title: "Bone Formation", description: "Combines with calcium to form hydroxyapatite — the mineral matrix that makes bones hard." },
      { icon: "bolt", title: "Energy Metabolism (ATP)", description: "A key component of ATP, the universal energy currency of all living cells." },
      { icon: "opacity", title: "Cell Membrane Structure", description: "Phospholipids containing phosphorus form the bilayer that makes up every cell membrane." },
    ],
    dailyValue: { dv: 1250, unit: "mg", label: "1,250 mg" },
  },
  "306": {
    roles: [
      { icon: "monitor-heart", title: "Blood Pressure Regulation", description: "Counteracts sodium's effect, relaxing blood vessel walls and lowering blood pressure." },
      { icon: "fitness-center", title: "Muscle Function", description: "Works with sodium to regulate muscle contractions, including the heart muscle." },
      { icon: "opacity", title: "Fluid Balance", description: "The primary intracellular cation, maintaining proper fluid balance and cell volume." },
    ],
    dailyValue: { dv: 4700, unit: "mg", label: "4,700 mg" },
  },
  "307": {
    roles: [
      { icon: "water-drop", title: "Fluid Balance", description: "Regulates fluid distribution between cells and bloodstream, maintaining blood volume." },
      { icon: "cable", title: "Nerve Transmission", description: "Sodium ions rushing into nerve cells generate the electrical signals that transmit information." },
      { icon: "fitness-center", title: "Muscle Function", description: "Required for muscle contraction, working in opposition to potassium in muscle cells." },
    ],
    dailyValue: { dv: 2300, unit: "mg", label: "2,300 mg" },
  },
  "309": {
    roles: [
      { icon: "security", title: "Immune Function", description: "Essential for developing and activating T-cells and other immune defenders." },
      { icon: "healing", title: "Wound Healing", description: "Stimulates the growth of new skin cells and supports collagen synthesis for tissue repair." },
      { icon: "science", title: "Protein & DNA Synthesis", description: "Hundreds of enzymes require zinc as a cofactor for protein and genetic material production." },
    ],
    dailyValue: { dv: 11, unit: "mg", label: "11 mg" },
  },
  "312": {
    roles: [
      { icon: "water-drop", title: "Iron Metabolism", description: "Ceruloplasmin (copper-containing protein) is essential for mobilizing iron from storage." },
      { icon: "auto-awesome", title: "Antioxidant Defense", description: "A key component of superoxide dismutase, one of the body's primary antioxidant enzymes." },
      { icon: "build", title: "Connective Tissue", description: "Required for cross-linking collagen and elastin, giving connective tissue strength and elasticity." },
    ],
    dailyValue: { dv: 0.9, unit: "mg", label: "0.9 mg" },
  },
  "315": {
    roles: [
      { icon: "accessibility", title: "Bone Formation", description: "Activates enzymes critical for bone matrix protein synthesis and mineralization." },
      { icon: "bolt", title: "Carbohydrate Metabolism", description: "A cofactor for enzymes that process glucose and generate energy." },
      { icon: "auto-awesome", title: "Antioxidant Function", description: "Component of manganese superoxide dismutase — the primary antioxidant in mitochondria." },
    ],
    dailyValue: { dv: 2.3, unit: "mg", label: "2.3 mg" },
  },
  "317": {
    roles: [
      { icon: "auto-awesome", title: "Antioxidant Protection", description: "Essential for glutathione peroxidase — a powerful antioxidant enzyme that neutralizes free radicals." },
      { icon: "monitor-heart", title: "Thyroid Function", description: "Required for converting inactive thyroid hormone (T4) to the active form (T3)." },
      { icon: "security", title: "Immune Support", description: "Supports immune cell function and helps reduce excessive inflammation." },
    ],
    dailyValue: { dv: 55, unit: "mcg", label: "55 mcg" },
  },
  "320": {
    roles: [
      { icon: "visibility", title: "Vision", description: "Retinal (derived from vitamin A) is a key component of rhodopsin — the light-sensing pigment in the eye." },
      { icon: "security", title: "Immune Function", description: "Maintains the integrity of epithelial barriers (skin, gut lining) that block pathogens." },
      { icon: "face", title: "Skin Health", description: "Regulates skin cell growth and renewal; essential for healthy, resilient skin." },
    ],
    dailyValue: { dv: 900, unit: "mcg_RAE", label: "900 mcg RAE" },
  },
  "318": {
    roles: [
      { icon: "visibility", title: "Vision", description: "Retinal (from Vitamin A) is integral to rhodopsin, the light-detecting molecule in the eye's rod cells." },
      { icon: "security", title: "Immune Barrier", description: "Supports epithelial cell integrity throughout the body, forming a first line of defense." },
      { icon: "face", title: "Cell Growth", description: "Regulates the differentiation and reproduction of cells throughout the body." },
    ],
    dailyValue: { dv: 5000, unit: "IU", label: "5,000 IU" },
  },
  "323": {
    roles: [
      { icon: "auto-awesome", title: "Antioxidant Protection", description: "Neutralizes free radicals in cell membranes, protecting polyunsaturated fatty acids from oxidation." },
      { icon: "security", title: "Immune Function", description: "Enhances immune cell production and function, supporting the body's defense system." },
      { icon: "face", title: "Skin Health", description: "Protects skin cells from UV and environmental oxidative damage." },
    ],
    dailyValue: { dv: 15, unit: "mg", label: "15 mg" },
  },
  "324": {
    roles: [
      { icon: "water-drop", title: "Calcium Absorption", description: "Activates calcium-binding proteins in the gut that absorb calcium from food." },
      { icon: "accessibility", title: "Bone Health", description: "Regulates calcium and phosphorus deposition in bone, maintaining bone density." },
      { icon: "security", title: "Immune Modulation", description: "Vitamin D receptors on immune cells regulate inflammatory and anti-pathogen responses." },
    ],
    dailyValue: { dv: 20, unit: "mcg", label: "20 mcg" },
  },
  "328": {
    roles: [
      { icon: "water-drop", title: "Calcium Absorption", description: "Activates calcium-binding proteins in the gut that absorb calcium from food." },
      { icon: "accessibility", title: "Bone Health", description: "Regulates calcium and phosphorus deposition in bone, maintaining bone density." },
      { icon: "security", title: "Immune Modulation", description: "Vitamin D receptors on immune cells regulate inflammatory and anti-pathogen responses." },
    ],
    dailyValue: { dv: 20, unit: "mcg", label: "20 mcg" },
  },
  "401": {
    roles: [
      { icon: "auto-awesome", title: "Antioxidant", description: "Donates electrons to neutralize free radicals, protecting cells from oxidative damage." },
      { icon: "build", title: "Collagen Synthesis", description: "Essential cofactor for enzymes that form and stabilize collagen in skin, bones, and vessels." },
      { icon: "security", title: "Immune Support", description: "Stimulates production and function of white blood cells, especially neutrophils and lymphocytes." },
    ],
    dailyValue: { dv: 90, unit: "mg", label: "90 mg" },
  },
  "404": {
    roles: [
      { icon: "bolt", title: "Energy Metabolism", description: "A coenzyme (thiamine pyrophosphate) central to converting carbohydrates and fats into cellular energy." },
      { icon: "cable", title: "Nerve Function", description: "Essential for myelin sheath production and electrical signal transmission in nerves." },
      { icon: "eco", title: "Carbohydrate Digestion", description: "Required for metabolizing glucose — without it, pyruvate cannot enter the citric acid cycle." },
    ],
    dailyValue: { dv: 1.2, unit: "mg", label: "1.2 mg" },
  },
  "405": {
    roles: [
      { icon: "bolt", title: "Energy Metabolism", description: "Component of FAD and FMN coenzymes that drive the electron transport chain for ATP production." },
      { icon: "science", title: "Cell Growth", description: "Required for cellular growth, function, and reproduction throughout the body." },
      { icon: "auto-awesome", title: "Antioxidant Function", description: "Regenerates glutathione — a key cellular antioxidant — from its oxidized form." },
    ],
    dailyValue: { dv: 1.3, unit: "mg", label: "1.3 mg" },
  },
  "406": {
    roles: [
      { icon: "science", title: "DNA Repair", description: "A precursor to NAD+ — a coenzyme essential for DNA repair and genome stability." },
      { icon: "bolt", title: "Energy Production", description: "NAD+ (from niacin) is the most important electron carrier in the mitochondrial energy chain." },
      { icon: "face", title: "Skin & Nerve Health", description: "Deficiency causes pellagra — dermatitis, diarrhea, and dementia — highlighting its systemic importance." },
    ],
    dailyValue: { dv: 16, unit: "mg", label: "16 mg" },
  },
  "410": {
    roles: [
      { icon: "bolt", title: "Energy Metabolism", description: "A component of Coenzyme A (CoA), which is central to carbohydrate, fat, and protein metabolism." },
      { icon: "monitor-heart", title: "Hormone Synthesis", description: "Required for producing steroid hormones and vitamin D in the body." },
      { icon: "healing", title: "Wound Healing", description: "Supports synthesis of fatty acids needed for new cell membrane formation during healing." },
    ],
    dailyValue: { dv: 5, unit: "mg", label: "5 mg" },
  },
  "415": {
    roles: [
      { icon: "science", title: "Protein Metabolism", description: "Essential for transamination reactions that build and break down amino acids." },
      { icon: "psychology", title: "Neurotransmitter Synthesis", description: "Required to produce serotonin, dopamine, and GABA — key mood and brain chemicals." },
      { icon: "security", title: "Immune Function", description: "Supports lymphocyte proliferation and antibody production during immune responses." },
    ],
    dailyValue: { dv: 1.7, unit: "mg", label: "1.7 mg" },
  },
  "417": {
    roles: [
      { icon: "science", title: "DNA Synthesis", description: "Essential for producing the building blocks of DNA and RNA, enabling cell division." },
      { icon: "child-care", title: "Cell Division", description: "Critical during rapid growth — pregnancy, infancy — to support proper cell multiplication." },
      { icon: "favorite", title: "Neural Tube Development", description: "Prevents neural tube defects in early pregnancy; essential for proper brain and spine formation." },
    ],
    dailyValue: { dv: 400, unit: "mcg_DFE", label: "400 mcg DFE" },
  },
  "435": {
    roles: [
      { icon: "science", title: "DNA Synthesis", description: "Essential for producing the building blocks of DNA and RNA, enabling cell division." },
      { icon: "child-care", title: "Cell Division", description: "Critical during rapid growth — pregnancy, infancy — to support proper cell multiplication." },
      { icon: "favorite", title: "Neural Tube Development", description: "Prevents neural tube defects in early pregnancy; essential for proper brain and spine formation." },
    ],
    dailyValue: { dv: 400, unit: "mcg_DFE", label: "400 mcg DFE" },
  },
  "418": {
    roles: [
      { icon: "water-drop", title: "Red Blood Cell Formation", description: "Required for producing healthy red blood cells; deficiency causes megaloblastic anemia." },
      { icon: "cable", title: "Nerve Function", description: "Maintains the myelin sheath surrounding nerve fibers, ensuring proper signal conduction." },
      { icon: "science", title: "DNA Synthesis", description: "Works with folate in one-carbon metabolism to produce thymidylate for DNA synthesis." },
    ],
    dailyValue: { dv: 2.4, unit: "mcg", label: "2.4 mcg" },
  },
  "421": {
    roles: [
      { icon: "psychology", title: "Brain Development", description: "A precursor to acetylcholine — the neurotransmitter governing memory and muscle control." },
      { icon: "eco", title: "Liver Function", description: "Prevents fatty liver by enabling the export of triglycerides as VLDL particles." },
      { icon: "opacity", title: "Cell Membrane Structure", description: "Phosphatidylcholine (from choline) is a major structural lipid in every cell membrane." },
    ],
    dailyValue: { dv: 550, unit: "mg", label: "550 mg" },
  },
  "430": {
    roles: [
      { icon: "water-drop", title: "Blood Clotting", description: "Essential cofactor for clotting factors II, VII, IX, X — without it, wounds can't stop bleeding." },
      { icon: "accessibility", title: "Bone Metabolism", description: "Activates osteocalcin — the protein that anchors calcium into the bone matrix." },
      { icon: "favorite", title: "Heart Health", description: "Activates Matrix Gla Protein, which prevents calcium from depositing in artery walls." },
    ],
    dailyValue: { dv: 120, unit: "mcg", label: "120 mcg" },
  },
  "601": {
    roles: [
      { icon: "monitor-heart", title: "Hormone Production", description: "A structural precursor for steroid hormones (cortisol, estrogen, testosterone, aldosterone)." },
      { icon: "wb-sunny", title: "Vitamin D Synthesis", description: "Cholesterol in skin is converted to vitamin D3 upon UV exposure from sunlight." },
      { icon: "opacity", title: "Cell Membrane Structure", description: "Modulates membrane fluidity and is concentrated in rafts that organize receptor signaling." },
    ],
    dailyValue: { dv: 300, unit: "mg", label: "300 mg" },
  },
  "606": {
    roles: [
      { icon: "bolt", title: "Energy Source", description: "Saturated fats are a dense, stable energy source stored in adipose tissue." },
      { icon: "monitor-heart", title: "Hormone Production", description: "Supports synthesis of steroid hormones and helps maintain cell membrane integrity." },
      { icon: "opacity", title: "Cell Structure", description: "Provides rigidity to cell membranes, influencing receptor and channel function." },
    ],
    dailyValue: { dv: 20, unit: "g", label: "20 g" },
  },
  "645": {
    roles: [
      { icon: "favorite", title: "Heart Health", description: "Replacing saturated fat with monounsaturated fat lowers LDL without reducing HDL." },
      { icon: "monitor-heart", title: "Blood Sugar Control", description: "Improves insulin sensitivity and helps stabilize post-meal blood glucose levels." },
      { icon: "auto-awesome", title: "Anti-inflammatory", description: "Oleic acid (in olive oil) reduces inflammatory markers like CRP and IL-6." },
    ],
  },
  "646": {
    roles: [
      { icon: "psychology", title: "Brain Function", description: "DHA (an omega-3 PUFA) makes up ~25% of brain fat and is critical for cognition and memory." },
      { icon: "favorite", title: "Inflammation Control", description: "Omega-3 PUFAs produce resolvins and protectins — molecules that resolve inflammation." },
      { icon: "monitor-heart", title: "Heart Health", description: "Lower triglycerides and reduce risk of arrhythmia by modulating cardiac ion channels." },
    ],
  },
  // DHA — 22:6 n-3 (Nutr_No 621)
  "621": {
    roles: [
      { icon: "psychology", title: "Brain & Memory", description: "DHA makes up ~25% of the brain's fatty acids and is critical for memory, mood, and cognitive performance." },
      { icon: "visibility", title: "Eye Health", description: "A major structural fat in the retina — low DHA is linked to impaired vision and macular degeneration." },
      { icon: "favorite", title: "Heart & Inflammation", description: "Reduces triglycerides and resolves inflammation via specialized pro-resolving mediators." },
    ],
    dailyValue: { dv: 500, unit: "mg", label: "500 mg (combined EPA+DHA)" },
  },
  // EPA — 20:5 n-3 (Nutr_No 629)
  "629": {
    roles: [
      { icon: "favorite", title: "Cardiovascular Health", description: "EPA reduces triglycerides, lowers blood pressure, and decreases the risk of cardiac arrhythmia." },
      { icon: "auto-awesome", title: "Anti-inflammatory", description: "EPA is the precursor to anti-inflammatory eicosanoids that resolve chronic inflammation." },
      { icon: "psychology", title: "Mood & Mental Health", description: "Higher EPA levels are associated with lower rates of depression and anxiety." },
    ],
    dailyValue: { dv: 500, unit: "mg", label: "500 mg (combined EPA+DHA)" },
  },
  // ALA — 18:3 n-3 c,c,c (Nutr_No 851)
  "851": {
    roles: [
      { icon: "eco", title: "Essential Fatty Acid", description: "ALA is the plant-based omega-3 the body cannot make — it must come from food (flaxseed, chia, walnuts)." },
      { icon: "favorite", title: "Heart Health", description: "Associated with reduced cardiovascular disease risk, partly through conversion to EPA and DHA." },
      { icon: "auto-awesome", title: "Anti-inflammatory Precursor", description: "ALA converts (inefficiently) to EPA and DHA, providing the building blocks for anti-inflammatory pathways." },
    ],
    dailyValue: { dv: 1600, unit: "mg", label: "1,600 mg" },
  },
  "221": {
    roles: [
      { icon: "bolt", title: "Energy (Caloric)", description: "Provides 7 kcal/gram — metabolized preferentially before fat, protein, or carbohydrates." },
      { icon: "monitor-heart", title: "Vasodilation", description: "At low doses, alcohol causes blood vessel widening, temporarily lowering blood pressure." },
      { icon: "psychology", title: "CNS Depression", description: "Inhibits glutamate and enhances GABA signaling in the brain, producing sedative effects." },
    ],
  },
};

export const AMINO_ACID_INFO: NutrientInfo = {
  roles: [
    { icon: "fitness-center", title: "Protein Building Block", description: "Amino acids are linked together by peptide bonds to form all proteins in the body." },
    { icon: "healing", title: "Tissue Repair", description: "Dietary amino acids supply the raw materials for repairing damaged muscle, skin, and organs." },
    { icon: "science", title: "Enzyme & Hormone Synthesis", description: "Specific amino acids are precursors to enzymes, hormones, and neurotransmitters." },
  ],
};

const AMINO_ACID_CODES = ["501","502","503","504","505","506","507","508","509","510","511","512","513","514","515","516","517","518","521"];

export function getNutrientInfo(nutrNo: string): NutrientInfo | null {
  if (NUTRIENT_DATA[nutrNo]) return NUTRIENT_DATA[nutrNo];
  if (AMINO_ACID_CODES.includes(nutrNo)) return AMINO_ACID_INFO;
  return null;
}
