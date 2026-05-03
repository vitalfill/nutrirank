import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SUBSCRIPTION_PRICE, STRIPE_CHECKOUT_URL, STRIPE_VERIFY_URL } from "@/constants/api";
import { useColors } from "@/hooks/useColors";
import { Subscription } from "@/types";

interface Props {
  visible: boolean;
  onSubscribed: (sub: Subscription) => void;
  onDismiss: () => void;
}

const PERKS = [
  { icon: "science",       label: "All nutrients unlocked" },
  { icon: "leaderboard",   label: "Unlimited pages" },
  { icon: "star",          label: "Save favorites" },
  { icon: "update",        label: "Annual — cancel any time" },
];

export default function PaywallModal({ visible, onSubscribed, onDismiss }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors, insets);

  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"offer" | "verify">("offer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function isValidEmail(e: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  }

  async function handleSubscribe() {
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(STRIPE_CHECKOUT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.success && data.url) {
        await WebBrowser.openBrowserAsync(data.url);
        setStep("verify");
      } else {
        setError(data.message || "Could not open checkout. Try again.");
      }
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!isValidEmail(email)) {
      setError("Please enter the email you used to subscribe.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(STRIPE_VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.subscribed) {
        onSubscribed({ email: email.trim().toLowerCase(), expiresAt: data.expires_at ?? Date.now() / 1000 + 365 * 86400 });
      } else {
        setError("No active subscription found for this email. Complete the checkout first.");
      }
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setStep("offer");
    setError("");
    onDismiss();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={[styles.sheet, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }]}>
          <View style={styles.sheetHandle} />

          {/* Close */}
          <Pressable style={styles.closeBtn} onPress={handleClose}>
            <Ionicons name="close" size={22} color={colors.mutedForeground} />
          </Pressable>

          {/* Icon + badge */}
          <View style={styles.iconWrap}>
            <MaterialIcons name="eco" size={36} color="#FFFFFF" />
          </View>

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>NutriRank Pro</Text>
            </View>
          </View>

          <Text style={styles.title}>
            {step === "offer" ? "Unlock All Nutrients" : "Verify Your Subscription"}
          </Text>
          <Text style={styles.subtitle}>
            {step === "offer"
              ? `Get unlimited access to every nutrient, all food groups, and saved favorites for just ${SUBSCRIPTION_PRICE}.`
              : "Complete checkout in your browser, then come back here to verify."}
          </Text>

          {/* Perks */}
          {step === "offer" && (
            <View style={styles.perksGrid}>
              {PERKS.map(p => (
                <View key={p.label} style={styles.perkItem}>
                  <MaterialIcons name={p.icon as any} size={18} color={colors.primary} />
                  <Text style={styles.perkText}>{p.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Price chip */}
          {step === "offer" && (
            <View style={styles.priceRow}>
              <Text style={styles.priceAmount}>{SUBSCRIPTION_PRICE}</Text>
              <Text style={styles.priceSub}>· billed annually · cancel any time</Text>
            </View>
          )}

          {/* Email */}
          <View style={styles.inputWrap}>
            <MaterialIcons name="email" size={18} color={colors.mutedForeground} />
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={t => { setEmail(t); setError(""); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={step === "offer" ? handleSubscribe : handleVerify}
            />
          </View>

          {error.length > 0 && <Text style={styles.errorText}>{error}</Text>}

          {/* CTA */}
          <Pressable
            style={({ pressed }) => [styles.btn, loading && styles.btnDisabled, pressed && { opacity: 0.85 }]}
            onPress={step === "offer" ? handleSubscribe : handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : step === "offer" ? (
              <>
                <MaterialIcons name="lock-open" size={18} color="#FFFFFF" />
                <Text style={styles.btnText}>Subscribe with Stripe</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="verified" size={18} color="#FFFFFF" />
                <Text style={styles.btnText}>Verify Subscription</Text>
              </>
            )}
          </Pressable>

          {step === "verify" && (
            <Pressable onPress={() => setStep("offer")}>
              <Text style={styles.backText}>← Go back to subscribe</Text>
            </Pressable>
          )}

          <Text style={styles.legalText}>
            Secure payment via Stripe. Your data is never shared.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 12,
      paddingHorizontal: 24,
      gap: 14,
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
    perkItem: {
      flexDirection: "row", alignItems: "center", gap: 6,
      width: "46%",
    },
    perkText: {
      fontSize: 12, color: colors.foreground, fontFamily: "Inter_500Medium", flex: 1,
    },
    priceRow: {
      flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 6,
    },
    priceAmount: {
      fontSize: 24, color: colors.primary, fontFamily: "Inter_700Bold",
    },
    priceSub: {
      fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular",
    },
    inputWrap: {
      flexDirection: "row", alignItems: "center", gap: 10,
      borderWidth: 1.5, borderColor: colors.border,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
      backgroundColor: colors.card,
    },
    input: {
      flex: 1, fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular",
    },
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
    btnText: {
      fontSize: 16, color: "#FFFFFF", fontFamily: "Inter_600SemiBold",
    },
    backText: {
      fontSize: 13, color: colors.mutedForeground,
      fontFamily: "Inter_400Regular", textAlign: "center",
    },
    legalText: {
      fontSize: 11, color: colors.mutedForeground,
      fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 4,
    },
  });
}
