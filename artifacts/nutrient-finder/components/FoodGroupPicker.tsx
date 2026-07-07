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
import { getFoodGroupIcon } from "@/constants/foodGroupIcons";
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
  const [dietExpanded,  setDietExpanded]  = useState(false);
  const [groupExpanded, setGroupExpanded] = useState(false);

  const activeSpecial  = SPECIAL_OPTIONS.find(opt => isSetEqual(selectedIds, opt.codes)) ?? null;
  const activeDietary  = DIETARY_FILTERS.find(opt => isSetEqual(selectedIds, opt.groupCodes)) ?? null;
  const hasSelection   = selectedIds.length > 0;

  // Count of selected IDs that map to actual API food-group codes
  const selectedGroupCount = selectedIds.filter(id =>
    groups.some(g => g.FdGrp_Cd === id)
  ).length;

  function handleSpecial(opt: typeof SPECIAL_OPTIONS[0]) {
    if (activeSpecial?.id === opt.id) onChange([]);
    else onChange([...opt.codes]);
  }

  function handleDietary(opt: (typeof DIETARY_FILTERS)[0]) {
    if (activeDietary?.id === opt.id) {
      onChange([]);
    } else {
      onChange([...opt.groupCodes]);
    }
  }

  function handleGroup(code: string) {
    const next = selectedIds.includes(code)
      ? selectedIds.filter(id => id !== code)
      : [...selectedIds, code];
    onChange(next);
    // If this manual edit means the selection no longer matches any dietary
    // preset, the activeDietary check will auto-clear on the parent re-render
    // (no extra logic needed — isSetEqual handles it).
  }

  // Collapsible button labels
  const dietLabel = activeDietary
    ? `Filter by diet · ${activeDietary.emoji} ${activeDietary.label}`
    : "Filter by diet";
  const dietActive = activeDietary !== null;

  const fgLabel = selectedGroupCount > 0
    ? `Filter by food group · ${selectedGroupCount} selected`
    : "Filter by food group";
  const fgActive = selectedGroupCount > 0;

  return (
    <View style={styles.container}>

      {/* ── Row 1: Broad scope (always visible) ── */}
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

      {/* ── Filter by diet (collapsible) ── */}
      <View>
        <Pressable
          style={({ pressed }) => [
            styles.collapseBtn,
            dietActive && styles.collapseBtnActive,
            pressed && { opacity: 0.75 },
          ]}
          onPress={() => setDietExpanded(e => !e)}
        >
          <Text
            style={[styles.collapseBtnText, dietActive && styles.collapseBtnTextActive]}
            numberOfLines={1}
          >
            {dietLabel}
          </Text>
          <MaterialIcons
            name={dietExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={16}
            color={dietActive ? colors.primary : colors.mutedForeground}
          />
        </Pressable>

        {dietExpanded && (
          <View style={styles.expandedRow}>
            {DIETARY_FILTERS.map(opt => {
              const isActive = activeDietary?.id === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  style={({ pressed }) => [
                    styles.chip,
                    isActive ? styles.chipActive : styles.chipInactive,
                    pressed && styles.chipPressed,
                  ]}
                  onPress={() => handleDietary(opt)}
                >
                  <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Filter by food group (collapsible) ── */}
      <View>
        <Pressable
          style={({ pressed }) => [
            styles.collapseBtn,
            fgActive && styles.collapseBtnActive,
            pressed && { opacity: 0.75 },
          ]}
          onPress={() => setGroupExpanded(e => !e)}
        >
          <Text
            style={[styles.collapseBtnText, fgActive && styles.collapseBtnTextActive]}
            numberOfLines={1}
          >
            {fgLabel}
          </Text>
          <MaterialIcons
            name={groupExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={16}
            color={fgActive ? colors.primary : colors.mutedForeground}
          />
        </Pressable>

        {groupExpanded && (
          <View style={styles.groupGrid}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              groups.map(g => {
                const isActive = selectedIds.includes(g.FdGrp_Cd);
                const label    = shortGroupLabel(g.FdGrp_Desc);
                const icon     = getFoodGroupIcon(g.FdGrp_Cd);
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
                    <Text style={styles.chipEmoji}>{icon}</Text>
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
    container: { gap: 7 },

    /* ── Row 1 chips ── */
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
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
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
    chipEmoji: { fontSize: 12 },
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

    /* ── Collapsible expand buttons ── */
    collapseBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.chipInactive,
    },
    collapseBtnActive: {
      borderColor: colors.chipActiveBorder,
      backgroundColor: colors.chipActive,
    },
    collapseBtnText: {
      flex: 1,
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
    },
    collapseBtnTextActive: {
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },

    /* ── Expanded content areas ── */
    expandedRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      paddingTop: 8,
      paddingHorizontal: 2,
    },
    groupGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      paddingTop: 8,
      paddingHorizontal: 2,
    },
  });
}
