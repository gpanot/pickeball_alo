import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import CourtMapMapScreen from '@/components/screens/CourtMapMapScreen';
import { useCourtMap } from '@/context/CourtMapContext';
import type { VenueResult } from '@/lib/types';

export default function BookMapRoute() {
  const router = useRouter();
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
    backFromResults,
    handleSort,
    toggleSaved,
    openDetail,
    setSearchQuery,
    setSelectedDate,
    setSelectedDuration,
    setSelectedTime,
    refetchVenues,
    fetchExploreMapVenues,
    catalogVenueCount,
    mapUserLoc,
    setMapUserLoc,
    mapGeoInitDone,
  } = ctx;

  const openVenueFromBookMap = useCallback(
    (v: VenueResult) => openDetail(v, { presetSlotsFromSearch: false }),
    [openDetail],
  );

  const goBookHome = useCallback(() => {
    router.replace('/(tabs)/(book)');
  }, [router]);

  const markGeoInitDone = useCallback(() => {
    mapGeoInitDone.current = true;
  }, [mapGeoInitDone]);

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <CourtMapMapScreen
        venues={venues}
        savedIds={savedIds}
        sortBy={sortBy}
        selectedDate={selectedDate}
        selectedDuration={selectedDuration}
        selectedTime={selectedTime}
        searchQuery={searchQuery}
        onBack={backFromResults}
        onSort={handleSort}
        onToggleSaved={toggleSaved}
        onOpenVenue={openVenueFromBookMap}
        onSearchQueryChange={setSearchQuery}
        onDateChange={setSelectedDate}
        onDurationChange={setSelectedDuration}
        onTimeChange={setSelectedTime}
        onRefetchSearch={refetchVenues}
        t={t}
        hasFlowPills={false}
        bookHomeTopBar
        bookMapToggleLabel="Book"
        onBookMapToggle={goBookHome}
        catalogVenueCount={catalogVenueCount}
        exploreMapFetch={fetchExploreMapVenues}
        initialUserLoc={mapUserLoc}
        onUserLocResolved={setMapUserLoc}
        geoInitDone={mapGeoInitDone.current}
        onGeoInitDone={markGeoInitDone}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
