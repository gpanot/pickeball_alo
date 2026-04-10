import React, { useCallback, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import ResultsSearchTopBar from '@/components/search/ResultsSearchTopBar';
import VenueCard from '@/components/venue/VenueCard';
import ResultsFlowPills from '@/components/ui/ResultsFlowPills';
import {
  getBookTimeShortLabel,
  pickSlotsForSearch,
  START_HOUR_OPTIONS,
  durationIndexToHalfHourCount,
} from '@/mobile/lib/formatters';
import { useCourtMap } from '@/context/CourtMapContext';
import type { VenueResult } from '@/mobile/lib/types';

function SkeletonCard({ t, delay }: { t: any; delay: number }) {
  const opacity = useMemo(() => {
    const anim = new Animated.Value(0.3);
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.7, duration: 800, delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
    return anim;
  }, [delay]);

  return (
    <Animated.View style={[skeletonStyles.card, { backgroundColor: t.bgCard, opacity }]}>
      <View style={[skeletonStyles.image, { backgroundColor: t.bgInput }]} />
      <View style={{ padding: 14, gap: 10 }}>
        <View style={[skeletonStyles.line, { width: '65%', backgroundColor: t.bgInput }]} />
        <View style={[skeletonStyles.line, { width: '90%', height: 10, backgroundColor: t.bgInput }]} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <View style={[skeletonStyles.pill, { backgroundColor: t.bgInput }]} />
          <View style={[skeletonStyles.pill, { width: 60, backgroundColor: t.bgInput }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: { borderRadius: 16, marginBottom: 14, overflow: 'hidden' },
  image: { height: 140, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  line: { height: 14, borderRadius: 6 },
  pill: { height: 24, width: 80, borderRadius: 12 },
});

export default function ResultsRoute() {
  const ctx = useCourtMap();
  const {
    t,
    venues,
    savedIds,
    sortBy,
    selectedDate,
    selectedDuration,
    selectedTime,
    searchQuery,
    loading,
    backFromResults,
    handleSort,
    toggleSaved,
    openDetail,
    setSearchQuery,
    setSelectedDate,
    setSelectedDuration,
    setSelectedTime,
    refetchVenues,
    loadMoreSearchResults,
    searchHasMore,
    searchTotalCount,
    openSavedFromResultsFlow,
    onResultsFlowPrimary,
    resultsFlowContext,
  } = ctx;

  const hour = START_HOUR_OPTIONS[selectedTime]?.hour ?? 9;
  const n = durationIndexToHalfHourCount(selectedDuration);
  const bookLabel = getBookTimeShortLabel(selectedTime);

  const renderItem = useCallback(
    ({ item: v }: { item: VenueResult }) => {
      const preset = pickSlotsForSearch(v, hour, n);
      return (
        <VenueCard
          venue={v}
          isSaved={savedIds.has(v.id)}
          onToggleSaved={toggleSaved}
          onPress={() => openDetail(v)}
          bookButtonLabel={preset.size > 0 ? bookLabel : undefined}
          onBookPress={preset.size > 0 ? () => openDetail(v, { jumpToConfirm: true }) : undefined}
          t={t}
        />
      );
    },
    [savedIds, toggleSaved, openDetail, bookLabel, hour, n, t],
  );

  const keyExtractor = useCallback((v: VenueResult) => v.id, []);

  const ListEmpty = useMemo(() => {
    if (loading) {
      return (
        <View style={{ paddingTop: 4 }}>
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} t={t} delay={i * 150} />
          ))}
        </View>
      );
    }
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🔍</Text>
        <Text style={[styles.emptyTitle, { color: t.text }]}>No courts found</Text>
        <Text style={{ fontSize: 14, color: t.textSec }}>Try adjusting your search criteria</Text>
      </View>
    );
  }, [loading, t]);

  const ListFooter = useMemo(() => {
    if (!searchHasMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={t.accent} />
        <Text style={{ color: t.textSec, fontSize: 12, marginTop: 6 }}>
          Showing {venues.length} of {searchTotalCount}
        </Text>
      </View>
    );
  }, [searchHasMore, venues.length, searchTotalCount, t]);

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <ResultsSearchTopBar
        variant="list"
        venuesCount={searchTotalCount || venues.length}
        sortBy={sortBy}
        selectedDate={selectedDate}
        selectedDuration={selectedDuration}
        selectedTime={selectedTime}
        searchQuery={searchQuery}
        onBack={backFromResults}
        onSort={handleSort}
        onSearchQueryChange={setSearchQuery}
        onDateChange={setSelectedDate}
        onDurationChange={setSelectedDuration}
        onTimeChange={setSelectedTime}
        onRefetchSearch={refetchVenues}
        t={t}
      />
      <FlatList
        data={venues}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 12 }}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        onEndReached={loadMoreSearchResults}
        onEndReachedThreshold={0.5}
        removeClippedSubviews
      />
      <ResultsFlowPills
        context={resultsFlowContext}
        savedCount={savedIds.size}
        onPrimary={onResultsFlowPrimary}
        onSaved={openSavedFromResultsFlow}
        t={t}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  footer: { alignItems: 'center', paddingVertical: 20 },
});
