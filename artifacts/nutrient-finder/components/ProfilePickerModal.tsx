import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { UserProfile, PROFILE_LABELS } from "@/constants/userProfile";

interface Props {
  visible: boolean;
  current: UserProfile;
  onSelect: (profile: UserProfile) => void;
  onClose: () => void;
}

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

const PROFILES: { key: UserProfile; icon: IconName; desc: string }[] = [
  {
    key: "male",
    icon: "person",
    desc: "Adult male RDAs — e.g. Iron 8 mg, ALA 1.6 g, Potassium 3,400 mg",
  },
  {
    key: "female",
    icon: "person-outline",
    desc: "Adult female RDAs — e.g. Iron 18 mg, ALA 1.1 g, Potassium 2,600 mg",
  },
  {
    key: "pregnant",
    icon: "child-care",
    desc: "Pregnant / Lactating — higher needs (e.g. Iron 27 mg, Folate 600 mcg, ALA 1.4 g)",
  },
];

export default function ProfilePickerModal({ visible, current, onSelect, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[styles.sheet, { paddingBottom: Platform.OS === "web" ? 24 : insets.bottom + 12 }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Nutritional Profile</Text>
          <Text style={styles.subtitle}>
            Selects gender-specific daily values (% DV) based on FDA Dietary Reference Intakes
          </Text>

          <View style={styles.optionList}>
            {PROFILES.map(p => {
              const isSelected = p.key === current;
              return (
                <Pressable
                  key={p.key}
                  style={({ pressed }) => [
                    styles.option,
                    isSelected && styles.optionSelected,
                    pressed && styles.optionPressed,
                  ]}
                  onPress={() => { onSelect(p.key); onClose(); }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                >
                  <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                    <MaterialIcons
                      name={p.icon}
                      size={22}
                      color={isSelected ? "#FFFFFF" : colors.primary}
                    />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {PROFILE_LABELS[p.key]}
                    </Text>
                    <Text style={styles.optionDesc}>{p.desc}</Text>
                  </View>
                  {isSelected && (
                    <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 22, borderTopRightRadius: 22,
      paddingTop: 12, paddingHorizontal: 20,
    },
    handle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: colors.border, alignSelf: "center", marginBottom: 12,
    },
    title: {
      fontSize: 17, fontFamily: "Inter_700Bold",
      color: colors.foreground, textAlign: "center",
    },
    subtitle: {
      fontSize: 12, fontFamily: "Inter_400Regular",
      color: colors.mutedForeground, textAlign: "center",
      marginTop: 4, marginBottom: 14, lineHeight: 16,
    },
    optionList: { gap: 10, paddingBottom: 6 },
    option: {
      flexDirection: "row", alignItems: "center", gap: 12,
      padding: 14, borderRadius: 14,
      borderWidth: 1.5, borderColor: colors.border,
      backgroundColor: colors.background,
    },
    optionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.secondary,
    },
    optionPressed: { opacity: 0.7 },
    iconWrap: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: colors.secondary,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    iconWrapSelected: { backgroundColor: colors.primary },
    optionText: { flex: 1, gap: 3 },
    optionLabel: {
      fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground,
    },
    optionLabelSelected: { color: colors.primary },
    optionDesc: {
      fontSize: 11, fontFamily: "Inter_400Regular",
      color: colors.mutedForeground, lineHeight: 15,
    },
  });
}
