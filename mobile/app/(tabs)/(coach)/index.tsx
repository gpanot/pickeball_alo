import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
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

const SPECIALTIES = ['All', 'Beginner', 'Advanced', 'Drills', 'Match Play', 'Kids'] as const;
const SORTS = [
  { key: 'rating', label: 'Top Rated' },
  { key: 'price', label: 'Lowest Price' },
] as const;

export default function CoachListScreen() {
  const router = useRouter();
  const { t } = useCourtMap();
  const { coaches, total, loading, search, loadMore } = useCoachDiscovery();

  const [query, setQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [selectedSort, setSelectedSort] = useState<'rating' | 'price'>('rating');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    (q: string, specialty: string, sort: 'rating' | 'price') => {
      const params: Record<string, unknown> = { sort };
      if (q.trim()) params.q = q.trim();
      if (specialty !== 'All') params.specialty = specialty;
      search(params);
    },
    [search],
  );

  useEffect(() => {
    doSearch('', 'All', 'rating');
  }, [doSearch]);

  const onQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        doSearch(text, selectedSpecialty, selectedSort);
      }, 350);
    },
    [doSearch, selectedSpecialty, selectedSort],
  );

  const onSpecialtyPress = useCallback(
    (s: string) => {
      setSelectedSpecialty(s);
      doSearch(query, s, selectedSort);
    },
    [doSearch, query, selectedSort],
  );

  const onSortPress = useCallback(
    (s: 'rating' | 'price') => {
      setSelectedSort(s);
      doSearch(query, selectedSpecialty, s);
    },
    [doSearch, query, selectedSpecialty],
  );

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
          onPress={() => onCoachPress(item)}
          theme={t}
        />
      </View>
    ),
    [t, onCoachPress],
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {SPECIALTIES.map((s) => {
            const active = s === selectedSpecialty;
            return (
              <Pressable
                key={s}
                onPress={() => onSpecialtyPress(s)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? t.accentBgStrong : t.bgCard,
                    borderColor: active ? t.accent : t.border,
                  },
                ]}
              >
                <Text
                  style={[styles.filterChipText, { color: active ? t.accent : t.textSec }]}
                >
                  {s}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sortRow}>
          {SORTS.map((s) => {
            const active = s.key === selectedSort;
            return (
              <Pressable
                key={s.key}
                onPress={() => onSortPress(s.key as 'rating' | 'price')}
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
    [query, selectedSpecialty, selectedSort, total, t, onQueryChange, onSpecialtyPress, onSortPress],
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
        data={coaches}
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
  chipScroll: {
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
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
