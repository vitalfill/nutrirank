import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRIVACY_URL = "https://vital-fill.com/privacy.php";

import { useSubscription } from "@/lib/revenuecat";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

const PERKS = [
  { icon: "science",     label: "All nutrients unlocked" },
  { icon: "leaderboard", label: "Unlimited pages" },
  { icon: "star",        label: "Save favorites" },
  { icon: "update",      label: "Annual — cancel any time" },
];

export default function PaywallModal({ visible, onDismiss }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors, insets);

  const { offerings, purchase, restore, isPurchasing, isRestoring } = useSubscription();

  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const currentOffering = offerings?.current;
  const packageToPurchase = currentOffering?.availablePackages[0];
  const priceString = packageToPurchase?.product.priceString ?? "$9.99";

  async function handleSubscribe() {
    if (!packageToPurchase) {
      setError("Subscription package not available. Try again shortly.");
      return;
    }
    if (__DEV__) {
      setShowConfirm(true);
      return;
    }
    await doPurchase();
  }

  async function doPurchase() {
    setError("");
    setShowConfirm(false);
    try {
      await purchase(packageToPurchase);
      onDismiss();
    } catch (e: any) {
      if (e?.userCancelled) return;
      setError(e?.message ?? "Purchase failed. Please try again.");
    }
  }

  async function handleRestore() {
    setError("");
    try {
      await restore();
      onDismiss();
    } catch (e: any) {
      setError(e?.message ?? "Could not restore purchases. Try again.");
    }
  }

  function handleClose() {
    setError("");
    setShowConfirm(false);
    onDismiss();
  }

  const busy = isPurchasing || isRestoring;

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <Pressable style={styles.overlay} onPress={handleClose} />
        <View style={[styles.sheet, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }]}>
          <View style={styles.sheetHandle} />

          <Pressable style={styles.closeBtn} onPress={handleClose}>
            <Ionicons name="close" size={22} color={colors.mutedForeground} />
          </Pressable>

          <View style={styles.iconWrap}>
            <MaterialIcons name="eco" size={36} color="#FFFFFF" />
          </View>

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>NutriRank Pro</Text>
            </View>
          </View>

          <Text style={styles.title}>Unlock All Nutrients</Text>
          <Text style={styles.subtitle}>
            Get unlimited access to every nutrient, all food groups, and saved favorites.
          </Text>

          <View style={styles.perksGrid}>
            {PERKS.map(p => (
              <View key={p.label} style={styles.perkItem}>
                <MaterialIcons name={p.icon as any} size={18} color={colors.primary} />
                <Text style={styles.perkText}>{p.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceAmount}>{priceString}</Text>
            <Text style={styles.priceSub}>· billed annually · cancel any time</Text>
          </View>

          {error.length > 0 && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [styles.btn, busy && styles.btnDisabled, pressed && { opacity: 0.85 }]}
            onPress={handleSubscribe}
            disabled={busy}
          >
            {isPurchasing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="lock-open" size={18} color="#FFFFFF" />
                <Text style={styles.btnText}>Subscribe {priceString}/year</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.restoreBtn, busy && styles.btnDisabled, pressed && { opacity: 0.7 }]}
            onPress={handleRestore}
            disabled={busy}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <Text style={styles.restoreText}>Restore Purchases</Text>
            )}
          </Pressable>

          <Text style={styles.legalText}>
            Payment processed by Apple/Google. Subscription auto-renews annually.{" "}
            <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
              Privacy Policy
            </Text>
          </Text>
        </View>
      </Modal>

      {/* Test-mode purchase confirmation modal */}
      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Test Purchase</Text>
            <Text style={styles.confirmBody}>
              You're in dev/test mode. Confirm a simulated purchase of {priceString}/year?
            </Text>
            <View style={styles.confirmRow}>
              <Pressable
                style={[styles.confirmBtn, styles.confirmCancel]}
                onPress={() => setShowConfirm(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.confirmBtn, styles.confirmOk]} onPress={doPurchase}>
                <Text style={styles.confirmOkText}>Purchase</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    sheet: {
      position: "absolute", bottom: 0, left: 0, right: 0,
      backgroundColor: colors.card,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingTop: 12, paddingHorizontal: 24, gap: 14,
    },
    sheetHandle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: colors.border, alignSelf: "center", marginBottom: 4,
    },
    closeBtn: { position: "absolute", top: 16, right: 20, zIndex: 10, padding: 4 },
    iconWrap: {
      width: 72, height: 72, borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center", alignSelf: "center",
    },
    badgeRow: { alignItems: "center" },
    badge: {
      backgroundColor: colors.secondary, borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 4,
    },
    badgeText: {
      fontSize: 12, color: colors.primary,
      fontFamily: "Inter_700Bold", letterSpacing: 0.5,
    },
    title: {
      fontSize: 22, fontFamily: "Inter_700Bold",
      color: colors.foreground, textAlign: "center",
    },
    subtitle: {
      fontSize: 14, color: colors.mutedForeground,
      textAlign: "center", fontFamily: "Inter_400Regular", lineHeight: 20,
    },
    perksGrid: {
      flexDirection: "row", flexWrap: "wrap", gap: 10,
      backgroundColor: colors.muted, borderRadius: 14, padding: 14,
    },
    perkItem: { flexDirection: "row", alignItems: "center", gap: 6, width: "46%" },
    perkText: { fontSize: 12, color: colors.foreground, fontFamily: "Inter_500Medium", flex: 1 },
    priceRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 6 },
    priceAmount: { fontSize: 24, color: colors.primary, fontFamily: "Inter_700Bold" },
    priceSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    errorText: {
      fontSize: 13, color: colors.destructive,
      fontFamily: "Inter_400Regular", textAlign: "center",
    },
    btn: {
      backgroundColor: colors.primary, borderRadius: 14,
      paddingVertical: 15, alignItems: "center",
      flexDirection: "row", justifyContent: "center", gap: 8,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { fontSize: 16, color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
    restoreBtn: { alignItems: "center", paddingVertical: 4 },
    restoreText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    legalText: {
      fontSize: 11, color: colors.mutedForeground,
      fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 4,
    },
    legalLink: {
      color: colors.primary, textDecorationLine: "underline",
    },
    confirmOverlay: {
      flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
      alignItems: "center", justifyContent: "center",
    },
    confirmBox: {
      backgroundColor: colors.card, borderRadius: 20,
      padding: 24, marginHorizontal: 32, gap: 14,
    },
    confirmTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground, textAlign: "center" },
    confirmBody: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
    confirmRow: { flexDirection: "row", gap: 12 },
    confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
    confirmCancel: { backgroundColor: colors.muted },
    confirmCancelText: { fontSize: 15, color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    confirmOk: { backgroundColor: colors.primary },
    confirmOkText: { fontSize: 15, color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
  });
}
