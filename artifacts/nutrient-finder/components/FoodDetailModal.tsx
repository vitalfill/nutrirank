import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE } from "@/constants/api";
import { getDV, getProfileLabel, UserProfile, DEFAULT_PROFILE } from "@/constants/userProfile";
import { useColors } from "@/hooks/useColors";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NutrientRow {
  Nutr_No: string;
  NutrDesc: string;
  Units: string;
  /** value per 100 g, as returned by the server */
  Nutr_Val: number;
  SR_Order: number;
}

interface WeightRow {
  Amount: number;
  Msre_Desc: string;
  Gm_Wgt: number;
}

interface FoodDetailData {
  ndb_no: string;
  Long_Desc: string;
  FdGrp_Cd: string;
  nutrients: NutrientRow[];
  weights: WeightRow[];
}

interface ServingOption {
  label: string;       // e.g. "1 cup (240 g)"
  grams: number;       // grams for scaling
}

interface Props {
  ndbNo: string | null;
  foodName: string;
  profile?: UserProfile;
  onClose: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────
// SR_Order ranges from USDA SR28 NUTR_DEF table:
//   0–4999   : Proximates (water, energy, protein, fat, ash, carbs, fiber, sugars…)
//   5000–5999: Minerals (Ca, Fe, Mg, P, K, Na, Zn, Cu, Mn, Se, F, Cr, Mo…)
//   6000–8999: Vitamins (C, B-vitamins, A, D, E, K, folate, choline…)
//   9000–15999: Lipids / Fatty acids (4:0 through 22:6 n-3)
//  16000–17999: Amino acids (Trp, Thr, Ile, Leu, Lys, Met, Cys, Phe, Tyr, Val…)
//  ≥ 18000   : Other (alcohol, caffeine, theobromine, fluoride, etc.)

const PROXIMATES_MAX = 5000;
const MINERALS_MAX   = 6000;
const VITAMINS_MAX   = 9000;
const LIPIDS_MAX     = 16000;
const AMINO_MAX      = 18000;

// Fat sub-types shown indented under Total Fat in the Macronutrients section
const FAT_SUB_NOS = new Set(["606", "645", "646", "605"]);

// Explicit mineral Nutr_No codes — ensures Cu, Mn, Se etc. are never misclassified
// as vitamins when their SR_Order falls in the vitamins range on this database.
const MINERAL_NOS = new Set([
  "301","303","304","305","306","307","309","312","313","315","317",
]);

// Explicit set of USDA amino acid Nutr_No codes — used as a fallback so nutrients
// like Serine (518, SR_Order ~18100) are always bucketed correctly.
const AMINO_ACID_NOS = new Set([
  "501","502","503","504","505","506","507","508","509","510",
  "511","512","513","514","515","516","517","518","521",
]);


// ── Helpers ───────────────────────────────────────────────────────────────────

function scaleVal(per100g: number, grams: number): number {
  return (per100g / 100) * grams;
}

function formatVal(v: number): string {
  if (v === 0) return "0";
  if (v < 0.005) return v.toExponential(1);
  if (v < 1)     return v.toFixed(3);
  if (v < 10)    return v.toFixed(1);
  return v.toFixed(0);
}

function dvPercent(per100g: number, nutrNo: string, grams: number, profile: UserProfile): number | null {
  const dv = getDV(nutrNo, profile);
  if (!dv) return null;
  const scaled = scaleVal(per100g, grams);
  return Math.round((scaled / dv) * 100);
}

function buildServingOptions(weights: WeightRow[]): ServingOption[] {
  const base: ServingOption = { label: "100 g (reference)", grams: 100 };
  const rest: ServingOption[] = weights.map(w => {
    const amt = w.Amount % 1 === 0 ? w.Amount.toFixed(0) : w.Amount.toFixed(1);
    return {
      label: `${amt} ${w.Msre_Desc} (${w.Gm_Wgt} g)`,
      grams: w.Gm_Wgt,
    };
  });
  return [base, ...rest];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return (
    <View style={{ backgroundColor: colors.muted, paddingHorizontal: 16, paddingVertical: 6 }}>
      <Text style={{
        fontSize: 11, fontFamily: "Inter_700Bold",
        color: colors.mutedForeground, letterSpacing: 0.8, textTransform: "uppercase",
      }}>
        {title}
      </Text>
    </View>
  );
}

function NutrientLine({
  nutr, colors, indent = false, grams, profile,
}: { nutr: NutrientRow; colors: any; indent?: boolean; grams: number; profile: UserProfile }) {
  const scaled = scaleVal(nutr.Nutr_Val, grams);
  const dv     = dvPercent(nutr.Nutr_Val, nutr.Nutr_No, grams, profile);

  return (
    <View style={{
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 9,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      paddingLeft: indent ? 28 : 16,
    }}>
      <Text style={{
        flex: 1, fontSize: 13, color: colors.foreground,
        fontFamily: indent ? "Inter_400Regular" : "Inter_500Medium",
      }}>
        {nutr.NutrDesc}
      </Text>
      <Text style={{
        fontSize: 13, color: colors.mutedForeground,
        fontFamily: "Inter_400Regular", marginRight: 8,
      }}>
        {formatVal(scaled)} {nutr.Units}
      </Text>
      {dv !== null && (
        <Text style={{
          fontSize: 11,
          color: dv >= 20 ? colors.primary : colors.mutedForeground,
          fontFamily: "Inter_600SemiBold", width: 52, textAlign: "right",
        }}>
          {dv}% DV
        </Text>
      )}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FoodDetailModal({ ndbNo, foodName, profile = DEFAULT_PROFILE, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors, insets);

  const [expandFatty, setExpandFatty] = useState(false);
  const [expandAmino, setExpandAmino] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedGrams, setSelectedGrams] = useState(100);
  const [showServingPicker, setShowServingPicker] = useState(false);

  // Reset state whenever a new food is opened
  useEffect(() => {
    setSelectedGrams(100);
    setExpandFatty(false);
    setExpandAmino(false);
    setRetryCount(0);
  }, [ndbNo]);

  const { data, isLoading, isError, error } = useQuery<FoodDetailData, Error>({
    queryKey: ["food-detail", ndbNo, retryCount],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/food-detail.php?ndb_no=${ndbNo}`);
      const text = await res.text();
      let json: any;
      try { json = JSON.parse(text); } catch {
        throw new Error(
          `Server returned non-JSON (HTTP ${res.status}). ` +
          `Upload food-detail.php to drgily.com/app-api/.`
        );
      }
      if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);
      return json;
    },
    enabled: !!ndbNo,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const servingOptions = data ? buildServingOptions(data.weights) : [];
  const selectedOption = servingOptions.find(o => o.grams === selectedGrams)
    ?? { label: `${selectedGrams} g`, grams: selectedGrams };

  const isAmino   = (n: NutrientRow) => AMINO_ACID_NOS.has(n.Nutr_No) || (n.SR_Order >= LIPIDS_MAX && n.SR_Order < AMINO_MAX);
  const isMineral = (n: NutrientRow) => MINERAL_NOS.has(n.Nutr_No) || (n.SR_Order >= PROXIMATES_MAX && n.SR_Order < MINERALS_MAX);
  const isFatSub  = (n: NutrientRow) => FAT_SUB_NOS.has(n.Nutr_No);

  // Fat sub-items ordered: Saturated → Trans → Monounsaturated → Polyunsaturated
  const FAT_SUB_ORDER = ["606", "605", "645", "646"];
  const fatSubRows = (data?.nutrients.filter(isFatSub) ?? [])
    .sort((a, b) => FAT_SUB_ORDER.indexOf(a.Nutr_No) - FAT_SUB_ORDER.indexOf(b.Nutr_No));

  const proximates = data?.nutrients.filter(n => !isAmino(n) && !isMineral(n) && !isFatSub(n) && n.SR_Order < PROXIMATES_MAX) ?? [];
  const minerals   = data?.nutrients.filter(n => !isAmino(n) && isMineral(n)) ?? [];
  const vitamins   = data?.nutrients.filter(n => !isAmino(n) && !isMineral(n) && !isFatSub(n) && n.SR_Order >= MINERALS_MAX && n.SR_Order < VITAMINS_MAX) ?? [];
  const fatty      = data?.nutrients.filter(n => !isAmino(n) && !isMineral(n) && !isFatSub(n) && n.SR_Order >= VITAMINS_MAX && n.SR_Order < LIPIDS_MAX) ?? [];
  const amino      = data?.nutrients.filter(n => isAmino(n)) ?? [];
  const other      = data?.nutrients.filter(n => !isAmino(n) && !isMineral(n) && !isFatSub(n) && n.SR_Order >= AMINO_MAX) ?? [];

  const energy    = proximates.find(n => n.Nutr_No === "208" || n.NutrDesc.toLowerCase().startsWith("energy"));
  const mainRows  = proximates.filter(n => n !== energy);
  const scaledCal = energy ? scaleVal(energy.Nutr_Val, selectedGrams) : null;

  const renderServingItem = useCallback(({ item }: { item: ServingOption }) => {
    const isActive = item.grams === selectedGrams;
    return (
      <Pressable
        style={({ pressed }) => [styles.servingOption, isActive && styles.servingOptionActive, pressed && { opacity: 0.65 }]}
        onPress={() => { setSelectedGrams(item.grams); setShowServingPicker(false); }}
      >
        <Text style={[styles.servingOptionText, isActive && styles.servingOptionTextActive]}>
          {item.label}
        </Text>
        {isActive && <MaterialIcons name="check" size={16} color={colors.primary} />}
      </Pressable>
    );
  }, [selectedGrams, styles, colors]);

  return (
    <Modal
      visible={!!ndbNo}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>

        {/* ── Top bar ── */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <MaterialIcons name="science" size={18} color={colors.accent} />
        </View>

        {/* ── Food name + serving dropdown ── */}
        <View style={styles.titleWrap}>
          <Text style={styles.foodTitle} numberOfLines={3}>{foodName}</Text>

          {/* Serving size picker trigger */}
          <Pressable
            style={({ pressed }) => [styles.servingTrigger, pressed && { opacity: 0.7 }]}
            onPress={() => servingOptions.length > 0 && setShowServingPicker(true)}
            disabled={servingOptions.length === 0}
          >
            <MaterialIcons name="restaurant" size={14} color={colors.accent} />
            <Text style={styles.servingTriggerLabel}>Serving size:</Text>
            <Text style={styles.servingTriggerValue} numberOfLines={1}>
              {servingOptions.length > 0 ? selectedOption.label : "100 g"}
            </Text>
            {servingOptions.length > 1 && (
              <MaterialIcons name="keyboard-arrow-down" size={16} color={colors.mutedForeground} />
            )}
          </Pressable>
        </View>

        {/* ── Loading ── */}
        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading nutrition data…</Text>
          </View>
        )}

        {/* ── Error ── */}
        {isError && (
          <View style={styles.center}>
            <MaterialIcons name="error-outline" size={44} color={colors.destructive} />
            <Text style={styles.errorText}>Could not load nutrition data.</Text>
            {error?.message && <Text style={styles.errorDetail}>{error.message}</Text>}
            <Pressable
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.75 }]}
              onPress={() => setRetryCount(c => c + 1)}
            >
              <MaterialIcons name="refresh" size={16} color="#fff" />
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* ── Nutrition label ── */}
        {data && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          >
            {/* Calories banner */}
            {scaledCal !== null && (
              <View style={styles.calBanner}>
                <Text style={styles.calLabel}>Calories</Text>
                <Text style={styles.calValue}>{Math.round(scaledCal)}</Text>
              </View>
            )}

            <View style={styles.thickDivider} />
            <View style={styles.dvHeader}>
              <Text style={styles.dvHeaderText}>% Daily Value*</Text>
            </View>

            {mainRows.length > 0 && (
              <>
                <SectionHeader title="Macronutrients" colors={colors} />
                {mainRows.map(n => (
                  <React.Fragment key={n.Nutr_No}>
                    <NutrientLine nutr={n} colors={colors} grams={selectedGrams} profile={profile} />
                    {n.Nutr_No === "204" && fatSubRows.map(sub => (
                      <NutrientLine key={sub.Nutr_No} nutr={sub} colors={colors} grams={selectedGrams} indent profile={profile} />
                    ))}
                  </React.Fragment>
                ))}
              </>
            )}

            {minerals.length > 0 && (
              <>
                <SectionHeader title="Minerals" colors={colors} />
                {minerals.map(n => (
                  <NutrientLine key={n.Nutr_No} nutr={n} colors={colors} grams={selectedGrams} profile={profile} />
                ))}
              </>
            )}

            {vitamins.length > 0 && (
              <>
                <SectionHeader title="Vitamins" colors={colors} />
                {vitamins.map(n => (
                  <NutrientLine key={n.Nutr_No} nutr={n} colors={colors} grams={selectedGrams} profile={profile} />
                ))}
              </>
            )}

            {fatty.length > 0 && (
              <>
                <Pressable style={styles.sectionToggle} onPress={() => setExpandFatty(v => !v)}>
                  <SectionHeader title={`Fatty Acid Profile (${fatty.length})`} colors={colors} />
                  <MaterialIcons
                    name={expandFatty ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                    size={20} color={colors.mutedForeground} style={{ marginRight: 12 }}
                  />
                </Pressable>
                {expandFatty && fatty.map(n => (
                  <NutrientLine key={n.Nutr_No} nutr={n} colors={colors} indent grams={selectedGrams} profile={profile} />
                ))}
              </>
            )}

            {amino.length > 0 && (
              <>
                <Pressable style={styles.sectionToggle} onPress={() => setExpandAmino(v => !v)}>
                  <SectionHeader title={`Amino Acids (${amino.length})`} colors={colors} />
                  <MaterialIcons
                    name={expandAmino ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                    size={20} color={colors.mutedForeground} style={{ marginRight: 12 }}
                  />
                </Pressable>
                {expandAmino && amino.map(n => (
                  <NutrientLine key={n.Nutr_No} nutr={n} colors={colors} indent grams={selectedGrams} profile={profile} />
                ))}
              </>
            )}

            {other.length > 0 && (
              <>
                <SectionHeader title={`Other (${other.length})`} colors={colors} />
                {other.map(n => (
                  <NutrientLine key={n.Nutr_No} nutr={n} colors={colors} grams={selectedGrams} profile={profile} />
                ))}
              </>
            )}

            <Text style={styles.footNote}>
              * % Daily Values are personalised for {getProfileLabel(profile)} per NIH Dietary Reference Intakes.{"\n"}
              Source: USDA Food Data Central via drgily.com.
            </Text>
            <Text style={styles.footNote}>© Vital Fill LLC 2026</Text>
          </ScrollView>
        )}
      </View>

      {/* ── Serving size picker sheet ── */}
      <Modal
        visible={showServingPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowServingPicker(false)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setShowServingPicker(false)}>
          <View
            style={[styles.sheet, { paddingBottom: Platform.OS === "web" ? 32 : insets.bottom + 12 }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select Serving Size</Text>
            <FlatList
              data={servingOptions}
              keyExtractor={item => String(item.grams)}
              renderItem={renderServingItem}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
              style={{ maxHeight: 340 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </Pressable>
      </Modal>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) {
  return StyleSheet.create({
    container:  { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    backBtn:    { flexDirection: "row", alignItems: "center", gap: 4 },
    backText:   { fontSize: 16, color: colors.primary, fontFamily: "Inter_500Medium" },

    titleWrap: {
      backgroundColor: colors.card,
      paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
      borderBottomWidth: 3, borderBottomColor: colors.primary,
      gap: 10,
    },
    foodTitle: {
      fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground, lineHeight: 24,
    },
    servingTrigger: {
      flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: colors.secondary,
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
      borderWidth: 1, borderColor: colors.chipActiveBorder,
      alignSelf: "flex-start", maxWidth: "100%",
    },
    servingTriggerLabel: {
      fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium",
    },
    servingTriggerValue: {
      fontSize: 13, color: colors.primary, fontFamily: "Inter_600SemiBold",
      flexShrink: 1,
    },

    calBanner: {
      flexDirection: "row", alignItems: "baseline", justifyContent: "space-between",
      paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.card,
    },
    calLabel: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground },
    calValue: { fontSize: 36, fontFamily: "Inter_700Bold", color: colors.primary },

    thickDivider: { height: 8, backgroundColor: colors.foreground, opacity: 0.85 },
    dvHeader: {
      paddingHorizontal: 16, paddingVertical: 6, backgroundColor: colors.card,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    dvHeaderText: {
      fontSize: 12, fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground, textAlign: "right",
    },
    sectionToggle: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },

    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 80 },
    loadingText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    errorText: { fontSize: 15, color: colors.destructive, fontFamily: "Inter_600SemiBold", textAlign: "center" },
    errorDetail: {
      fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular",
      textAlign: "center", paddingHorizontal: 24, lineHeight: 18,
    },
    retryBtn: {
      flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: colors.primary, borderRadius: 10,
      paddingHorizontal: 20, paddingVertical: 10, marginTop: 8,
    },
    retryText: { fontSize: 14, color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },

    footNote: {
      fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular",
      paddingHorizontal: 16, paddingTop: 10, lineHeight: 17,
    },

    // Serving picker sheet
    sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      paddingTop: 12, paddingHorizontal: 16,
    },
    sheetHandle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: colors.border, alignSelf: "center", marginBottom: 14,
    },
    sheetTitle: {
      fontSize: 15, fontFamily: "Inter_600SemiBold",
      color: colors.foreground, marginBottom: 8,
    },
    servingOption: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingVertical: 13,
    },
    servingOptionActive: {},
    servingOptionText: {
      fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular", flex: 1,
    },
    servingOptionTextActive: { color: colors.primary, fontFamily: "Inter_600SemiBold" },
  });
}
