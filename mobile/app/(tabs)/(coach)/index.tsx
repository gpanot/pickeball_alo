import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { useCourtMap } from '@/context/CourtMapContext';
import { useCoachDiscovery } from '@/context/CoachDiscoveryContext';
import { CoachCard, EmptyState } from '@/components/coach';
import { SearchIcon } from '@/components/Icons';
import { spacing, fontSize, borderRadius } from '@/mobile/lib/theme';
import type { CoachResult } from '@/mobile/lib/coach-types';

type SortKey = 'rating' | 'price' | 'nearby';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'rating', label: 'Top Rated' },
  { key: 'nearby', label: 'Nearby' },
  { key: 'price', label: 'Lowest Price' },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function closestCourtDistance(
  coach: CoachResult,
  userLoc: { lat: number; lng: number } | null,
): number | null {
  if (!userLoc || !coach.courts?.length) return null;
  let min = Infinity;
  for (const c of coach.courts) {
    if (c.venueLat != null && c.venueLng != null) {
      const d = haversineKm(userLoc.lat, userLoc.lng, c.venueLat, c.venueLng);
      if (d < min) min = d;
    }
  }
  return min === Infinity ? null : min;
}

export default function CoachListScreen() {
  const router = useRouter();
  const { t, mapUserLoc } = useCourtMap();
  const { coaches, total, loading, search, loadMore } = useCoachDiscovery();

  const [query, setQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState<SortKey>('rating');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    (q: string, sort: SortKey) => {
      const apiSort = sort === 'nearby' ? 'rating' : sort;
      const params: Record<string, unknown> = { sort: apiSort };
      if (q.trim()) params.q = q.trim();
      search(params);
    },
    [search],
  );

  useEffect(() => {
    doSearch('', 'rating');
  }, [doSearch]);

  const onQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        doSearch(text, selectedSort);
      }, 350);
    },
    [doSearch, selectedSort],
  );

  const onSortPress = useCallback(
    (s: SortKey) => {
      setSelectedSort(s);
      doSearch(query, s);
    },
    [doSearch, query],
  );

  const sortedCoaches = useMemo(() => {
    if (selectedSort !== 'nearby') return coaches;
    return [...coaches].sort((a, b) => {
      const da = closestCourtDistance(a, mapUserLoc) ?? Infinity;
      const db = closestCourtDistance(b, mapUserLoc) ?? Infinity;
      return da - db;
    });
  }, [coaches, selectedSort, mapUserLoc]);

  const onCoachPress = useCallback(
    (coach: CoachResult) => {
      router.push({
        pathname: '/(tabs)/(coach)/coach-profile',
        params: { coachId: coach.id },
      } as unknown as Href);
    },
    [router],
  );

  const renderCoach = useCallback(
    ({ item }: { item: CoachResult }) => (
      <View style={styles.cardWrap}>
        <CoachCard
          name={item.name}
          photo={item.photo ?? undefined}
          specialties={item.specialties}
          ratingOverall={item.ratingOverall}
          reviewCount={item.reviewCount}
          hourlyRate={item.hourlyRate1on1}
          distanceKm={closestCourtDistance(item, mapUserLoc)}
          onPress={() => onCoachPress(item)}
          theme={t}
        />
      </View>
    ),
    [t, onCoachPress, mapUserLoc],
  );

  const keyExtractor = useCallback((item: CoachResult) => item.id, []);

  const ListHeader = useMemo(
    () => (
      <View>
        <View style={[styles.searchBar, { backgroundColor: t.bgInput, borderColor: t.border }]}>
          <SearchIcon size={18} color={t.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: t.text }]}
            placeholder="Search coaches..."
            placeholderTextColor={t.textMuted}
            value={query}
            onChangeText={onQueryChange}
            returnKeyType="search"
            autoCorrect={false}
          />
        </View>

        <View style={styles.sortRow}>
          {SORTS.map((s) => {
            const active = s.key === selectedSort;
            return (
              <Pressable
                key={s.key}
                onPress={() => onSortPress(s.key)}
                style={[
                  styles.sortPill,
                  {
                    backgroundColor: active ? t.accentBg : 'transparent',
                    borderColor: active ? t.accent : t.border,
                  },
                ]}
              >
                <Text style={[styles.sortPillText, { color: active ? t.accent : t.textSec }]}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
          <View style={styles.flex} />
          <Text style={[styles.resultCount, { color: t.textMuted }]}>
            {total} coach{total !== 1 ? 'es' : ''}
          </Text>
        </View>
      </View>
    ),
    [query, selectedSort, total, t, onQueryChange, onSortPress],
  );

  const ListEmpty = useMemo(() => {
    if (loading) return null;
    return (
      <EmptyState
        icon="🎓"
        title="No coaches found"
        subtitle="Try adjusting your search or filters"
        theme={t}
      />
    );
  }, [loading, t]);

  const ListFooter = useMemo(() => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }, [loading, t]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.text }]}>Find a Coach</Text>
      </View>
      <FlatList
        data={sortedCoaches}
        keyExtractor={keyExtractor}
        renderItem={renderCoach}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: 0,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sortPill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  sortPillText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  resultCount: {
    fontSize: fontSize.xs,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  cardWrap: {
    marginBottom: spacing.md,
  },
  footer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
});
