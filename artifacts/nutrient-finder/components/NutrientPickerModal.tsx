import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { Nutrient } from "@/types";

interface Props {
  nutrients: Nutrient[];
  selected: Nutrient | null;
  onSelect: (n: Nutrient) => void;
  loading: boolean;
  error: boolean;
}

export default function NutrientPickerModal({ nutrients, selected, onSelect, loading, error }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return nutrients;
    const q = search.toLowerCase();
    return nutrients.filter(n => n.NutrDesc.toLowerCase().includes(q));
  }, [nutrients, search]);

  const styles = makeStyles(colors, insets);

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
        onPress={() => setVisible(true)}
        testID="nutrient-picker-trigger"
      >
        <Ionicons name="leaf" size={18} color={colors.accent} style={styles.triggerIcon} />
        <Text style={[styles.triggerText, !selected && styles.triggerPlaceholder]} numberOfLines={1}>
          {selected ? selected.NutrDesc : "Select a nutrient..."}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <MaterialIcons name="keyboard-arrow-down" size={22} color={colors.mutedForeground} />
        )}
      </Pressable>

      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setVisible(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Nutrient</Text>
            <Pressable onPress={() => setVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={colors.mutedForeground} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search nutrients..."
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
              autoFocus
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          {error ? (
            <View style={styles.centerMsg}>
              <MaterialIcons name="error-outline" size={40} color={colors.destructive} />
              <Text style={styles.errorText}>Could not load nutrients.</Text>
              <Text style={styles.errorSub}>Check your connection to drgily.com</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => item.Nutr_No}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.listItem,
                    selected?.Nutr_No === item.Nutr_No && styles.listItemSelected,
                    pressed && styles.listItemPressed,
                  ]}
                  onPress={() => {
                    onSelect(item);
                    setVisible(false);
                    setSearch("");
                  }}
                >
                  <Text style={[
                    styles.listItemText,
                    selected?.Nutr_No === item.Nutr_No && styles.listItemTextSelected,
                  ]}>
                    {item.NutrDesc}
                  </Text>
                  <Text style={styles.listItemUnit}>{item.Units}</Text>
                  {selected?.Nutr_No === item.Nutr_No && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  )}
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) {
  return StyleSheet.create({
    trigger: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      gap: 8,
    },
    triggerPressed: { opacity: 0.7 },
    triggerIcon: { flexShrink: 0 },
    triggerText: { flex: 1, fontSize: 15, color: colors.foreground, fontFamily: "Inter_500Medium" },
    triggerPlaceholder: { color: colors.mutedForeground },
    modalContainer: { flex: 1, backgroundColor: colors.background },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    closeBtn: { padding: 4 },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 16,
      marginVertical: 12,
      backgroundColor: colors.muted,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    searchIcon: {},
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    listItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: colors.card,
      gap: 8,
    },
    listItemSelected: { backgroundColor: colors.secondary },
    listItemPressed: { opacity: 0.6 },
    listItemText: { flex: 1, fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular" },
    listItemTextSelected: { color: colors.primary, fontFamily: "Inter_600SemiBold" },
    listItemUnit: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    separator: { height: 1, backgroundColor: colors.border, marginLeft: 20 },
    centerMsg: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
    errorText: { fontSize: 16, color: colors.destructive, fontFamily: "Inter_600SemiBold" },
    errorSub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
  });
}
