import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ALL_GROUP_CODES, ANIMAL_GROUP_CODES, PLANT_GROUP_CODES } from "@/constants/api";
import { DIETARY_FILTERS } from "@/constants/dietaryFilters";
import { useColors } from "@/hooks/useColors";
import { FoodGroup } from "@/types";

interface Props {
  groups: FoodGroup[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  loading: boolean;
}

const SPECIAL_OPTIONS = [
  { id: "__ALL__",     label: "Select All", icon: "select-all" as const, codes: ALL_GROUP_CODES },
  { id: "__PLANTS__",  label: "All Plants", icon: "eco" as const,         codes: PLANT_GROUP_CODES },
  { id: "__ANIMALS__", label: "All Animal", icon: "set-meal" as const,    codes: ANIMAL_GROUP_CODES },
];

function isSetEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every(x => setA.has(x));
}

function shortGroupLabel(desc: string): string {
  return desc
    .replace(/\s*and\s+Vegetable\s+Products$/i, "")
    .replace(/\s*and\s+Legume\s+Products$/i, "")
    .replace(/\s*and\s+Fruit\s+Juices$/i, "")
    .replace(/\s*Products$/i, "")
    .replace(/Finfish and Shellfish/i, "Fish & Seafood")
    .replace(/Lamb, Veal, and Game/i, "Lamb & Game")
    .replace(/Sausages and Luncheon Meats/i, "Sausages")
    .replace(/Soups, Sauces, and Gravies/i, "Soups & Sauces")
    .replace(/Meals, Entrees, and Side Dishes/i, "Entrees")
    .replace(/Cereal Grains and Pasta/i, "Grains & Pasta")
    .replace(/American Indian\/Alaska Native Foods/i, "Am. Indian\/Alaska")
    .replace(/Nut and Seed/i, "Nuts & Seeds")
    .replace(/Dairy and Egg/i, "Dairy & Egg")
    .replace(/Breakfast Cereals/i, "Cereals")
    .trim();
}

export default function FoodGroupPicker({ groups, selectedIds, onChange, loading }: Props) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const [expanded, setExpanded] = useState(false);

  const activeSpecial = SPECIAL_OPTIONS.find(opt => isSetEqual(selectedIds, opt.codes)) ?? null;
  const activeDietary = DIETARY_FILTERS.find(opt => isSetEqual(selectedIds, opt.groupCodes)) ?? null;

  const granularSelectedCount = selectedIds.filter(id => ALL_GROUP_CODES.includes(id)).length;
  const hasSelection = selectedIds.length > 0;

  function handleSpecial(opt: typeof SPECIAL_OPTIONS[0]) {
    if (activeSpecial?.id === opt.id) onChange([]);
    else onChange([...opt.codes]);
  }

  function handleDietary(opt: (typeof DIETARY_FILTERS)[0]) {
    if (activeDietary?.id === opt.id) onChange([]);
    else onChange([...opt.groupCodes]);
  }

  function handleGroup(code: string) {
    if (selectedIds.includes(code)) {
      onChange(selectedIds.filter(id => id !== code));
    } else {
      onChange([...selectedIds, code]);
    }
  }

  const showSelectedBadge = granularSelectedCount > 0 && !activeSpecial && !activeDietary;

  return (
    <View style={styles.container}>
      {/* Row 1 — Broad scope */}
      <View style={styles.row}>
        {SPECIAL_OPTIONS.map(opt => {
          const isActive = activeSpecial?.id === opt.id;
          return (
            <Pressable
              key={opt.id}
              style={({ pressed }) => [
                styles.specialChip,
                isActive ? styles.chipActive : styles.chipInactive,
                pressed && styles.chipPressed,
              ]}
              onPress={() => handleSpecial(opt)}
            >
              <MaterialIcons
                name={opt.icon}
                size={13}
                color={isActive ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
        {hasSelection && (
          <Pressable onPress={() => onChange([])} style={styles.clearBtn}>
            <MaterialIcons name="close" size={13} color={colors.mutedForeground} />
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        )}
      </View>

      {/* Row 2 — Diet presets */}
      <View style={styles.row}>
        {DIETARY_FILTERS.map(opt => {
          const isActive = activeDietary?.id === opt.id;
          return (
            <Pressable
              key={opt.id}
              style={({ pressed }) => [
                styles.dietaryChip,
                isActive ? styles.dietaryChipActive : styles.dietaryChipInactive,
                pressed && styles.chipPressed,
              ]}
              onPress={() => handleDietary(opt)}
            >
              <Text style={styles.dietaryEmoji}>{opt.emoji}</Text>
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Row 3 — Expandable granular groups */}
      <View>
        <Pressable
          style={({ pressed }) => [styles.expandBtn, pressed && { opacity: 0.75 }]}
          onPress={() => setExpanded(e => !e)}
        >
          <MaterialIcons
            name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={16}
            color={colors.primary}
          />
          <Text style={styles.expandBtnText}>Filter by food group</Text>
          {showSelectedBadge && (
            <View style={styles.selectedCountBadge}>
              <Text style={styles.selectedCountText}>{granularSelectedCount} selected</Text>
            </View>
          )}
        </Pressable>

        {expanded && (
          <View style={styles.groupGrid}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              groups.map(g => {
                const isActive = selectedIds.includes(g.FdGrp_Cd);
                const label = shortGroupLabel(g.FdGrp_Desc);
                return (
                  <Pressable
                    key={g.FdGrp_Cd}
                    style={({ pressed }) => [
                      styles.chip,
                      isActive ? styles.chipActive : styles.chipInactive,
                      pressed && styles.chipPressed,
                    ]}
                    onPress={() => handleGroup(g.FdGrp_Cd)}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { gap: 8 },
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      alignItems: "center",
    },
    specialChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1.5,
    },
    dietaryChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1.5,
    },
    dietaryChipActive: {
      backgroundColor: colors.chipActive,
      borderColor: colors.chipActiveBorder,
    },
    dietaryChipInactive: {
      backgroundColor: colors.chipInactive,
      borderColor: colors.chipInactiveBorder,
    },
    dietaryEmoji: { fontSize: 13 },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 16,
      borderWidth: 1.5,
    },
    chipActive: {
      backgroundColor: colors.chipActive,
      borderColor: colors.chipActiveBorder,
    },
    chipInactive: {
      backgroundColor: colors.chipInactive,
      borderColor: colors.chipInactiveBorder,
    },
    chipPressed: { opacity: 0.65 },
    chipText: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
    },
    chipTextActive: {
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
    clearBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    clearText: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    expandBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    expandBtnText: {
      flex: 1,
      fontSize: 12,
      color: colors.primary,
      fontFamily: "Inter_500Medium",
    },
    selectedCountBadge: {
      backgroundColor: colors.secondary,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    selectedCountText: {
      fontSize: 11,
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
    groupGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      paddingTop: 8,
    },
  });
}
