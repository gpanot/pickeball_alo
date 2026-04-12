/**
 * Web: react-native-maps is native-only. Provide the same chrome + a scrollable venue list
 * so Expo web bundles without MapMarkerNativeComponent errors.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import BookScreenTopBar from '@/components/search/BookScreenTopBar';
import MapsExploreSearch from '@/components/maps/MapsExploreSearch';
import ResultsSearchTopBar from '@/components/search/ResultsSearchTopBar';
import VenueCard from '@/components/venue/VenueCard';
import type { CourtMapMapScreenProps } from '@/components/screens/CourtMapMapScreen.props';
import type { ThemeTokens } from '@/lib/theme';
import type { VenueResult } from '@/lib/types';
import { formatPrice, mapPriceTierFromVnd } from '@/lib/formatters';

function WebVenueRow({
  venue,
  selected,
  accent,
  t,
  onPress,
}: {
  venue: VenueResult;
  selected: boolean;
  accent: string;
  t: ThemeTokens;
  onPress: () => void;
}) {
  const allSlots = venue.courts.flatMap((c) => c.slots);
  const allBooked = allSlots.length > 0 && allSlots.every((s) => s.isBooked);
  const tier = mapPriceTierFromVnd(venue.priceMin);
  let bg = '#a855f7';
  let fg = '#faf5ff';
  if (!allBooked) {
    if (tier === 0) {
      bg = '#14b8a6';
      fg = '#042f2e';
    } else if (tier === 1) {
      bg = '#f59e0b';
      fg = '#422006';
    }
  } else {
    bg = '#3f3f46';
    fg = '#e4e4e7';
  }
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        {
          borderColor: selected ? accent : t.border,
          backgroundColor: t.bgCard,
        },
      ]}
    >
      <View style={[styles.pill, { backgroundColor: bg }]}>
        <Text style={[styles.pillText, { color: fg }]}>{formatPrice(venue.priceMin)}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: t.text }]} numberOfLines={2}>
          {venue.name}
        </Text>
        <Text style={[styles.rowSub, { color: t.textSec }]} numberOfLines={1}>
          {venue.address}
        </Text>
      </View>
    </Pressable>
  );
}

export default function CourtMapMapScreen({
  venues,
  savedIds,
  sortBy,
  selectedDate,
  selectedDuration,
  selectedTime,
  searchQuery,
  onBack,
  onSort,
  onToggleSaved,
  onOpenVenue,
  onSearchQueryChange,
  onDateChange,
  onDurationChange,
  onTimeChange,
  onRefetchSearch,
  t,
  onToggleView,
  hasFlowPills = true,
  bookHomeTopBar = false,
  bookMapToggleLabel,
  onBookMapToggle,
  catalogVenueCount,
  exploreMapFetch: _exploreMapFetch,
}: CourtMapMapScreenProps) {
  const [selectedVenue, setSelectedVenue] = useState<VenueResult | null>(null);
  const cardBottom = hasFlowPills ? 108 : 78;

  const focusVenueFromExplore = useCallback((v: VenueResult) => {
    setSelectedVenue(v);
  }, []);

  const focusPlaceFromExplore = useCallback((_lat: number, _lng: number) => {
    setSelectedVenue(null);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      {bookHomeTopBar ? (
        <>
          <BookScreenTopBar variant="map" catalogVenueCount={catalogVenueCount} t={t} />
          <MapsExploreSearch
            venues={venues}
            t={t}
            onPickVenue={focusVenueFromExplore}
            onPickPlace={focusPlaceFromExplore}
            bookMapToggleLabel={bookMapToggleLabel}
            onBookMapToggle={onBookMapToggle}
          />
        </>
      ) : (
        <ResultsSearchTopBar
          variant="map"
          venuesCount={venues.length}
          sortBy={sortBy}
          selectedDate={selectedDate}
          selectedDuration={selectedDuration}
          selectedTime={selectedTime}
          searchQuery={searchQuery}
          onBack={onBack}
          onSort={onSort}
          onSearchQueryChange={onSearchQueryChange}
          onDateChange={onDateChange}
          onDurationChange={onDurationChange}
          onTimeChange={onTimeChange}
          onRefetchSearch={onRefetchSearch}
          onToggleView={onToggleView}
          t={t}
        />
      )}

      <View style={styles.listPane}>
        <Text style={[styles.hint, { color: t.textMuted }]}>
          Map view runs on iOS and Android. Below is the same venue list.
        </Text>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {venues.map((v) => (
            <WebVenueRow
              key={v.id}
              venue={v}
              selected={selectedVenue?.id === v.id}
              accent={t.accent}
              t={t}
              onPress={() => setSelectedVenue(v)}
            />
          ))}
        </ScrollView>
      </View>

      {selectedVenue ? (
        <View style={[styles.cardOverlay, { bottom: cardBottom }]}>
          <VenueCard
            venue={selectedVenue}
            compact
            isSaved={savedIds.has(selectedVenue.id)}
            onToggleSaved={onToggleSaved}
            onPress={() => onOpenVenue(selectedVenue)}
            t={t}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listPane: { flex: 1, minHeight: 200 },
  hint: { fontSize: 12, paddingHorizontal: 16, paddingVertical: 10, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingBottom: 120, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  pill: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pillText: { fontWeight: '800', fontSize: 11 },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontWeight: '700', fontSize: 15 },
  rowSub: { fontSize: 12, marginTop: 2 },
  cardOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 5100,
  },
});
