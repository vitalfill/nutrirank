import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSubscription } from "@/lib/revenuecat";
import { useColors } from "@/hooks/useColors";

const PRIVACY_URL = "https://vital-fill.com/privacy.php";
const APPLE_EULA  = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

const PERKS = [
  { icon: "science", label: "All nutrients unlocked" },
  { icon: "star",    label: "Save favorites" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Billing-period suffix derived from RevenueCat packageType — never hardcoded. */
function periodLabel(packageType: string): string {
  switch (packageType) {
    case "MONTHLY":  return "/month";
    case "ANNUAL":   return "/year";
    case "LIFETIME": return "";
    default:         return "";
  }
}

/** Display name for a package. */
function packageName(packageType: string, identifier: string): string {
  switch (packageType) {
    case "ANNUAL":   return "Annual";
    case "MONTHLY":  return "Monthly";
    case "LIFETIME": return "Lifetime";
    default:         return identifier;
  }
}

/** Sort order so annual appears first, monthly second, lifetime last. */
function sortOrder(packageType: string): number {
  switch (packageType) {
    case "ANNUAL":   return 0;
    case "MONTHLY":  return 1;
    case "LIFETIME": return 2;
    default:         return 99;
  }
}

/** Pluralised unit label for intro-offer period display. */
function unitLabel(unit: string, n: number): string {
  const singular =
    unit === "DAY"   ? "day"   :
    unit === "WEEK"  ? "week"  :
    unit === "MONTH" ? "month" : "year";
  return n === 1 ? singular : `${singular}s`;
}

/**
 * Subtitle line for a package card showing the intro/trial offer.
 * Returns null for LIFETIME or when no introPrice exists.
 */
function introBadgeText(pkg: any): string | null {
  if (pkg.packageType === "LIFETIME") return null;
  const intro = pkg.product?.introPrice;
  if (!intro) return null;
  const n      = intro.periodNumberOfUnits ?? 1;
  const unit   = unitLabel(intro.periodUnit ?? "DAY", n);
  const period = periodLabel(pkg.packageType);
  if (intro.price === 0) {
    return `${n} ${unit} free, then ${pkg.product.priceString}${period}`;
  }
  return `${intro.priceString} for first ${n} ${unit}, then ${pkg.product.priceString}${period}`;
}

/** Primary CTA label — fully derived from the selected package. */
function ctaLabel(pkg: any): string {
  if (!pkg) return "Subscribe";
  const period = periodLabel(pkg.packageType);
  if (pkg.packageType === "LIFETIME") {
    return `Unlock for ${pkg.product.priceString}`;
  }
  const intro = pkg.product?.introPrice;
  if (intro && intro.price === 0) {
    const n    = intro.periodNumberOfUnits ?? 1;
    const unit = unitLabel(intro.periodUnit ?? "DAY", n);
    return `Start ${n}-${unit} free trial`;
  }
  return `Subscribe ${pkg.product.priceString}${period}`;
}

/**
 * Annual savings percentage relative to 12x monthly.
 * Returns null when either price is unavailable or savings ≤ 0.
 */
function annualSavingsPct(annualPkg: any, monthlyPkg: any): number | null {
  const ap: number = annualPkg?.product?.price ?? 0;
  const mp: number = monthlyPkg?.product?.price ?? 0;
  if (!ap || !mp) return null;
  const pct = Math.round((1 - ap / (mp * 12)) * 100);
  return pct > 0 ? pct : null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PaywallModal({ visible, onDismiss }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors, insets);

  const { offerings, purchase, restore, isPurchasing, isRestoring } = useSubscription();

  const [error,       setError]       = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<any>(null);

  // Sorted packages — annual first, monthly second, lifetime last.
  const packages = useMemo(() => {
    const all = offerings?.current?.availablePackages ?? [];
    return [...all].sort((a, b) => sortOrder(a.packageType) - sortOrder(b.packageType));
  }, [offerings]);

  // Default-select ANNUAL if present; otherwise the first available package.
  const defaultPkg = useMemo(
    () => packages.find(p => p.packageType === "ANNUAL") ?? packages[0] ?? null,
    [packages],
  );

  // selectedPkg is null until the user taps; fall back to the computed default.
  const resolvedSelected: any = selectedPkg ?? defaultPkg;

  const annualPkg  = packages.find(p => p.packageType === "ANNUAL");
  const monthlyPkg = packages.find(p => p.packageType === "MONTHLY");
  const savings    = annualSavingsPct(annualPkg, monthlyPkg);

  const isLifetime     = resolvedSelected?.packageType === "LIFETIME";
  const isSubscription = !!resolvedSelected && !isLifetime;

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleSubscribe() {
    if (!resolvedSelected) {
      setError("Subscription package not available. Try again shortly.");
      return;
    }
    if (__DEV__) { setShowConfirm(true); return; }
    await doPurchase();
  }

  async function doPurchase() {
    setError("");
    setShowConfirm(false);
    try {
      await purchase(resolvedSelected);
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
    setSelectedPkg(null);
    onDismiss();
  }

  const busy = isPurchasing || isRestoring;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <Pressable style={styles.overlay} onPress={handleClose} />

        <View style={[styles.sheet, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }]}>
          <View style={styles.sheetHandle} />

          <Pressable style={styles.closeBtn} onPress={handleClose}>
            <Ionicons name="close" size={22} color={colors.mutedForeground} />
          </Pressable>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Header */}
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

            {/* Perks grid */}
            <View style={styles.perksGrid}>
              {PERKS.map(p => (
                <View key={p.label} style={styles.perkItem}>
                  <MaterialIcons name={p.icon as any} size={18} color={colors.primary} />
                  <Text style={styles.perkText}>{p.label}</Text>
                </View>
              ))}
            </View>

            {/* Package cards */}
            {packages.length === 0 ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading plans…</Text>
              </View>
            ) : (
              <View style={styles.pkgList}>
                {packages.map(pkg => {
                  const isSelected  = resolvedSelected?.identifier === pkg.identifier;
                  const isAnnual    = pkg.packageType === "ANNUAL";
                  const isLife      = pkg.packageType === "LIFETIME";
                  const badgeLabel  = isAnnual ? "Best value" : isLife ? "Pay once" : null;
                  const savingsBadge = isAnnual && savings ? `Save ${savings}%` : null;
                  const intro       = introBadgeText(pkg);
                  const period      = periodLabel(pkg.packageType);

                  return (
                    <Pressable
                      key={pkg.identifier}
                      style={[styles.pkgCard, isSelected && styles.pkgCardSelected]}
                      onPress={() => setSelectedPkg(pkg)}
                    >
                      {/* Selected check */}
                      <View style={styles.pkgCheck}>
                        <MaterialIcons
                          name={isSelected ? "check-circle" : "radio-button-unchecked"}
                          size={20}
                          color={isSelected ? colors.primary : colors.border}
                        />
                      </View>

                      {/* Labels */}
                      <View style={styles.pkgMid}>
                        <View style={styles.pkgLabelRow}>
                          <Text style={[styles.pkgName, isSelected && styles.pkgNameSelected]}>
                            {packageName(pkg.packageType, pkg.identifier)}
                          </Text>
                          {badgeLabel && (
                            <View style={[styles.pkgBadge, isSelected && styles.pkgBadgeSelected]}>
                              <Text style={[styles.pkgBadgeText, isSelected && styles.pkgBadgeTextSel]}>
                                {badgeLabel}
                              </Text>
                            </View>
                          )}
                          {savingsBadge && (
                            <View style={styles.savingsBadge}>
                              <Text style={styles.savingsBadgeText}>{savingsBadge}</Text>
                            </View>
                          )}
                        </View>
                        {isLife ? (
                          <Text style={styles.pkgSub}>One-time purchase · lifetime access</Text>
                        ) : intro ? (
                          <Text style={styles.pkgSub}>{intro}</Text>
                        ) : null}
                      </View>

                      {/* Price */}
                      <View style={styles.pkgRight}>
                        <Text style={[styles.pkgPrice, isSelected && styles.pkgPriceSelected]}>
                          {pkg.product.priceString}
                        </Text>
                        {period ? <Text style={styles.pkgPeriod}>{period}</Text> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {error.length > 0 && <Text style={styles.errorText}>{error}</Text>}
          </ScrollView>

          {/* Fixed bottom actions */}
          <View style={styles.bottomActions}>
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                (busy || !resolvedSelected) && styles.btnDisabled,
                pressed && { opacity: 0.85 },
              ]}
              onPress={handleSubscribe}
              disabled={busy || !resolvedSelected}
            >
              {isPurchasing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="lock-open" size={18} color="#FFFFFF" />
                  <Text style={styles.btnText}>{ctaLabel(resolvedSelected)}</Text>
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
              {isSubscription
                ? `Payment processed by Apple/Google. Subscription auto-renews ${
                    resolvedSelected?.packageType === "ANNUAL" ? "annually" :
                    resolvedSelected?.packageType === "MONTHLY" ? "monthly" : "automatically"
                  }. `
                : "One-time purchase. No recurring charges. "}
              <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
                Privacy Policy
              </Text>
              {" · "}
              <Text style={styles.legalLink} onPress={() => Linking.openURL(APPLE_EULA)}>
                EULA
              </Text>
            </Text>
          </View>
        </View>
      </Modal>

      {/* Dev / test-mode purchase confirmation */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Test Purchase</Text>
            <Text style={styles.confirmBody}>
              Dev mode. Confirm a simulated{" "}
              {resolvedSelected?.packageType === "LIFETIME" ? "one-time" :
               resolvedSelected?.packageType === "ANNUAL"   ? "annual"   :
               resolvedSelected?.packageType === "MONTHLY"  ? "monthly"  : ""}{" "}
              purchase of {resolvedSelected?.product?.priceString ?? "this plan"}?
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

// ── Styles ────────────────────────────────────────────────────────────────────

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
      paddingTop: 12,
      maxHeight: "92%",
    },
    sheetHandle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: colors.border, alignSelf: "center", marginBottom: 4,
    },
    closeBtn: { position: "absolute", top: 16, right: 20, zIndex: 10, padding: 4 },

    scroll: { flexShrink: 1 },
    scrollContent: {
      paddingHorizontal: 24, paddingTop: 4, paddingBottom: 8, gap: 12,
    },

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

    // Package cards
    pkgList: { gap: 8 },
    pkgCard: {
      flexDirection: "row", alignItems: "center",
      borderWidth: 1.5, borderColor: colors.border,
      borderRadius: 14, padding: 12, gap: 10,
      backgroundColor: colors.background,
    },
    pkgCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.secondary,
    },
    pkgCheck: { width: 22, alignItems: "center" },
    pkgMid: { flex: 1, gap: 3 },
    pkgLabelRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
    pkgName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    pkgNameSelected: { color: colors.primary },
    pkgBadge: {
      backgroundColor: colors.muted, borderRadius: 8,
      paddingHorizontal: 7, paddingVertical: 2,
    },
    pkgBadgeSelected: { backgroundColor: colors.primary },
    pkgBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground },
    pkgBadgeTextSel: { color: "#FFFFFF" },
    savingsBadge: {
      backgroundColor: "#16a34a22", borderRadius: 8,
      paddingHorizontal: 7, paddingVertical: 2,
    },
    savingsBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#16a34a" },
    pkgSub: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    pkgRight: { alignItems: "flex-end", minWidth: 60 },
    pkgPrice: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground },
    pkgPriceSelected: { color: colors.primary },
    pkgPeriod: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },

    loadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8 },
    loadingText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },

    errorText: {
      fontSize: 13, color: colors.destructive,
      fontFamily: "Inter_400Regular", textAlign: "center",
    },

    // Fixed bottom actions (outside the scroll)
    bottomActions: { paddingHorizontal: 24, paddingTop: 8, gap: 10 },
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
    legalLink: { color: colors.primary, textDecorationLine: "underline" },

    // Dev confirmation modal
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
