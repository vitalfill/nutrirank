import { Ionicons, MaterialIcons } from "@expo/vector-icons";
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

import { API_BASE } from "@/constants/api";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onUnlock: (email: string) => void;
  onDismiss: () => void;
}

export default function EmailGateModal({ visible, onUnlock, onDismiss }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors, insets);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiError, setApiError] = useState(false);

  function isValidEmail(e: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  }

  async function handleSubmit() {
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    setApiError(false);
    try {
      const res = await fetch(`${API_BASE}/register-email.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.success) {
        onUnlock(email.trim().toLowerCase());
      } else {
        setError(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      setApiError(true);
      onUnlock(email.trim().toLowerCase());
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        <View style={[styles.sheet, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.iconWrap}>
            <Ionicons name="leaf" size={36} color={colors.primary} />
          </View>

          <Text style={styles.title}>Unlock Full Access</Text>
          <Text style={styles.subtitle}>
            You've explored {2} pages of results. Enter your email to unlock
            unlimited nutrient searches — completely free.
          </Text>

          <View style={styles.perksRow}>
            {["Unlimited pages", "All nutrients", "All food groups"].map(perk => (
              <View key={perk} style={styles.perkItem}>
                <MaterialIcons name="check-circle" size={14} color={colors.accent} />
                <Text style={styles.perkText}>{perk}</Text>
              </View>
            ))}
          </View>

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
              onSubmitEditing={handleSubmit}
            />
          </View>

          {error.length > 0 && <Text style={styles.errorText}>{error}</Text>}

          {apiError && (
            <Text style={styles.warningText}>
              Could not reach the server — you've been unlocked offline.
            </Text>
          )}

          <Pressable
            style={({ pressed }) => [styles.btn, loading && styles.btnDisabled, pressed && { opacity: 0.8 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.btnText}>Unlock Free Access</Text>
            )}
          </Pressable>

          <Text style={styles.legalText}>
            No spam, ever. We only use your email to provide access.
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
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
      paddingHorizontal: 24,
      gap: 14,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: 4,
    },
    iconWrap: {
      width: 68,
      height: 68,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
    },
    title: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center",
      fontFamily: "Inter_400Regular",
      lineHeight: 20,
    },
    perksRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      backgroundColor: colors.muted,
      borderRadius: 12,
      padding: 12,
    },
    perkItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    perkText: {
      fontSize: 12,
      color: colors.foreground,
      fontFamily: "Inter_500Medium",
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      backgroundColor: colors.card,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    errorText: {
      fontSize: 13,
      color: colors.destructive,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
    },
    warningText: {
      fontSize: 12,
      color: colors.gold,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
    },
    btn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
    },
    btnDisabled: { opacity: 0.6 },
    btnText: {
      fontSize: 16,
      color: "#FFFFFF",
      fontFamily: "Inter_600SemiBold",
    },
    legalText: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      marginBottom: 4,
    },
  });
}
