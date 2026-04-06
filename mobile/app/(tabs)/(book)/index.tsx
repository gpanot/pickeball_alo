import React, { useCallback, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BookHomeTopBar from '@/components/search/BookHomeTopBar';
import SearchFormFields from '@/components/search/SearchFormFields';
import MapsExploreSearch from '@/components/maps/MapsExploreSearch';
import { SearchIcon } from '@/components/Icons';
import { useCourtMap } from '@/context/CourtMapContext';
import type { VenueResult } from '@/lib/types';

export default function SearchRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ctx = useCourtMap();
  const {
    t,
    venues,
    exploreVenues,
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
    userName,
    fetchExploreMapVenues,
  } = ctx;

  useEffect(() => {
    if (exploreVenues.length > 0) return;
    void fetchExploreMapVenues({
      lat: 10.79,
      lng: 106.71,
      radiusKm: 25,
      reason: 'book-home-catalog',
    });
  }, [exploreVenues.length, fetchExploreMapVenues]);

  const onPickVenueFromBook = useCallback(
    (v: VenueResult) => {
      setSearchQuery(v.name);
    },
    [setSearchQuery],
  );

  const onPickPlaceFromBook = useCallback(
    (lat: number, lng: number) => {
      void fetchExploreMapVenues({
        lat,
        lng,
        radiusKm: 12,
        reason: 'book-home-place',
      });
    },
    [fetchExploreMapVenues],
  );

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <View style={[styles.topStack, { backgroundColor: t.bg }]}>
        <BookHomeTopBar
          catalogVenueCount={catalogVenueCount}
          userName={userName}
          onOpenProfile={() => router.push('/(tabs)/profile')}
          t={t}
        />
        <MapsExploreSearch
          venues={exploreVenues}
          t={t}
          onPickVenue={onPickVenueFromBook}
          onPickPlace={onPickPlaceFromBook}
          onQueryChange={setSearchQuery}
        />
      </View>
      <View style={[styles.gradTop, { backgroundColor: t.accentBg }]} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 160 }}
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
        />
      </ScrollView>
      <View
        style={[
          styles.ctaWrap,
          {
            paddingBottom: Math.max(72, insets.bottom + 56),
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
  ctaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
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
