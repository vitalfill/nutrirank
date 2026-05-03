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
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE, FREE_NUTRIENT_NOS } from "@/constants/api";
import { getNutrientInfo } from "@/constants/nutrientsData";
import DeficiencyQuizModal from "@/components/DeficiencyQuizModal";
import FavoritesModal from "@/components/FavoritesModal";
import FoodDetailModal from "@/components/FoodDetailModal";
import FoodGroupPicker from "@/components/FoodGroupPicker";
import HowToUseModal from "@/components/HowToUseModal";
import NutrientInfoBox from "@/components/NutrientInfoBox";
import NutrientPickerModal from "@/components/NutrientPickerModal";
import PaywallModal from "@/components/PaywallModal";
import ResultCard from "@/components/ResultCard";
import SearchHistory from "@/components/SearchHistory";
import { useColors } from "@/hooks/useColors";
import {
  Favorite, FoodGroup, FoodResult, Nutrient, SearchResponse, Subscription,
} from "@/types";

const SUBSCRIPTION_KEY  = "nutrirank_subscription";
const FAVORITES_KEY     = "nutrirank_favorites";
const HISTORY_KEY       = "nutrirank_search_history";
const MAX_HISTORY       = 8;
const DEBOUNCE_MS       = 600;

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors, insets);

  // ── nutrient + groups ──────────────────────────────────────────────────────
  const [selectedNutrient, setSelectedNutrient] = useState<Nutrient | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const [debouncedNutrient, setDebouncedNutrient] = useState<Nutrient | null>(null);
  const [debouncedGroups,   setDebouncedGroups]   = useState<string[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── paywall ────────────────────────────────────────────────────────────────
  const [subscription,    setSubscription]    = useState<Subscription | null>(null);
  const [showPaywall,     setShowPaywall]     = useState(false);
  const [pendingNutrient, setPendingNutrient] = useState<Nutrient | null>(null);
  const isSubscribed = subscription !== null && subscription.expiresAt > Date.now() / 1000;

  // ── modals ─────────────────────────────────────────────────────────────────
  const [showFavorites, setShowFavorites] = useState(false);
  const [showHowTo,     setShowHowTo]     = useState(false);
  const [showQuiz,      setShowQuiz]      = useState(false);

  // ── food detail ────────────────────────────────────────────────────────────
  const [detailNdbNo,   setDetailNdbNo]   = useState<string | null>(null);
  const [detailFoodName, setDetailFoodName] = useState("");

  // ── favorites + search history ────────────────────────────────────────────
  const [favorites,      setFavorites]      = useState<Favorite[]>([]);
  const [searchHistory,  setSearchHistory]  = useState<Nutrient[]>([]);

  // ── hydrate ────────────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.multiGet([SUBSCRIPTION_KEY, FAVORITES_KEY, HISTORY_KEY]).then(pairs => {
      const [subRaw, favRaw, histRaw] = pairs.map(p => p[1]);
      try { if (subRaw)  setSubscription(JSON.parse(subRaw));  } catch {}
      try { if (favRaw)  setFavorites(JSON.parse(favRaw));     } catch {}
      try { if (histRaw) setSearchHistory(JSON.parse(histRaw));} catch {}
    });
  }, []);

  // ── debounce ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedNutrient(selectedNutrient);
      setDebouncedGroups(selectedGroupIds);
      setPage(1);
    }, DEBOUNCE_MS);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [selectedNutrient, selectedGroupIds]);

  // ── API ────────────────────────────────────────────────────────────────────
  const { data: nutrients = [], isLoading: nutrientsLoading, isError: nutrientsError } = useQuery<Nutrient[]>({
    queryKey: ["nutrients"],
    queryFn: async () => {
      const res  = await fetch(`${API_BASE}/nutrients.php`);
      const data = await res.json();
      const KEEP_NAMES = new Set(["DHA", "EPA", "ALA"]);
      return (data.nutrients ?? []).filter((n: Nutrient) =>
        !(/^[0-9]/.test(n.NutrDesc)) || KEEP_NAMES.has(n.NutrDesc)
      );
    },
    staleTime: 1000 * 60 * 60,
  });

  const { data: foodGroups = [], isLoading: groupsLoading } = useQuery<FoodGroup[]>({
    queryKey: ["food-groups"],
    queryFn: async () => {
      const res  = await fetch(`${API_BASE}/food-groups.php`);
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
  const dailyValue   = nutrientInfo?.dailyValue?.dv;

  // ── nutrient selection ─────────────────────────────────────────────────────
  async function handleSelectNutrient(n: Nutrient) {
    const isFree = FREE_NUTRIENT_NOS.has(n.Nutr_No);
    if (!isFree && !isSubscribed) {
      setPendingNutrient(n);
      setShowPaywall(true);
      return;
    }
    setSelectedNutrient(n);
    await addToHistory(n);
  }

  async function addToHistory(n: Nutrient) {
    const next = [n, ...searchHistory.filter(h => h.Nutr_No !== n.Nutr_No)].slice(0, MAX_HISTORY);
    setSearchHistory(next);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }

  async function clearHistory() {
    setSearchHistory([]);
    await AsyncStorage.removeItem(HISTORY_KEY);
  }

  // ── subscription ───────────────────────────────────────────────────────────
  async function handleSubscribed(sub: Subscription) {
    setSubscription(sub);
    setShowPaywall(false);
    await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(sub));
    if (pendingNutrient) {
      setSelectedNutrient(pendingNutrient);
      await addToHistory(pendingNutrient);
      setPendingNutrient(null);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  // ── share ──────────────────────────────────────────────────────────────────
  async function handleShare() {
    if (!searchData || !debouncedNutrient) return;
    const foods = searchData.foods.slice(0, 10);
    const dv = dailyValue;
    const lines = foods.map((f, i) => {
      const val = f.Nutr_Val < 1 ? f.Nutr_Val.toFixed(3) : f.Nutr_Val.toFixed(1);
      const dvStr = dv ? ` (${Math.round((f.Nutr_Val / dv) * 100)}% DV)` : "";
      return `${i + 1}. ${f.Long_Desc}\n   ${val} ${searchData.nutrient.Units}${dvStr}`;
    });
    const text = [
      `🌿 NutriRank — Top Foods for ${debouncedNutrient.NutrDesc}`,
      `Ranked per 100 g · ${searchData.total.toLocaleString()} foods found`,
      `──────────────────────`,
      ...lines,
      `──────────────────────`,
      `© Vital Fill LLC 2026`,
    ].join("\n");
    try {
      await Share.share({ message: text, title: `NutriRank – ${debouncedNutrient.NutrDesc}` });
    } catch {}
  }

  // ── pagination ─────────────────────────────────────────────────────────────
  function handlePageChange(newPage: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPage(newPage);
  }

  // ── favorites ──────────────────────────────────────────────────────────────
  function isFavorited(foodNDB_No: string) {
    return favorites.some(f => f.foodNDB_No === foodNDB_No && f.nutrientNo === (debouncedNutrient?.Nutr_No ?? ""));
  }

  async function toggleFavorite(item: FoodResult) {
    const nutrNo = debouncedNutrient?.Nutr_No ?? "";
    const existing = favorites.find(f => f.foodNDB_No === item.NDB_No && f.nutrientNo === nutrNo);
    let next: Favorite[];
    if (existing) {
      next = favorites.filter(f => f.id !== existing.id);
    } else {
      const fav: Favorite = {
        id: `${item.NDB_No}_${nutrNo}_${Date.now()}`,
        nutrientNo: nutrNo,
        nutrientDesc: debouncedNutrient?.NutrDesc ?? "",
        nutrientUnits: debouncedNutrient?.Units ?? "",
        foodNDB_No: item.NDB_No,
        foodName: item.Long_Desc,
        nutrientValue: item.Nutr_Val,
        selectedGroupIds: [...debouncedGroups],
        savedAt: Date.now(),
      };
      next = [fav, ...favorites];
    }
    setFavorites(next);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  async function deleteFavorite(id: string) {
    const next = favorites.filter(f => f.id !== id);
    setFavorites(next);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  async function revisitFavorite(fav: Favorite) {
    const n = nutrients.find(n => n.Nutr_No === fav.nutrientNo);
    if (n) { setSelectedNutrient(n); await addToHistory(n); }
    setSelectedGroupIds(fav.selectedGroupIds);
  }

  // ── render helpers ─────────────────────────────────────────────────────────
  const renderResult = useCallback(({ item, index }: { item: FoodResult; index: number }) => (
    <ResultCard
      item={item}
      rank={(page - 1) * 10 + index + 1}
      nutrientLabel={searchData?.nutrient.NutrDesc ?? ""}
      units={searchData?.nutrient.Units ?? ""}
      nutrNo={debouncedNutrient?.Nutr_No ?? ""}
      dailyValue={dailyValue}
      isFavorited={isFavorited(item.NDB_No)}
      onToggleFavorite={() => toggleFavorite(item)}
      onPressFood={(ndbNo, name) => { setDetailNdbNo(ndbNo); setDetailFoodName(name); }}
    />
  ), [page, searchData, debouncedNutrient, dailyValue, favorites]);

  const ListHeader = useCallback(() => (
    searchData ? (
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {searchData.total.toLocaleString()} foods · Page {page}/{searchData.total_pages}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.7 }]}
          onPress={handleShare}
        >
          <MaterialIcons name="share" size={15} color={colors.primary} />
          <Text style={styles.shareBtnText}>Share Top 10</Text>
        </Pressable>
      </View>
    ) : null
  ), [searchData, page, styles, colors]);

  const ListFooter = useCallback(() => {
    if (!searchData || searchData.total_pages <= 1) return null;
    return (
      <View style={styles.pagination}>
        <Pressable
          style={({ pressed }) => [styles.pageBtn, page === 1 && styles.pageBtnDisabled, pressed && { opacity: 0.7 }]}
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
          style={({ pressed }) => [styles.pageBtn, page === searchData.total_pages && styles.pageBtnDisabled, pressed && { opacity: 0.7 }]}
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
    if (searchError) return (
      <View style={styles.emptyState}>
        <MaterialIcons name="error-outline" size={44} color={colors.destructive} />
        <Text style={styles.emptyTitle}>Connection Error</Text>
        <Text style={styles.emptyText}>Could not reach drgily.com.</Text>
        <Pressable style={styles.retryBtn} onPress={() => refetchSearch()}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </View>
    );
    if (!selectedNutrient) return (
      <View style={styles.emptyState}>
        <MaterialIcons name="search" size={44} color={colors.warmAccent} />
        <Text style={styles.emptyTitle}>Select a Nutrient</Text>
        <Text style={styles.emptyText}>
          Choose a nutrient above to discover which foods contain the most of it — ranked per 100 g.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.quizPromptBtn, pressed && { opacity: 0.8 }]}
          onPress={() => setShowQuiz(true)}
        >
          <MaterialIcons name="quiz" size={15} color={colors.primary} />
          <Text style={styles.quizPromptText}>Not sure where to start? Take the quiz →</Text>
        </Pressable>
      </View>
    );
    if (selectedGroupIds.length === 0) return (
      <View style={styles.emptyState}>
        <MaterialIcons name="filter-list" size={44} color={colors.warmAccent} />
        <Text style={styles.emptyTitle}>Choose Food Groups</Text>
        <Text style={styles.emptyText}>Select one or more food groups to filter your results.</Text>
      </View>
    );
    if (searchLoading || searchFetching) return (
      <View style={styles.emptyState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.emptyText}>Searching…</Text>
      </View>
    );
    if (searchData?.foods.length === 0) return (
      <View style={styles.emptyState}>
        <MaterialIcons name="no-food" size={44} color={colors.mutedForeground} />
        <Text style={styles.emptyTitle}>No Results</Text>
        <Text style={styles.emptyText}>No foods found. Try different groups.</Text>
      </View>
    );
    return null;
  }, [searchError, selectedNutrient, selectedGroupIds, searchLoading, searchFetching, searchData, colors, styles, refetchSearch]);

  // ── main render ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <FlatList
        data={searchData?.foods ?? []}
        keyExtractor={item => item.NDB_No}
        renderItem={renderResult}
        ListHeaderComponent={
          <View style={styles.topSection}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
              <View style={styles.headerBrand}>
                <MaterialIcons name="eco" size={22} color={colors.warmAccent} />
                <Text style={styles.headerTitle}>NutriRank</Text>
              </View>
              <View style={styles.headerActions}>
                <Pressable
                  style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => setShowQuiz(true)}
                  accessibilityLabel="Deficiency quiz"
                >
                  <MaterialIcons name="quiz" size={20} color="rgba(255,255,255,0.85)" />
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => setShowFavorites(true)}
                >
                  <MaterialIcons name="star" size={20} color={colors.gold} />
                  {favorites.length > 0 && (
                    <View style={styles.favBadge}>
                      <Text style={styles.favBadgeText}>{favorites.length > 99 ? "99+" : favorites.length}</Text>
                    </View>
                  )}
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => setShowHowTo(true)}
                >
                  <MaterialIcons name="help-outline" size={20} color="rgba(255,255,255,0.8)" />
                </Pressable>
                {isSubscribed && (
                  <View style={styles.proBadge}>
                    <MaterialIcons name="verified" size={12} color={colors.gold} />
                    <Text style={styles.proBadgeText}>Pro</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Nutrient picker */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>NUTRIENT</Text>
              <NutrientPickerModal
                nutrients={nutrients}
                selected={selectedNutrient}
                onSelect={handleSelectNutrient}
                loading={nutrientsLoading}
                error={nutrientsError}
                isSubscribed={isSubscribed}
                freeNutrientNos={FREE_NUTRIENT_NOS}
                onPaywallRequest={() => setShowPaywall(true)}
              />
              {searchHistory.length > 0 && (
                <SearchHistory
                  history={searchHistory}
                  onSelect={handleSelectNutrient}
                  onClear={clearHistory}
                />
              )}
            </View>

            {/* Nutrient info box */}
            {selectedNutrient && (
              <View style={styles.sectionNoLabel}>
                <NutrientInfoBox nutrient={selectedNutrient} />
              </View>
            )}

            {/* Food groups */}
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

      {/* Modals */}
      <PaywallModal
        visible={showPaywall}
        onSubscribed={handleSubscribed}
        onDismiss={() => { setShowPaywall(false); setPendingNutrient(null); }}
      />
      <FavoritesModal
        visible={showFavorites}
        favorites={favorites}
        onRevisit={revisitFavorite}
        onDelete={deleteFavorite}
        onClose={() => setShowFavorites(false)}
      />
      <HowToUseModal
        visible={showHowTo}
        onClose={() => setShowHowTo(false)}
      />
      <DeficiencyQuizModal
        visible={showQuiz}
        nutrients={nutrients}
        onSelectNutrient={handleSelectNutrient}
        onClose={() => setShowQuiz(false)}
      />
      <FoodDetailModal
        ndbNo={detailNdbNo}
        foodName={detailFoodName}
        onClose={() => setDetailNdbNo(null)}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { flexGrow: 1 },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 20, paddingBottom: 14,
      backgroundColor: colors.primary,
    },
    headerBrand: { flexDirection: "row", alignItems: "center", gap: 8 },
    headerTitle: { fontSize: 20, color: "#FFFFFF", fontFamily: "Inter_700Bold" },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 4 },
    headerBtn: {
      width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 10,
    },
    favBadge: {
      position: "absolute", top: 2, right: 2,
      backgroundColor: colors.primary, borderRadius: 8,
      minWidth: 15, height: 15,
      alignItems: "center", justifyContent: "center",
      borderWidth: 1.5, borderColor: "#FFFFFF",
    },
    favBadgeText: { fontSize: 8, color: "#FFFFFF", fontFamily: "Inter_700Bold" },
    proBadge: {
      flexDirection: "row", alignItems: "center", gap: 3,
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    },
    proBadgeText: { fontSize: 11, color: colors.gold, fontFamily: "Inter_700Bold" },
    topSection: { gap: 0 },
    section: {
      gap: 8, paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    sectionNoLabel: {
      paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    sectionLabel: {
      fontSize: 11, color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold", letterSpacing: 0.8,
    },
    resultsHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
    },
    resultsCount: {
      fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", flex: 1,
    },
    shareBtn: {
      flexDirection: "row", alignItems: "center", gap: 5,
      backgroundColor: colors.secondary, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 6,
      borderWidth: 1, borderColor: colors.border,
    },
    shareBtnText: { fontSize: 12, color: colors.primary, fontFamily: "Inter_600SemiBold" },
    emptyState: {
      alignItems: "center", justifyContent: "center",
      paddingVertical: 60, paddingHorizontal: 32, gap: 10,
    },
    emptyTitle: {
      fontSize: 17, color: colors.foreground,
      fontFamily: "Inter_600SemiBold", textAlign: "center",
    },
    emptyText: {
      fontSize: 14, color: colors.mutedForeground,
      fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20,
    },
    quizPromptBtn: {
      flexDirection: "row", alignItems: "center", gap: 6,
      borderWidth: 1.5, borderColor: colors.primary,
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, marginTop: 4,
    },
    quizPromptText: { fontSize: 13, color: colors.primary, fontFamily: "Inter_500Medium" },
    retryBtn: {
      marginTop: 8, backgroundColor: colors.primary,
      borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10,
    },
    retryText: { fontSize: 14, color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
    pagination: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      marginHorizontal: 16, marginVertical: 16,
      backgroundColor: colors.card, borderRadius: 14,
      borderWidth: 1, borderColor: colors.border, padding: 4,
    },
    pageBtn: {
      flexDirection: "row", alignItems: "center", gap: 2,
      paddingHorizontal: 14, paddingVertical: 10,
      borderRadius: 10, backgroundColor: colors.secondary,
    },
    pageBtnDisabled: { backgroundColor: colors.muted },
    pageBtnText: { fontSize: 14, color: colors.primary, fontFamily: "Inter_600SemiBold" },
    pageBtnTextDisabled: { color: colors.mutedForeground },
    pageIndicator: { flexDirection: "row", alignItems: "center", gap: 4 },
    pageText: { fontSize: 16, color: colors.primary, fontFamily: "Inter_700Bold" },
    pageSep: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    pageTotalText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
  });
}
