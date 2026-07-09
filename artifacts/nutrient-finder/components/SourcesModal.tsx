import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import ResponsiveContainer from "@/components/ResponsiveContainer";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const SOURCES = [
  {
    title: "USDA FoodData Central",
    url: "https://fdc.nal.usda.gov/",
    description: "Food nutrient data — the database powering all rankings in NutriRank.",
  },
  {
    title: "FDA — Daily Value (%DV)",
    url: "https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels",
    description: "Daily Value reference amounts used for % DV calculations.",
  },
  {
    title: "NIH — Dietary Reference Intakes",
    url: "https://ods.od.nih.gov/HealthInformation/nutrientrecommendations.aspx",
    description: "Personalized intake values by age, sex, and life stage.",
  },
  {
    title: "NIH Office of Dietary Supplements — Fact Sheets",
    url: "https://ods.od.nih.gov/factsheets/list-all/",
    description: "Nutrient health information, functions, and research summaries.",
  },
  {
    title: "MedlinePlus (U.S. National Library of Medicine)",
    url: "https://medlineplus.gov/",
    description: "General health and nutrition information from the NLM.",
  },
];

export default function SourcesModal({ visible, onClose }: Props) {
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
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="menu-book" size={20} color={colors.accent} />
            <Text style={styles.headerTitle}>Sources & References</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Platform.OS === "web" ? 40 : insets.bottom + 40 },
          ]}
        >
        <ResponsiveContainer>
          {/* Disclaimer */}
          <View style={styles.disclaimerCard}>
            <MaterialIcons name="info-outline" size={18} color={colors.accent} />
            <Text style={styles.disclaimerText}>
              NutriRank provides nutrition information for educational purposes only and is not
              medical advice. Consult a healthcare professional for dietary or medical decisions.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Authoritative Sources</Text>

          {SOURCES.map((s) => (
            <Pressable
              key={s.url}
              style={({ pressed }) => [styles.sourceCard, pressed && { opacity: 0.75 }]}
              onPress={() => Linking.openURL(s.url)}
            >
              <View style={styles.sourceTop}>
                <Text style={styles.sourceTitle}>{s.title}</Text>
                <MaterialIcons name="open-in-new" size={14} color={colors.primary} />
              </View>
              <Text style={styles.sourceDesc}>{s.description}</Text>
              <Text style={styles.sourceUrl} numberOfLines={1}>{s.url}</Text>
            </Pressable>
          ))}

          <Text style={styles.note}>
            All nutrient rankings are derived from USDA SR Legacy data accessed via the FoodData
            Central API. Daily Values (% DV) follow FDA labeling regulations. Personalized daily
            intake recommendations (by age, sex, and life stage) are based on NIH Dietary Reference
            Intakes (DRIs). Nutrient health information is sourced from the NIH Office of Dietary
            Supplements fact sheets and MedlinePlus.
          </Text>
        </ResponsiveContainer>
        </ScrollView>
      </View>
    </Modal>
  );
}

function makeStyles(
  colors: ReturnType<typeof useColors>,
  insets: ReturnType<typeof useSafeAreaInsets>,
) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
    headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    closeBtn: { padding: 4 },
    content: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },

    disclaimerCard: {
      flexDirection: "row", gap: 10, alignItems: "flex-start",
      backgroundColor: colors.infoBox, borderWidth: 1, borderColor: colors.infoBoxBorder,
      borderRadius: 14, padding: 14,
    },
    disclaimerText: {
      flex: 1, fontSize: 13, color: colors.foreground,
      fontFamily: "Inter_400Regular", lineHeight: 20,
    },

    sectionTitle: {
      fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_600SemiBold",
      letterSpacing: 0.8, textTransform: "uppercase", marginTop: 4,
    },

    sourceCard: {
      backgroundColor: colors.card, borderRadius: 14,
      borderWidth: 1, borderColor: colors.border,
      padding: 14, gap: 4,
    },
    sourceTop: { flexDirection: "row", alignItems: "center", gap: 6 },
    sourceTitle: {
      flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold",
      color: colors.primary,
    },
    sourceDesc: {
      fontSize: 13, color: colors.foreground,
      fontFamily: "Inter_400Regular", lineHeight: 19,
    },
    sourceUrl: {
      fontSize: 11, color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },

    note: {
      fontSize: 12, color: colors.mutedForeground,
      fontFamily: "Inter_400Regular", lineHeight: 18,
      backgroundColor: colors.muted, borderRadius: 12, padding: 14,
    },
  });
}
