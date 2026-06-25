import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useCallback } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { FoodResult, FoodWeight } from "@/types";

interface Props {
  item: FoodResult;
  rank: number;
  nutrientLabel: string;
  units: string;
  nutrNo: string;
  dailyValue?: number;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onPressFood: (ndbNo: string, foodName: string) => void;
}

export default function ResultCard({
  item, rank, nutrientLabel, units, nutrNo, dailyValue,
  isFavorited, onToggleFavorite, onPressFood,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors, insets);

  // Use the server-chosen serving so the displayed value matches the ranking.
  // is_fallback foods have chosen_gm_wgt = 100, which selects the "100 g" option.
  const defaultGrams = item.chosen_gm_wgt ?? (item.weights.length > 0 ? item.weights[0].Gm_Wgt : 100);

  const allWeights: FoodWeight[] = [
    { Amount: 100, Msre_Desc: "g", Gm_Wgt: 100 },
    ...item.weights,
  ];

  const [selectedGrams, setSelectedGrams] = useState(defaultGrams);
  const [pickerVisible, setPickerVisible] = useState(false);

  const displayValue = (item.Nutr_Val / 100) * selectedGrams;
  const dvPercent = dailyValue ? Math.round((displayValue / dailyValue) * 100) : null;
  const dvWidth = dvPercent !== null ? Math.min(dvPercent, 100) : 0;

  const selectedWeight = allWeights.find(w => w.Gm_Wgt === selectedGrams) ?? allWeights[0];

  function formatServingLabel(w: FoodWeight): string {
    if (w.Gm_Wgt === 100 && w.Msre_Desc === "g") return "100 g";
    // Synthetic fallback entries already embed the gram amount in their description
    // (e.g. "55 g (typical serving)") — don't prepend Amount again.
    if (w.Msre_Desc.includes("(typical serving)")) return w.Msre_Desc;
    const amt = w.Amount % 1 === 0 ? w.Amount.toFixed(0) : w.Amount.toFixed(1);
    return `${amt} ${w.Msre_Desc}`;
  }

  const servingLabel = formatServingLabel(selectedWeight);

  function handleFavorite() {
    Haptics.impactAsync(isFavorited ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
    onToggleFavorite();
  }

  const renderWeightOption = useCallback(({ item: w }: { item: FoodWeight }) => {
    const label = formatServingLabel(w);
    const isSelected = w.Gm_Wgt === selectedGrams;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.weightOption,
          isSelected && styles.weightOptionSelected,
          pressed && styles.weightOptionPressed,
        ]}
        onPress={() => { setSelectedGrams(w.Gm_Wgt); setPickerVisible(false); }}
      >
        <Text style={[styles.weightOptionText, isSelected && styles.weightOptionTextSelected]}>
          {label}
        </Text>
        {isSelected && <MaterialIcons name="check" size={16} color={colors.primary} />}
      </Pressable>
    );
  }, [selectedGrams, styles, colors]);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{rank}</Text>
        </View>

        {/* Tappable food name → opens Food Detail */}
        <Pressable
          style={({ pressed }) => [styles.foodNameBtn, pressed && { opacity: 0.65 }]}
          onPress={() => onPressFood(item.NDB_No, item.Long_Desc)}
        >
          <Text style={styles.foodName} numberOfLines={2}>{item.Long_Desc}</Text>
          <MaterialIcons name="open-in-new" size={12} color={colors.mutedForeground} style={{ marginTop: 2 }} />
        </Pressable>

        <Pressable
          onPress={handleFavorite}
          hitSlop={8}
          style={({ pressed }) => [styles.starBtn, pressed && { opacity: 0.6 }]}
        >
          <MaterialIcons
            name={isFavorited ? "star" : "star-border"}
            size={22}
            color={isFavorited ? colors.gold : colors.border}
          />
        </Pressable>
      </View>

      <View style={styles.bottomRow}>
        <Pressable
          style={({ pressed }) => [styles.servingBtn, pressed && { opacity: 0.7 }]}
          onPress={() => setPickerVisible(true)}
        >
          <MaterialIcons name="restaurant" size={13} color={colors.accent} />
          <Text style={styles.servingText}>{servingLabel}</Text>
          <MaterialIcons name="keyboard-arrow-down" size={14} color={colors.mutedForeground} />
        </Pressable>

        <View style={styles.valueWrap}>
          <Text style={styles.valueText}>
            {displayValue < 1 && displayValue > 0
              ? displayValue.toFixed(3)
              : displayValue.toFixed(1)}
          </Text>
          <Text style={styles.unitText}>{units}</Text>
          {dvPercent !== null && (
            <View style={[
              styles.dvPill,
              dvPercent >= 20 ? styles.dvPillHigh : dvPercent >= 6 ? styles.dvPillMid : styles.dvPillLow,
            ]}>
              <Text style={styles.dvText}>{dvPercent}% DV</Text>
            </View>
          )}
        </View>
      </View>

      {dvPercent !== null && (
        <View style={styles.dvBarBg}>
          <View style={[styles.dvBarFill, { width: `${dvWidth}%` as any }]} />
        </View>
      )}

      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setPickerVisible(false)}>
          <View
            style={[
              styles.sheet,
              { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 12 },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select Serving Size</Text>
            <FlatList
              data={allWeights}
              keyExtractor={(w, i) => `${w.Gm_Wgt}_${i}`}
              renderItem={renderWeightOption}
              ItemSeparatorComponent={() => <View style={styles.weightSep} />}
              style={{ maxHeight: 280 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card, borderRadius: 14, padding: 14,
      marginHorizontal: 16, marginVertical: 5,
      borderWidth: 1, borderColor: colors.border, gap: 10,
      shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    topRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    rankBadge: {
      width: 28, height: 28, borderRadius: 8,
      backgroundColor: colors.rankBadge,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    rankText: { fontSize: 12, color: "#FFFFFF", fontFamily: "Inter_700Bold" },
    foodNameBtn: {
      flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 4,
    },
    foodName: {
      flex: 1, fontSize: 14, color: colors.primary,
      fontFamily: "Inter_500Medium", lineHeight: 20,
      textDecorationLine: "underline",
      textDecorationColor: colors.border,
    },
    starBtn: { flexShrink: 0, paddingTop: 1 },
    bottomRow: {
      flexDirection: "row", alignItems: "center",
      justifyContent: "space-between", gap: 8,
    },
    servingBtn: {
      flexDirection: "row", alignItems: "center", gap: 5,
      backgroundColor: colors.muted, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 6, flex: 1,
    },
    servingText: {
      flex: 1, fontSize: 12, color: colors.foreground, fontFamily: "Inter_400Regular",
    },
    valueWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
    valueText: { fontSize: 15, color: colors.primary, fontFamily: "Inter_700Bold" },
    unitText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    dvPill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    dvPillHigh: { backgroundColor: colors.secondary },
    dvPillMid:  { backgroundColor: "#FFF3C4" },
    dvPillLow:  { backgroundColor: "#FFECEC" },
    dvText: { fontSize: 10, color: colors.primary, fontFamily: "Inter_600SemiBold" },
    dvBarBg: {
      height: 4, backgroundColor: colors.dvBarBg, borderRadius: 2, overflow: "hidden",
    },
    dvBarFill: { height: 4, backgroundColor: colors.dvBar, borderRadius: 2 },
    overlay: {
      flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      paddingTop: 12, paddingHorizontal: 16,
    },
    sheetHandle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: colors.border, alignSelf: "center", marginBottom: 14,
    },
    sheetTitle: {
      fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 12,
    },
    weightOption: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13,
    },
    weightOptionSelected: {},
    weightOptionPressed: { opacity: 0.6 },
    weightOptionText: { fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular" },
    weightOptionTextSelected: { color: colors.primary, fontFamily: "Inter_600SemiBold" },
    weightSep: { height: 1, backgroundColor: colors.border },
  });
}
