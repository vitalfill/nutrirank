import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PLANT_GROUP_CODES, ANIMAL_GROUP_CODES, ALL_GROUP_CODES } from "@/constants/api";
import { useColors } from "@/hooks/useColors";
import { FoodGroup } from "@/types";

interface Props {
  groups: FoodGroup[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  loading: boolean;
}

const SPECIAL_OPTIONS = [
  { id: "__ALL__",     label: "Select All", icon: "select-all" as const,  codes: ALL_GROUP_CODES },
  { id: "__PLANTS__",  label: "All Plants", icon: "eco" as const,          codes: PLANT_GROUP_CODES },
  { id: "__ANIMALS__", label: "All Animal", icon: "set-meal" as const,     codes: ANIMAL_GROUP_CODES },
];

function isSetEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every(x => setA.has(x));
}

export default function FoodGroupPicker({ groups, selectedIds, onChange, loading }: Props) {
  const colors = useColors();
  const styles = makeStyles(colors);

  const activeSpecial = SPECIAL_OPTIONS.find(opt => isSetEqual(selectedIds, opt.codes)) ?? null;

  function handleSpecial(opt: typeof SPECIAL_OPTIONS[0]) {
    if (activeSpecial?.id === opt.id) {
      onChange([]);
    } else {
      onChange([...opt.codes]);
    }
  }

  function handleGroup(code: string) {
    if (selectedIds.includes(code)) {
      onChange(selectedIds.filter(id => id !== code));
    } else {
      // If a special was active, deselect all special codes first
      const allSpecialCodes = ALL_GROUP_CODES;
      const cleaned = activeSpecial
        ? selectedIds.filter(id => !allSpecialCodes.includes(id))
        : selectedIds;
      onChange([...cleaned, code]);
    }
  }

  const hasSelection = selectedIds.length > 0;

  return (
    <View style={styles.container}>
      {/* Row 1 — quick-select buttons */}
      <View style={styles.row1}>
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
                size={14}
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

      {/* Row 2 — individual groups horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 4 }} />
        ) : (
          groups.map(g => {
            const isActive = selectedIds.includes(g.FdGrp_Cd);
            const label = g.FdGrp_Desc.replace(/Products$/i, "").trim();
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
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { gap: 8 },
    row1: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      alignItems: "center",
    },
    scroll: {
      flexDirection: "row",
      gap: 8,
      paddingVertical: 2,
      alignItems: "center",
    },
    specialChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1.5,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 20,
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
  });
}
