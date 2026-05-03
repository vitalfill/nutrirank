import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React from "react";
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
import { Favorite } from "@/types";

interface Props {
  visible: boolean;
  favorites: Favorite[];
  onRevisit: (fav: Favorite) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function FavoritesModal({ visible, favorites, onRevisit, onDelete, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors, insets);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="star" size={20} color={colors.gold} />
            <Text style={styles.title}>Favorites</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        {favorites.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="star-border" size={56} color={colors.border} />
            <Text style={styles.emptyTitle}>No Favorites Yet</Text>
            <Text style={styles.emptyText}>
              Tap the star icon on any food result to save it here for quick revisits.
            </Text>
          </View>
        ) : (
          <FlatList
            data={favorites.slice().sort((a, b) => b.savedAt - a.savedAt)}
            keyExtractor={f => f.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.nutrientBadge}>
                    <MaterialIcons name="science" size={12} color={colors.primary} />
                    <Text style={styles.nutrientLabel} numberOfLines={1}>
                      {item.nutrientDesc}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => onDelete(item.id)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
                  >
                    <MaterialIcons name="delete-outline" size={18} color={colors.mutedForeground} />
                  </Pressable>
                </View>

                <Text style={styles.foodName} numberOfLines={2}>
                  {item.foodName}
                </Text>

                <View style={styles.cardBottom}>
                  <Text style={styles.valueText}>
                    {item.nutrientValue < 1 && item.nutrientValue > 0
                      ? item.nutrientValue.toFixed(3)
                      : item.nutrientValue.toFixed(1)}{" "}
                    {item.nutrientUnits}
                    <Text style={styles.perText}> per 100 g</Text>
                  </Text>

                  <Pressable
                    style={({ pressed }) => [styles.revisitBtn, pressed && { opacity: 0.75 }]}
                    onPress={() => { onRevisit(item); onClose(); }}
                  >
                    <MaterialIcons name="search" size={14} color="#FFFFFF" />
                    <Text style={styles.revisitText}>Revisit</Text>
                  </Pressable>
                </View>

                <Text style={styles.savedAt}>
                  Saved {new Date(item.savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </Text>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1 }} />}
          />
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
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    closeBtn: { padding: 4 },
    emptyState: {
      flex: 1, alignItems: "center", justifyContent: "center",
      paddingHorizontal: 32, gap: 12,
    },
    emptyTitle: {
      fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground,
    },
    emptyText: {
      fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular",
      textAlign: "center", lineHeight: 20,
    },
    list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 10 },
    card: {
      backgroundColor: colors.card, borderRadius: 14,
      borderWidth: 1, borderColor: colors.border,
      padding: 14, gap: 8,
    },
    cardTop: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    nutrientBadge: {
      flexDirection: "row", alignItems: "center", gap: 5,
      backgroundColor: colors.secondary, borderRadius: 8,
      paddingHorizontal: 8, paddingVertical: 4, flex: 1, marginRight: 8,
    },
    nutrientLabel: {
      fontSize: 11, color: colors.primary, fontFamily: "Inter_600SemiBold",
      flex: 1,
    },
    deleteBtn: { padding: 2 },
    foodName: {
      fontSize: 14, color: colors.foreground,
      fontFamily: "Inter_500Medium", lineHeight: 20,
    },
    cardBottom: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8,
    },
    valueText: {
      fontSize: 14, color: colors.primary, fontFamily: "Inter_700Bold", flex: 1,
    },
    perText: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    revisitBtn: {
      flexDirection: "row", alignItems: "center", gap: 5,
      backgroundColor: colors.primary, borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 7,
    },
    revisitText: { fontSize: 12, color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
    savedAt: {
      fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular",
    },
  });
}
