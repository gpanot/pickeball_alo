import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import BookScreenTopBar from '@/components/search/BookScreenTopBar';
import SearchFormFields from '@/components/search/SearchFormFields';
import PinnedVenuesRow from '@/components/search/PinnedVenuesRow';
import MapsExploreSearch from '@/components/maps/MapsExploreSearch';
import { SearchIcon } from '@/components/Icons';
import { useCourtMap } from '@/context/CourtMapContext';
import type { VenueResult } from '@/mobile/lib/types';

export default function SearchRoute() {
  const router = useRouter();
  const ctx = useCourtMap();
  const {
    t,
    venues,
    exploreVenues,
    savedIds,
    searchQuery,
    setSearchQuery,
    selectedDate,
    setSelectedDate,
    selectedDuration,
    setSelectedDuration,
    selectedTime,
    setSelectedTime,
    handleSearch,
    catalogVenueCount,
    fetchExploreMapVenues,
    mapUserLoc,
  } = ctx;

  const allVenues = useMemo(() => {
    const byId = new Map(venues.map((v) => [v.id, v]));
    for (const v of exploreVenues) {
      if (!byId.has(v.id)) byId.set(v.id, v);
    }
    return byId;
  }, [venues, exploreVenues]);

  const pinnedVenues = useMemo(
    () => Array.from(allVenues.values()).filter((v) => savedIds.has(v.id)),
    [allVenues, savedIds],
  );

  const [selectedPinnedId, setSelectedPinnedId] = useState<string | null>(null);

  /** True after a fallback (no GPS) explore load; cleared when GPS upgrades or user picks a place. */
  const pendingGpsExploreRef = useRef(false);

  useEffect(() => {
    if (exploreVenues.length > 0) return;
    const lat = mapUserLoc?.lat ?? 10.79;
    const lng = mapUserLoc?.lng ?? 106.71;
    pendingGpsExploreRef.current = !mapUserLoc;
    void fetchExploreMapVenues({
      lat,
      lng,
      radiusKm: 10,
      reason: mapUserLoc ? 'book-home-near-user' : 'book-home-fallback',
    });
  }, [exploreVenues.length, fetchExploreMapVenues, mapUserLoc]);

  useEffect(() => {
    if (!mapUserLoc || !pendingGpsExploreRef.current) return;
    pendingGpsExploreRef.current = false;
    void fetchExploreMapVenues({
      lat: mapUserLoc.lat,
      lng: mapUserLoc.lng,
      radiusKm: 10,
      reason: 'book-home-gps-upgrade',
    });
  }, [mapUserLoc, fetchExploreMapVenues]);

  const onPickVenueFromBook = useCallback(
    (v: VenueResult) => setSearchQuery(v.name),
    [setSearchQuery],
  );

  const onPickPinnedVenue = useCallback(
    (v: VenueResult) => {
      setSelectedPinnedId((prev) => (prev === v.id ? null : v.id));
      setSearchQuery((prev) => (prev === v.name ? '' : v.name));
    },
    [setSearchQuery],
  );

  const openMapView = useCallback(
    () => router.push('/(tabs)/(book)/map'),
    [router],
  );

  const onPickPlaceFromBook = useCallback(
    (lat: number, lng: number) => {
      pendingGpsExploreRef.current = false;
      void fetchExploreMapVenues({
        lat,
        lng,
        radiusKm: 10,
        reason: 'book-home-place',
      });
    },
    [fetchExploreMapVenues],
  );

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <View style={[styles.topStack, { backgroundColor: t.bg }]}>
        <BookScreenTopBar catalogVenueCount={catalogVenueCount} t={t} />
        <MapsExploreSearch
          venues={exploreVenues}
          t={t}
          onPickVenue={onPickVenueFromBook}
          onPickPlace={onPickPlaceFromBook}
          onQueryChange={setSearchQuery}
          bookMapToggleLabel="Map"
          onBookMapToggle={openMapView}
        />
      </View>
      <View style={[styles.gradTop, { backgroundColor: t.accentBg }]} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 108 }}
        keyboardShouldPersistTaps="handled"
      >
        <SearchFormFields
          t={t}
          searchQuery={searchQuery}
          selectedDate={selectedDate}
          selectedDuration={selectedDuration}
          selectedTime={selectedTime}
          onSearchQueryChange={setSearchQuery}
          onDateChange={setSelectedDate}
          onDurationChange={setSelectedDuration}
          onTimeChange={setSelectedTime}
          hideLocationSearch
          hideNearMe
        />
        <PinnedVenuesRow
          venues={pinnedVenues}
          selectedId={selectedPinnedId}
          t={t}
          onPickVenue={onPickPinnedVenue}
          onOpenMap={openMapView}
        />
      </ScrollView>
      <View
        style={[
          styles.ctaWrap,
          {
            backgroundColor: t.bg,
          },
        ]}
      >
        <Pressable
          onPress={() => void handleSearch()}
          style={[styles.cta, { backgroundColor: t.accent }]}
        >
          <SearchIcon color="#000" />
          <Text style={styles.ctaText}>SEARCH COURTS</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  /** Keep venue/places dropdown above the ScrollView (sibling order paints later on top). */
  topStack: { zIndex: 20, elevation: 20 },
  gradTop: { height: 8, marginHorizontal: 20, opacity: 0.5, borderRadius: 4 },
  /** Pinned just above the tab bar; tab navigator already reserves bottom inset. */
  ctaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  ctaText: { color: '#000', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
});
