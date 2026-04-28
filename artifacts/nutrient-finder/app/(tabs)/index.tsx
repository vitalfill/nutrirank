import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE, FREE_PAGES_LIMIT } from "@/constants/api";
import { getNutrientInfo } from "@/constants/nutrientsData";
import EmailGateModal from "@/components/EmailGateModal";
import FoodGroupPicker from "@/components/FoodGroupPicker";
import NutrientInfoBox from "@/components/NutrientInfoBox";
import NutrientPickerModal from "@/components/NutrientPickerModal";
import ResultCard from "@/components/ResultCard";
import { useColors } from "@/hooks/useColors";
import { FoodGroup, FoodResult, Nutrient, SearchResponse } from "@/types";

const UNLOCK_KEY = "nutrient_finder_unlocked_email";
const DEBOUNCE_MS = 600;

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors, insets);

  const [selectedNutrient, setSelectedNutrient] = useState<Nutrient | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [showGate, setShowGate] = useState(false);
  const [unlockedEmail, setUnlockedEmail] = useState<string | null>(null);

  const isUnlocked = unlockedEmail !== null;

  const [debouncedNutrient, setDebouncedNutrient] = useState<Nutrient | null>(null);
  const [debouncedGroups, setDebouncedGroups] = useState<string[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(UNLOCK_KEY).then(val => {
      if (val) setUnlockedEmail(val);
    });
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedNutrient(selectedNutrient);
      setDebouncedGroups(selectedGroupIds);
      setPage(1);
    }, DEBOUNCE_MS);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [selectedNutrient, selectedGroupIds]);

  const { data: nutrients = [], isLoading: nutrientsLoading, isError: nutrientsError } = useQuery<Nutrient[]>({
    queryKey: ["nutrients"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/nutrients.php`);
      const data = await res.json();
      return data.nutrients ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });

  const { data: foodGroups = [], isLoading: groupsLoading } = useQuery<FoodGroup[]>({
    queryKey: ["food-groups"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/food-groups.php`);
      const data = await res.json();
      return data.groups ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });

  const canSearch = !!debouncedNutrient && debouncedGroups.length > 0;

  const {
    data: searchData,
    isLoading: searchLoading,
    isFetching: searchFetching,
    isError: searchError,
    refetch: refetchSearch,
  } = useQuery<SearchResponse>({
    queryKey: ["search", debouncedNutrient?.Nutr_No, debouncedGroups, page],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/search.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nutrient_no: debouncedNutrient!.Nutr_No,
          food_groups: debouncedGroups,
          page,
        }),
      });
      return res.json();
    },
    enabled: canSearch,
    staleTime: 1000 * 60 * 5,
  });

  const nutrientInfo = selectedNutrient ? getNutrientInfo(selectedNutrient.Nutr_No) : null;
  const dailyValue = nutrientInfo?.dailyValue?.dv;

  function handlePageChange(newPage: number) {
    if (newPage > FREE_PAGES_LIMIT && !isUnlocked) {
      setShowGate(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPage(newPage);
  }

  async function handleUnlock(email: string) {
    setUnlockedEmail(email);
    setShowGate(false);
    await AsyncStorage.setItem(UNLOCK_KEY, email);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const renderResult = useCallback(({ item, index }: { item: FoodResult; index: number }) => (
    <ResultCard
      item={item}
      rank={(page - 1) * 10 + index + 1}
      nutrientLabel={searchData?.nutrient.NutrDesc ?? ""}
      units={searchData?.nutrient.Units ?? ""}
      nutrNo={debouncedNutrient?.Nutr_No ?? ""}
      dailyValue={dailyValue}
    />
  ), [page, searchData, debouncedNutrient, dailyValue]);

  const ListHeader = useCallback(() => (
    <View style={styles.listHeader}>
      {searchData && (
        <Text style={styles.resultsCount}>
          {searchData.total.toLocaleString()} foods found · Page {page} of {searchData.total_pages}
        </Text>
      )}
    </View>
  ), [searchData, page, styles]);

  const ListFooter = useCallback(() => {
    if (!searchData || searchData.total_pages <= 1) return null;
    return (
      <View style={styles.pagination}>
        <Pressable
          style={({ pressed }) => [
            styles.pageBtn,
            page === 1 && styles.pageBtnDisabled,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => handlePageChange(page - 1)}
          disabled={page === 1}
        >
          <MaterialIcons name="chevron-left" size={20} color={page === 1 ? colors.mutedForeground : colors.primary} />
          <Text style={[styles.pageBtnText, page === 1 && styles.pageBtnTextDisabled]}>Prev</Text>
        </Pressable>

        <View style={styles.pageIndicator}>
          <Text style={styles.pageText}>{page}</Text>
          <Text style={styles.pageSep}>/</Text>
          <Text style={styles.pageTotalText}>{searchData.total_pages}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.pageBtn,
            page === searchData.total_pages && styles.pageBtnDisabled,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => handlePageChange(page + 1)}
          disabled={page === searchData.total_pages}
        >
          <Text style={[styles.pageBtnText, page === searchData.total_pages && styles.pageBtnTextDisabled]}>Next</Text>
          <MaterialIcons name="chevron-right" size={20} color={page === searchData.total_pages ? colors.mutedForeground : colors.primary} />
        </Pressable>
      </View>
    );
  }, [searchData, page, colors, styles]);

  const EmptyOrPrompt = useCallback(() => {
    if (searchError) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="error-outline" size={44} color={colors.destructive} />
          <Text style={styles.emptyTitle}>Connection Error</Text>
          <Text style={styles.emptyText}>Could not reach drgily.com. Check your internet connection.</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetchSearch()}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }
    if (!selectedNutrient) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="search" size={44} color={colors.warmAccent} />
          <Text style={styles.emptyTitle}>Select a Nutrient</Text>
          <Text style={styles.emptyText}>Choose a nutrient above to begin exploring top food sources.</Text>
        </View>
      );
    }
    if (selectedGroupIds.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="filter-list" size={44} color={colors.warmAccent} />
          <Text style={styles.emptyTitle}>Choose Food Groups</Text>
          <Text style={styles.emptyText}>Select one or more food groups to filter your results.</Text>
        </View>
      );
    }
    if (searchLoading || searchFetching) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyText}>Searching...</Text>
        </View>
      );
    }
    if (searchData?.foods.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="no-food" size={44} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>No Results</Text>
          <Text style={styles.emptyText}>No foods found for this combination. Try different groups.</Text>
        </View>
      );
    }
    return null;
  }, [searchError, selectedNutrient, selectedGroupIds, searchLoading, searchFetching, searchData, colors, styles, refetchSearch]);

  return (
    <View style={styles.container}>
      <FlatList
        data={searchData?.foods ?? []}
        keyExtractor={item => item.NDB_No}
        renderItem={renderResult}
        ListHeaderComponent={
          <View style={styles.topSection}>
            <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
              <View style={styles.headerBrand}>
                <MaterialIcons name="eco" size={22} color={colors.warmAccent} />
                <Text style={styles.headerTitle}>NutrientFinder</Text>
              </View>
              {isUnlocked && (
                <View style={styles.unlockedBadge}>
                  <MaterialIcons name="lock-open" size={12} color={colors.accent} />
                  <Text style={styles.unlockedText}>Unlocked</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>NUTRIENT</Text>
              <NutrientPickerModal
                nutrients={nutrients}
                selected={selectedNutrient}
                onSelect={n => setSelectedNutrient(n)}
                loading={nutrientsLoading}
                error={nutrientsError}
              />
            </View>

            {selectedNutrient && (
              <View style={styles.sectionNoLabel}>
                <NutrientInfoBox nutrient={selectedNutrient} />
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>FOOD GROUPS</Text>
              <FoodGroupPicker
                groups={foodGroups}
                selectedIds={selectedGroupIds}
                onChange={ids => setSelectedGroupIds(ids)}
                loading={groupsLoading}
              />
            </View>

            {canSearch && <ListHeader />}
          </View>
        }
        ListEmptyComponent={<EmptyOrPrompt />}
        ListFooterComponent={<ListFooter />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          canSearch ? (
            <RefreshControl
              refreshing={searchFetching && !searchLoading}
              onRefresh={refetchSearch}
              tintColor={colors.primary}
            />
          ) : undefined
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24 },
        ]}
      />

      <EmailGateModal
        visible={showGate}
        onUnlock={handleUnlock}
        onDismiss={() => setShowGate(false)}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { flexGrow: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 14,
      backgroundColor: colors.primary,
    },
    headerBrand: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    headerTitle: {
      fontSize: 20,
      color: "#FFFFFF",
      fontFamily: "Inter_700Bold",
    },
    unlockedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(255,255,255,0.2)",
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    unlockedText: {
      fontSize: 11,
      color: "#FFFFFF",
      fontFamily: "Inter_500Medium",
    },
    topSection: { gap: 0 },
    section: {
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    sectionNoLabel: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    sectionLabel: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold",
      letterSpacing: 0.8,
    },
    listHeader: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 6,
    },
    resultsCount: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
      paddingHorizontal: 32,
      gap: 10,
    },
    emptyTitle: {
      fontSize: 17,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
      textAlign: "center",
    },
    emptyText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 20,
    },
    retryBtn: {
      marginTop: 8,
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    retryText: {
      fontSize: 14,
      color: "#FFFFFF",
      fontFamily: "Inter_600SemiBold",
    },
    pagination: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: 16,
      marginVertical: 16,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 4,
    },
    pageBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.secondary,
    },
    pageBtnDisabled: { backgroundColor: colors.muted },
    pageBtnText: {
      fontSize: 14,
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
    pageBtnTextDisabled: { color: colors.mutedForeground },
    pageIndicator: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    pageText: {
      fontSize: 16,
      color: colors.primary,
      fontFamily: "Inter_700Bold",
    },
    pageSep: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    pageTotalText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
  });
}
