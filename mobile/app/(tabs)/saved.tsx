import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackIcon } from '@/components/Icons';
import VenueCard from '@/components/venue/VenueCard';
import SearchCriteriaSheet from '@/components/search/SearchCriteriaSheet';
import ResultsFlowPills from '@/components/ui/ResultsFlowPills';
import { useCourtMap } from '@/context/CourtMapContext';
import { spacing, fontSize } from '@/mobile/lib/theme';
import type { VenueResult } from '@/lib/types';

export default function SavedRoute() {
  const ctx = useCourtMap();
  const {
    t,
    venues,
    savedIds,
    backFromSavedOrBookings,
    backFromSavedInResultsFlow,
    toggleSaved,
    openDetail,
    openSavedBookSheet,
    savedViaResultsFlow,
    savedSearchOpen,
    closeSavedBookSheet,
    handleSavedBookConfirm,
    savedSearchApplying,
    savedBookVenue,
    searchQuery,
    setSearchQuery,
    selectedDate,
    setSelectedDate,
    selectedDuration,
    setSelectedDuration,
    selectedTime,
    setSelectedTime,
    openSavedFromResultsFlow,
    onResultsFlowPrimary,
    resultsFlowContext,
  } = ctx;

  const savedVenues = useMemo(() => venues.filter((v) => savedIds.has(v.id)), [venues, savedIds]);
  const bottomPad = savedViaResultsFlow ? 100 : 88;

  const renderItem = useCallback(
    ({ item: v }: { item: VenueResult }) => (
      <VenueCard
        venue={v}
        isSaved
        onToggleSaved={toggleSaved}
        onPress={() => openDetail(v)}
        bookPill
        onBookPillPress={() => openSavedBookSheet(v)}
        t={t}
      />
    ),
    [toggleSaved, openDetail, openSavedBookSheet, t],
  );

  const keyExtractor = useCallback((v: VenueResult) => v.id, []);

  const ListEmpty = useMemo(
    () => (
      <View style={styles.center}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>💚</Text>
        <Text style={[styles.emptyTitle, { color: t.text }]}>No saved courts yet</Text>
        <Text style={{ fontSize: 14, color: t.textSec }}>
          Tap the heart on any court to save it here
        </Text>
      </View>
    ),
    [t],
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Pressable
            onPress={savedViaResultsFlow ? backFromSavedInResultsFlow : backFromSavedOrBookings}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <BackIcon color={t.text} />
          </Pressable>
          <Text style={[styles.screenTitle, { color: t.text }]} numberOfLines={1}>
            Saved Courts
          </Text>
        </View>
      </View>
      <FlatList
        data={savedVenues}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: bottomPad,
        }}
        ListEmptyComponent={ListEmpty}
        removeClippedSubviews
      />
      {savedViaResultsFlow ? (
        <ResultsFlowPills
          context={resultsFlowContext}
          savedCount={savedIds.size}
          onPrimary={onResultsFlowPrimary}
          onSaved={openSavedFromResultsFlow}
          t={t}
        />
      ) : null}
      <SearchCriteriaSheet
        open={savedSearchOpen}
        onClose={closeSavedBookSheet}
        onApply={() => void handleSavedBookConfirm()}
        applying={savedSearchApplying}
        t={t}
        bookAtVenueName={savedBookVenue?.name ?? null}
        searchQuery={searchQuery}
        selectedDate={selectedDate}
        selectedDuration={selectedDuration}
        selectedTime={selectedTime}
        onSearchQueryChange={setSearchQuery}
        onDateChange={setSelectedDate}
        onDurationChange={setSelectedDuration}
        onTimeChange={setSelectedTime}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  /** Match `(coach)/index` header chrome */
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  screenTitle: {
    flex: 1,
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  center: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
});
