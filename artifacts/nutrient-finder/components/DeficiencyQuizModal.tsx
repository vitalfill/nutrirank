import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
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
import { QUIZ_QUESTIONS, NUTR_LABELS } from "@/constants/quizData";
import { Nutrient } from "@/types";

interface Props {
  visible: boolean;
  nutrients: Nutrient[];
  onSelectNutrient: (n: Nutrient) => void;
  onClose: () => void;
}

type Answers = Record<string, string[]>; // questionId → selected option labels

export default function DeficiencyQuizModal({ visible, nutrients, onSelectNutrient, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors, insets);

  const [step, setStep] = useState<"quiz" | "results">("quiz");
  const [answers, setAnswers] = useState<Answers>({});
  const [results, setResults] = useState<Array<{ nutrNo: string; label: string; count: number }>>([]);

  function toggleAnswer(qId: string, label: string, multi: boolean) {
    setAnswers(prev => {
      const current = prev[qId] ?? [];
      if (multi) {
        if (label === "None of these") return { ...prev, [qId]: ["None of these"] };
        const without = current.filter(l => l !== "None of these");
        if (without.includes(label)) return { ...prev, [qId]: without.filter(l => l !== label) };
        return { ...prev, [qId]: [...without, label] };
      }
      return { ...prev, [qId]: [label] };
    });
  }

  function computeResults() {
    const tally: Record<string, number> = {};
    QUIZ_QUESTIONS.forEach(q => {
      const chosen = answers[q.id] ?? [];
      q.options.forEach(opt => {
        if (chosen.includes(opt.label)) {
          opt.nutrients.forEach(n => { tally[n] = (tally[n] ?? 0) + 1; });
        }
      });
    });
    const sorted = Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([nutrNo, count]) => ({ nutrNo, label: NUTR_LABELS[nutrNo] ?? nutrNo, count }));
    setResults(sorted);
    setStep("results");
  }

  function handleReset() {
    setAnswers({});
    setResults([]);
    setStep("quiz");
  }

  function handlePickNutrient(nutrNo: string) {
    const n = nutrients.find(x => x.Nutr_No === nutrNo);
    if (n) {
      onSelectNutrient(n);
      onClose();
    }
  }

  const allAnswered = QUIZ_QUESTIONS.every(q => (answers[q.id] ?? []).length > 0);

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
            <MaterialIcons name="quiz" size={20} color={colors.accent} />
            <Text style={styles.title}>Deficiency Check</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        {step === "quiz" && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === "web" ? 40 : insets.bottom + 40 }]}
          >
            {/* Intro */}
            <View style={styles.introBanner}>
              <Text style={styles.introText}>
                Answer 5 quick questions about your diet and lifestyle to get personalized nutrient recommendations.
              </Text>
            </View>

            {QUIZ_QUESTIONS.map((q, qi) => (
              <View key={q.id} style={styles.questionCard}>
                <Text style={styles.questionNum}>Question {qi + 1} of {QUIZ_QUESTIONS.length}</Text>
                <Text style={styles.questionText}>{q.question}</Text>
                {q.multi && <Text style={styles.multiHint}>Select all that apply</Text>}
                <View style={styles.optionsList}>
                  {q.options.map(opt => {
                    const selected = (answers[q.id] ?? []).includes(opt.label);
                    return (
                      <Pressable
                        key={opt.label}
                        style={({ pressed }) => [
                          styles.optionBtn,
                          selected && styles.optionBtnSelected,
                          pressed && { opacity: 0.7 },
                        ]}
                        onPress={() => toggleAnswer(q.id, opt.label, !!q.multi)}
                      >
                        <View style={[styles.optionCheck, selected && styles.optionCheckSelected]}>
                          {selected && <MaterialIcons name="check" size={12} color="#FFFFFF" />}
                        </View>
                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}

            <Pressable
              style={({ pressed }) => [styles.submitBtn, !allAnswered && styles.submitBtnDisabled, pressed && { opacity: 0.85 }]}
              onPress={computeResults}
              disabled={!allAnswered}
            >
              <MaterialIcons name="insights" size={18} color="#FFFFFF" />
              <Text style={styles.submitText}>See My Recommendations</Text>
            </Pressable>
          </ScrollView>
        )}

        {step === "results" && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === "web" ? 40 : insets.bottom + 40 }]}
          >
            <View style={styles.resultsBanner}>
              <MaterialIcons name="lightbulb" size={28} color={colors.gold} />
              <Text style={styles.resultsTitle}>Your Priority Nutrients</Text>
              <Text style={styles.resultsSub}>
                Based on your answers, consider exploring these nutrients first.
              </Text>
            </View>

            {results.length === 0 ? (
              <View style={styles.noResult}>
                <MaterialIcons name="check-circle" size={44} color={colors.primary} />
                <Text style={styles.noResultText}>
                  Your diet looks well-rounded! No specific deficiencies flagged.
                </Text>
              </View>
            ) : (
              results.map((r, i) => (
                <Pressable
                  key={r.nutrNo}
                  style={({ pressed }) => [styles.resultCard, pressed && { opacity: 0.8 }]}
                  onPress={() => handlePickNutrient(r.nutrNo)}
                >
                  <View style={styles.resultRank}>
                    <Text style={styles.resultRankText}>{i + 1}</Text>
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{r.label}</Text>
                    <Text style={styles.resultHint}>Tap to search top food sources →</Text>
                  </View>
                  <MaterialIcons name="arrow-forward-ios" size={14} color={colors.mutedForeground} />
                </Pressable>
              ))
            )}

            <View style={styles.disclaimer}>
              <MaterialIcons name="info-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.disclaimerText}>
                This quiz is for educational purposes only and does not constitute medical advice. Consult a healthcare professional before making dietary changes.
              </Text>
            </View>

            <Pressable style={styles.retakeBtn} onPress={handleReset}>
              <Text style={styles.retakeText}>Retake Quiz</Text>
            </Pressable>
          </ScrollView>
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
    scroll: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
    introBanner: {
      backgroundColor: colors.infoBox, borderWidth: 1, borderColor: colors.infoBoxBorder,
      borderRadius: 14, padding: 14,
    },
    introText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20 },
    questionCard: {
      backgroundColor: colors.card, borderRadius: 14,
      borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10,
    },
    questionNum: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6 },
    questionText: { fontSize: 15, color: colors.foreground, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
    multiHint: { fontSize: 11, color: colors.accent, fontFamily: "Inter_500Medium" },
    optionsList: { gap: 8 },
    optionBtn: {
      flexDirection: "row", alignItems: "center", gap: 10,
      borderWidth: 1.5, borderColor: colors.border,
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
      backgroundColor: colors.background,
    },
    optionBtnSelected: {
      borderColor: colors.primary, backgroundColor: colors.secondary,
    },
    optionCheck: {
      width: 20, height: 20, borderRadius: 10, borderWidth: 2,
      borderColor: colors.border, alignItems: "center", justifyContent: "center",
    },
    optionCheckSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    optionText: { flex: 1, fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular" },
    optionTextSelected: { color: colors.primary, fontFamily: "Inter_500Medium" },
    submitBtn: {
      backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15,
      alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8,
      marginTop: 6,
    },
    submitBtnDisabled: { opacity: 0.45 },
    submitText: { fontSize: 16, color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
    resultsBanner: {
      backgroundColor: colors.card, borderRadius: 14,
      borderWidth: 1, borderColor: colors.border,
      padding: 18, alignItems: "center", gap: 8,
    },
    resultsTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground },
    resultsSub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    noResult: { alignItems: "center", gap: 12, paddingVertical: 40 },
    noResultText: { fontSize: 15, color: colors.foreground, fontFamily: "Inter_500Medium", textAlign: "center" },
    resultCard: {
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: colors.card, borderRadius: 14,
      borderWidth: 1, borderColor: colors.border, padding: 14,
    },
    resultRank: {
      width: 32, height: 32, borderRadius: 10,
      backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
    },
    resultRankText: { fontSize: 14, color: "#FFFFFF", fontFamily: "Inter_700Bold" },
    resultInfo: { flex: 1, gap: 2 },
    resultName: { fontSize: 15, color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    resultHint: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    disclaimer: {
      flexDirection: "row", alignItems: "flex-start", gap: 8,
      backgroundColor: colors.muted, borderRadius: 10, padding: 12,
    },
    disclaimerText: {
      flex: 1, fontSize: 12, color: colors.mutedForeground,
      fontFamily: "Inter_400Regular", lineHeight: 18,
    },
    retakeBtn: {
      borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
      paddingVertical: 12, alignItems: "center",
    },
    retakeText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
  });
}
