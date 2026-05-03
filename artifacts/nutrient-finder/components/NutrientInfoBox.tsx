import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { getNutrientInfo } from "@/constants/nutrientsData";
import { getInteraction } from "@/constants/interactions";
import { Nutrient } from "@/types";

interface Props {
  nutrient: Nutrient;
}

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>["name"];

const VALID_ICONS: MaterialIconName[] = [
  "fitness-center", "science", "security", "psychology",
  "monitor-heart", "opacity", "bolt", "eco", "auto-awesome",
  "accessibility", "cable", "water-drop", "healing", "build",
  "visibility", "face", "child-care", "favorite", "wb-sunny",
  "directions-run", "trending-up", "restaurant",
];

function safeIcon(name: string): MaterialIconName {
  return VALID_ICONS.includes(name as MaterialIconName) ? (name as MaterialIconName) : "info";
}

export default function NutrientInfoBox({ nutrient }: Props) {
  const colors = useColors();
  const info = getNutrientInfo(nutrient.Nutr_No);
  const interaction = getInteraction(nutrient.Nutr_No);

  if (!info) return null;

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="info-outline" size={16} color={colors.accent} />
        <Text style={styles.headerText}>About {nutrient.NutrDesc}</Text>
        {info.dailyValue && (
          <View style={styles.dvBadge}>
            <Text style={styles.dvBadgeText}>DV: {info.dailyValue.label}</Text>
          </View>
        )}
      </View>

      <View style={styles.rolesContainer}>
        {info.roles.map((role, i) => (
          <View key={i} style={styles.roleRow}>
            <View style={styles.roleIconWrap}>
              <MaterialIcons name={safeIcon(role.icon)} size={18} color={colors.primary} />
            </View>
            <View style={styles.roleContent}>
              <Text style={styles.roleTitle}>{role.title}</Text>
              <Text style={styles.roleDesc}>{role.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Nutrient interaction note */}
      {interaction && (
        <View style={styles.interactionRow}>
          <MaterialIcons name="link" size={14} color={colors.gold} />
          <Text style={styles.interactionText}>{interaction}</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.infoBox,
      borderWidth: 1,
      borderColor: colors.infoBoxBorder,
      borderRadius: 14,
      padding: 14,
      gap: 12,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
    },
    headerText: {
      flex: 1,
      fontSize: 13,
      color: colors.accent,
      fontFamily: "Inter_600SemiBold",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    dvBadge: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    dvBadgeText: {
      fontSize: 11,
      color: "#FFFFFF",
      fontFamily: "Inter_600SemiBold",
    },
    rolesContainer: { gap: 10 },
    roleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    roleIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    roleContent: { flex: 1, gap: 2 },
    roleTitle: {
      fontSize: 13,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    roleDesc: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      lineHeight: 17,
    },
    interactionRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 7,
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    interactionText: {
      flex: 1,
      fontSize: 12,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      lineHeight: 18,
    },
  });
}
