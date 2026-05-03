import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { useColors } from "@/hooks/useColors";

interface NutrientRow {
  Nutr_No: string;
  NutrDesc: string;
  Units: string;
  Nutr_Val: number;
  SR_Order: number;
}

interface FoodDetailData {
  ndb_no: string;
  Long_Desc: string;
  FdGrp_Cd: string;
  nutrients: NutrientRow[];
}

interface Props {
  ndbNo: string | null;
  foodName: string;
  onClose: () => void;
}

// SR_Order buckets — loosely follows USDA standard label ordering
const PROXIMATES_MAX = 350;  // energy, protein, fat, carbs, fiber, sugar, water, ash
const MINERALS_MAX   = 500;  // Ca, Fe, Mg, P, K, Na, Zn, Cu, Mn, Se, etc.
const VITAMINS_MAX   = 650;  // all vitamins
const LIPIDS_MAX     = 800;  // fatty acid breakdown
// > 800 = amino acids

const DV_MAP: Record<string, number> = {
  "208": 2000, "203": 50, "204": 78, "205": 275, "291": 28,
  "269": 50, "601": 300, "606": 20, "301": 1300, "303": 18,
  "304": 420, "305": 1250, "306": 4700, "307": 2300, "309": 11,
  "312": 0.9, "315": 2.3, "317": 55, "320": 900, "318": 5000,
  "323": 15, "324": 20, "328": 20, "401": 90, "404": 1.2,
  "405": 1.3, "406": 16, "410": 5, "415": 1.7, "417": 400,
  "435": 400, "418": 2.4, "421": 550, "430": 120,
};

function dvPercent(nutr: NutrientRow): number | null {
  const dv = DV_MAP[nutr.Nutr_No];
  if (!dv || nutr.Nutr_Val === 0) return null;
  return Math.round((nutr.Nutr_Val / dv) * 100);
}

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return (
    <View style={{ backgroundColor: colors.muted, paddingHorizontal: 16, paddingVertical: 6 }}>
      <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: colors.mutedForeground, letterSpacing: 0.8, textTransform: "uppercase" }}>
        {title}
      </Text>
    </View>
  );
}

function NutrientLine({ nutr, colors, indent = false }: { nutr: NutrientRow; colors: any; indent?: boolean }) {
  const dv = dvPercent(nutr);
  const val = nutr.Nutr_Val < 1 && nutr.Nutr_Val > 0
    ? nutr.Nutr_Val.toFixed(3)
    : nutr.Nutr_Val < 10
    ? nutr.Nutr_Val.toFixed(1)
    : nutr.Nutr_Val.toFixed(0);

  return (
    <View style={{
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 9,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      paddingLeft: indent ? 28 : 16,
    }}>
      <Text style={{ flex: 1, fontSize: 13, color: colors.foreground, fontFamily: indent ? "Inter_400Regular" : "Inter_500Medium" }}>
        {nutr.NutrDesc}
      </Text>
      <Text style={{ fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginRight: 8 }}>
        {val} {nutr.Units}
      </Text>
      {dv !== null && (
        <Text style={{
          fontSize: 11, color: dv >= 20 ? colors.primary : colors.mutedForeground,
          fontFamily: "Inter_600SemiBold", width: 52, textAlign: "right",
        }}>
          {dv}% DV
        </Text>
      )}
    </View>
  );
}

