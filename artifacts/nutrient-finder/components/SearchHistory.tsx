import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { Nutrient } from "@/types";

interface Props {
  history: Nutrient[];
  onSelect: (n: Nutrient) => void;
  onClear: () => void;
}

export default function SearchHistory({ history, onSelect, onClear }: Props) {
  const colors = useColors();
  const styles = makeStyles(colors);

  if (history.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <MaterialIcons name="history" size={13} color={colors.mutedForeground} />
        <Text style={styles.label}>RECENT</Text>
        <Pressable onPress={onClear} hitSlop={8}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {history.map(n => (
          <Pressable
            key={n.Nutr_No}
            style={({ pressed }) => [styles.chip, pressed && { opacity: 0.65 }]}
            onPress={() => onSelect(n)}
          >
            <Text style={styles.chipText} numberOfLines={1}>{n.NutrDesc}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { gap: 6 },
    labelRow: {
      flexDirection: "row", alignItems: "center", gap: 5,
    },
    label: {
      flex: 1, fontSize: 11, color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold", letterSpacing: 0.8,
    },
    clearText: {
      fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular",
    },
    scroll: { flexDirection: "row", gap: 8, paddingVertical: 2 },
    chip: {
      backgroundColor: colors.muted, borderRadius: 16,
      paddingHorizontal: 12, paddingVertical: 6,
      borderWidth: 1, borderColor: colors.border,
      maxWidth: 180,
    },
    chipText: {
      fontSize: 12, color: colors.foreground, fontFamily: "Inter_400Regular",
    },
  });
}
