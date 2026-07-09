import { MaterialIcons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import ResponsiveContainer from "@/components/ResponsiveContainer";
import {
  UserProfile, Sex, AgeGroup, PregnancyStatus,
  AGE_GROUPS, pregnancyAllowed, getProfileLabel,
} from "@/constants/userProfile";

interface Props {
  visible:  boolean;
  current:  UserProfile;
  onSelect: (profile: UserProfile) => void;
  onClose:  () => void;
}

export default function ProfilePickerModal({ visible, current, onSelect, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);

  const [draft, setDraft] = useState<UserProfile>(current);

  useEffect(() => { if (visible) setDraft(current); }, [visible, current]);

  function update(changes: Partial<UserProfile>) {
    setDraft(prev => {
      const next: UserProfile = { ...prev, ...changes };
      if (next.sex === "male" || !pregnancyAllowed(next.age)) next.pregnancy = "none";
      return next;
    });
  }

  function apply() { onSelect(draft); onClose(); }

  const showPregnancy = draft.sex === "female" && pregnancyAllowed(draft.age);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <ResponsiveContainer
          style={[styles.sheet, { paddingBottom: Platform.OS === "web" ? 24 : insets.bottom + 8 }]}
        >
        <View
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Nutritional Profile</Text>
          <Text style={styles.subtitle}>
            Personalises % DV using NIH Dietary Reference Intakes by sex, age &amp; status
          </Text>

          {/* Sex */}
          <SectionLabel label="BIOLOGICAL SEX" colors={colors} />
          <View style={styles.row}>
            {(["male", "female"] as Sex[]).map(s => {
              const active = draft.sex === s;
              return (
                <Pressable
                  key={s}
                  style={[styles.toggleBtn, active && styles.toggleBtnActive]}
                  onPress={() => update({ sex: s })}
                >
                  <MaterialIcons
                    name={s === "male" ? "person" : "person-outline"}
                    size={18}
                    color={active ? "#fff" : colors.primary}
                  />
                  <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>
                    {s === "male" ? "Male" : "Female"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Age */}
          <SectionLabel label="AGE GROUP" colors={colors} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {AGE_GROUPS.map(age => {
                const active = draft.age === age;
                return (
                  <Pressable
                    key={age}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => update({ age })}
                  >
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                      {age}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Pregnancy / lactation */}
          {showPregnancy && (
            <>
              <SectionLabel label="STATUS" colors={colors} />
              <View style={styles.row}>
                {([
                  { key: "none" as PregnancyStatus,      label: "Not Pregnant" },
                  { key: "pregnant" as PregnancyStatus,  label: "Pregnant"     },
                  { key: "lactating" as PregnancyStatus, label: "Lactating"    },
                ]).map(opt => {
                  const active = draft.pregnancy === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      style={[styles.statusBtn, active && styles.statusBtnActive]}
                      onPress={() => update({ pregnancy: opt.key })}
                    >
                      <Text style={[styles.statusLabel, active && styles.statusLabelActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* Preview */}
          <View style={styles.preview}>
            <MaterialIcons name="info-outline" size={14} color={colors.mutedForeground} />
            <Text style={styles.previewText}>
              DV based on:{" "}
              <Text style={styles.previewBold}>{getProfileLabel(draft)}</Text>
            </Text>
          </View>

          {/* Apply */}
          <Pressable
            style={({ pressed }) => [styles.applyBtn, pressed && { opacity: 0.8 }]}
            onPress={apply}
          >
            <Text style={styles.applyLabel}>Apply</Text>
          </Pressable>
        </View>
        </ResponsiveContainer>
      </Pressable>
    </Modal>
  );
}

function SectionLabel({ label, colors }: { label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={{
      fontSize: 11, fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground, letterSpacing: 0.8,
      marginTop: 14, marginBottom: 6,
    }}>
      {label}
    </Text>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingTop: 10, paddingHorizontal: 20,
    },
    handle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: colors.border, alignSelf: "center", marginBottom: 14,
    },
    title: {
      fontSize: 17, fontFamily: "Inter_700Bold",
      color: colors.foreground, textAlign: "center",
    },
    subtitle: {
      fontSize: 12, fontFamily: "Inter_400Regular",
      color: colors.mutedForeground, textAlign: "center",
      marginTop: 4, lineHeight: 16,
    },
    row: { flexDirection: "row", gap: 10 },
    toggleBtn: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 6, paddingVertical: 10, borderRadius: 12,
      borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background,
    },
    toggleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    toggleLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.primary },
    toggleLabelActive: { color: "#fff" },
    chipScroll: { marginHorizontal: -4 },
    chipRow: { flexDirection: "row", gap: 8, paddingHorizontal: 4, paddingVertical: 2 },
    chip: {
      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
      borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    chipLabelActive: { color: "#fff" },
    statusBtn: {
      flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 12,
      borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background,
    },
    statusBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    statusLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    statusLabelActive: { color: "#fff" },
    preview: {
      flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: colors.muted, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 8, marginTop: 16,
    },
    previewText: {
      fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground,
    },
    previewBold: { fontFamily: "Inter_600SemiBold", color: colors.foreground },
    applyBtn: {
      backgroundColor: colors.primary, borderRadius: 14,
      paddingVertical: 14, alignItems: "center", marginTop: 12,
    },
    applyLabel: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  });
}
