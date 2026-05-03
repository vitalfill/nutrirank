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

const PRIVACY_URL = "https://vital-fill.com/privacy.php";

import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: "science" as const,
    color: "#2D6A4F",
    title: "1. Choose a Nutrient",
    body: "Tap the nutrient selector at the top to open the full list. Search by name or scroll to find the one you want. Tap to select it.",
  },
  {
    icon: "filter-list" as const,
    color: "#40916C",
    title: "2. Filter by Food Group",
    body: "Use the food group row below to narrow results. Tap \"Select All\" for every food, \"All Plants\" or \"All Animal\" for broad categories, or pick individual groups.",
  },
  {
    icon: "leaderboard" as const,
    color: "#52B788",
    title: "3. Read the Rankings",
    body: "Foods are ranked from highest to lowest content per 100 g. The number in the green badge shows the overall rank.",
  },
  {
    icon: "restaurant" as const,
    color: "#2D6A4F",
    title: "4. Adjust Serving Size",
    body: "Tap the serving size button on any card to switch between 100 g and real-world portions (1 cup, 1 oz, etc.). The nutrient amount updates instantly.",
  },
  {
    icon: "star" as const,
    color: "#E9C46A",
    title: "5. Save Favorites",
    body: "Tap the star on any food card to save that food + nutrient combination. Revisit favorites any time from the star icon in the top bar.",
  },
];

const DV_EXPLANATION = `Daily Value (% DV) is based on the FDA's recommended daily intake for an average adult eating 2,000 calories per day. For example, if a food shows "45% DV" for Calcium, one serving provides 45% of the calcium most adults need in a day.\n\n% DV is a quick way to judge whether a food is high (20% DV or more) or low (5% DV or less) in a nutrient.`;

export default function HowToUseModal({ visible, onClose }: Props) {
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
            <MaterialIcons name="help-outline" size={20} color={colors.accent} />
            <Text style={styles.headerTitle}>How to Use NutriRank</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 40 : insets.bottom + 40 }]}
        >
          {/* Hero blurb */}
          <View style={styles.heroBanner}>
            <MaterialIcons name="eco" size={32} color={colors.primary} />
            <Text style={styles.heroTitle}>Find the Richest Food Sources for Any Nutrient</Text>
            <Text style={styles.heroBody}>
              NutriRank searches the USDA FDA food database and ranks every food by how much of a specific nutrient it contains — per 100 g. It's the fastest way to discover what to eat more of.
            </Text>
          </View>

          {/* Steps */}
          <Text style={styles.sectionTitle}>Getting Started</Text>
          {STEPS.map(step => (
            <View key={step.title} style={styles.stepCard}>
              <View style={[styles.stepIcon, { backgroundColor: step.color + "20" }]}>
                <MaterialIcons name={step.icon} size={22} color={step.color} />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepBody}>{step.body}</Text>
              </View>
            </View>
          ))}

          {/* DV Explainer */}
          <Text style={styles.sectionTitle}>What is % Daily Value (% DV)?</Text>
          <View style={styles.dvCard}>
            <View style={styles.dvHeader}>
              <MaterialIcons name="info-outline" size={18} color={colors.accent} />
              <Text style={styles.dvHeaderText}>FDA Daily Value Guide</Text>
            </View>
            <Text style={styles.dvBody}>{DV_EXPLANATION}</Text>
            <View style={styles.dvScale}>
              <View style={styles.dvScaleItem}>
                <View style={[styles.dvDot, { backgroundColor: colors.destructive }]} />
                <Text style={styles.dvScaleText}><Text style={styles.dvScaleBold}>5% DV or less</Text> — Low</Text>
              </View>
              <View style={styles.dvScaleItem}>
                <View style={[styles.dvDot, { backgroundColor: colors.gold }]} />
                <Text style={styles.dvScaleText}><Text style={styles.dvScaleBold}>6–19% DV</Text> — Moderate</Text>
              </View>
              <View style={styles.dvScaleItem}>
                <View style={[styles.dvDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.dvScaleText}><Text style={styles.dvScaleBold}>20% DV or more</Text> — High</Text>
              </View>
            </View>
          </View>

          {/* Note on 100g baseline */}
          <View style={styles.noteCard}>
            <MaterialIcons name="balance" size={18} color={colors.accent} />
            <Text style={styles.noteText}>
              <Text style={styles.noteBold}>Why 100 g?</Text> Ranking by 100 g puts every food on the same level playing field, making comparisons fair and consistent. Use the serving size selector on each card to see real-world amounts.
            </Text>
          </View>

          {/* Privacy + Copyright */}
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} style={styles.privacyLink}>
            <MaterialIcons name="privacy-tip" size={13} color="#40916C" />
            <Text style={styles.privacyText}>Privacy Policy</Text>
          </Pressable>
          <Text style={styles.copyright}>© Copyright Vital Fill LLC 2026</Text>
        </ScrollView>
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
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
    headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    closeBtn: { padding: 4 },
    content: { paddingHorizontal: 16, paddingTop: 20, gap: 14 },
    heroBanner: {
      backgroundColor: colors.infoBox, borderWidth: 1, borderColor: colors.infoBoxBorder,
      borderRadius: 16, padding: 18, alignItems: "center", gap: 10,
    },
    heroTitle: {
      fontSize: 17, fontFamily: "Inter_700Bold", color: colors.foreground, textAlign: "center",
    },
    heroBody: {
      fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular",
      textAlign: "center", lineHeight: 21,
    },
    sectionTitle: {
      fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_600SemiBold",
      letterSpacing: 0.8, textTransform: "uppercase", marginTop: 6,
    },
    stepCard: {
      flexDirection: "row", gap: 14, alignItems: "flex-start",
      backgroundColor: colors.card, borderRadius: 14,
      borderWidth: 1, borderColor: colors.border, padding: 14,
    },
    stepIcon: {
      width: 44, height: 44, borderRadius: 12,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    stepContent: { flex: 1, gap: 4 },
    stepTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    stepBody: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 19 },
    dvCard: {
      backgroundColor: colors.card, borderRadius: 14,
      borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12,
    },
    dvHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
    dvHeaderText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.accent },
    dvBody: {
      fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20,
    },
    dvScale: { gap: 8 },
    dvScaleItem: { flexDirection: "row", alignItems: "center", gap: 10 },
    dvDot: { width: 10, height: 10, borderRadius: 5 },
    dvScaleText: { fontSize: 13, color: colors.foreground, fontFamily: "Inter_400Regular" },
    dvScaleBold: { fontFamily: "Inter_600SemiBold" },
    noteCard: {
      flexDirection: "row", gap: 10, alignItems: "flex-start",
      backgroundColor: colors.muted, borderRadius: 12, padding: 14,
    },
    noteText: {
      flex: 1, fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 19,
    },
    noteBold: { fontFamily: "Inter_600SemiBold", color: colors.foreground },
    privacyLink: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
      paddingVertical: 6,
    },
    privacyText: {
      fontSize: 12, color: "#40916C", fontFamily: "Inter_600SemiBold",
      textDecorationLine: "underline",
    },
    copyright: {
      fontSize: 11, color: colors.mutedForeground,
      fontFamily: "Inter_400Regular", textAlign: "center",
      paddingBottom: 8,
    },
  });
}