export default function FoodDetailModal({ ndbNo, foodName, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors, insets);
  const [expandFatty, setExpandFatty] = useState(false);
  const [expandAmino, setExpandAmino] = useState(false);

  const [retryCount, setRetryCount] = useState(0);

  const { data, isLoading, isError, error } = useQuery<FoodDetailData, Error>({
    queryKey: ["food-detail", ndbNo, retryCount],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/food-detail.php?ndb_no=${ndbNo}`);
      const text = await res.text();
      let json: any;
      try { json = JSON.parse(text); } catch {
        throw new Error(`Server returned non-JSON (HTTP ${res.status}). Make sure food-detail.php is uploaded to drgily.com/app-api/.`);
      }
      if (!res.ok || json.error) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      return json;
    },
    enabled: !!ndbNo,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const proximates = data?.nutrients.filter(n => n.SR_Order < PROXIMATES_MAX) ?? [];
  const minerals   = data?.nutrients.filter(n => n.SR_Order >= PROXIMATES_MAX && n.SR_Order < MINERALS_MAX) ?? [];
  const vitamins   = data?.nutrients.filter(n => n.SR_Order >= MINERALS_MAX && n.SR_Order < VITAMINS_MAX) ?? [];
  const fatty      = data?.nutrients.filter(n => n.SR_Order >= VITAMINS_MAX && n.SR_Order < LIPIDS_MAX) ?? [];
  const amino      = data?.nutrients.filter(n => n.SR_Order >= LIPIDS_MAX) ?? [];

  // Pull out calories for big display
  const energy = proximates.find(n => n.Nutr_No === "208" || n.NutrDesc.toLowerCase().includes("energy"));
  const mainRows = proximates.filter(n => n !== energy);

  return (
    <Modal
      visible={!!ndbNo}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <MaterialIcons name="science" size={18} color={colors.accent} style={{ marginLeft: 4 }} />
        </View>

        {/* Food name */}
        <View style={styles.titleWrap}>
          <Text style={styles.foodTitle} numberOfLines={3}>{foodName}</Text>
          <Text style={styles.serving}>Per 100 g</Text>
        </View>

        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading nutrition data…</Text>
          </View>
        )}

        {isError && (
          <View style={styles.center}>
            <MaterialIcons name="error-outline" size={44} color={colors.destructive} />
            <Text style={styles.errorText}>Could not load nutrition data.</Text>
            {error?.message && (
              <Text style={styles.errorDetail}>{error.message}</Text>
            )}
            <Pressable
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.75 }]}
              onPress={() => setRetryCount(c => c + 1)}
            >
              <MaterialIcons name="refresh" size={16} color="#fff" />
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {data && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>

            {/* ── Calories banner ── */}
            {energy && (
              <View style={styles.calBanner}>
                <Text style={styles.calLabel}>Calories</Text>
                <Text style={styles.calValue}>{Math.round(energy.Nutr_Val)}</Text>
              </View>
            )}

            {/* ── Nutrition label divider ── */}
            <View style={styles.thickDivider} />
            <View style={styles.dvHeader}>
              <Text style={styles.dvHeaderText}>% Daily Value*</Text>
            </View>

            {/* ── Proximates ── */}
            {mainRows.length > 0 && <>
              <SectionHeader title="Macronutrients" colors={colors} />
              {mainRows.map(n => <NutrientLine key={n.Nutr_No} nutr={n} colors={colors}
                indent={["606","645","646","605"].includes(n.Nutr_No)} />)}
            </>}

            {/* ── Minerals ── */}
            {minerals.length > 0 && <>
              <SectionHeader title="Minerals" colors={colors} />
              {minerals.map(n => <NutrientLine key={n.Nutr_No} nutr={n} colors={colors} />)}
            </>}

            {/* ── Vitamins ── */}
            {vitamins.length > 0 && <>
              <SectionHeader title="Vitamins" colors={colors} />
              {vitamins.map(n => <NutrientLine key={n.Nutr_No} nutr={n} colors={colors} />)}
            </>}

            {/* ── Fatty acids (collapsible) ── */}
            {fatty.length > 0 && <>
              <Pressable
                style={styles.sectionToggle}
                onPress={() => setExpandFatty(v => !v)}
              >
                <SectionHeader title={`Fatty Acid Profile (${fatty.length})`} colors={colors} />
                <MaterialIcons
                  name={expandFatty ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                  size={20} color={colors.mutedForeground}
                  style={{ marginRight: 12 }}
                />
              </Pressable>
              {expandFatty && fatty.map(n => <NutrientLine key={n.Nutr_No} nutr={n} colors={colors} indent />)}
            </>}

            {/* ── Amino acids (collapsible) ── */}
            {amino.length > 0 && <>
              <Pressable
                style={styles.sectionToggle}
                onPress={() => setExpandAmino(v => !v)}
              >
                <SectionHeader title={`Amino Acids (${amino.length})`} colors={colors} />
                <MaterialIcons
                  name={expandAmino ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                  size={20} color={colors.mutedForeground}
                  style={{ marginRight: 12 }}
                />
              </Pressable>
              {expandAmino && amino.map(n => <NutrientLine key={n.Nutr_No} nutr={n} colors={colors} indent />)}
            </>}

            {/* Footer note */}
            <Text style={styles.footNote}>
              * % Daily Values based on a 2,000 kcal diet. Source: USDA Food Data Central.
            </Text>
            <Text style={styles.footNote}>© Vital Fill LLC 2026</Text>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    backText: { fontSize: 16, color: colors.primary, fontFamily: "Inter_500Medium" },
    titleWrap: {
      backgroundColor: colors.card, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
      borderBottomWidth: 3, borderBottomColor: colors.primary,
    },
    foodTitle: {
      fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground, lineHeight: 24,
    },
    serving: {
      fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 4,
    },
    calBanner: {
      flexDirection: "row", alignItems: "baseline", justifyContent: "space-between",
      paddingHorizontal: 16, paddingVertical: 14,
      backgroundColor: colors.card,
    },
    calLabel: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground },
    calValue: { fontSize: 36, fontFamily: "Inter_700Bold", color: colors.primary },
    thickDivider: { height: 8, backgroundColor: colors.foreground, opacity: 0.85 },
    dvHeader: {
      paddingHorizontal: 16, paddingVertical: 6,
      backgroundColor: colors.card,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    dvHeaderText: {
      fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground,
      textAlign: "right",
    },
    sectionToggle: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    center: {
      flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 80,
    },
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
  });
}
