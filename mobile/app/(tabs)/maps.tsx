import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import CourtMapMapScreen from '@/components/screens/CourtMapMapScreen';
import { useCourtMap } from '@/context/CourtMapContext';
import type { VenueResult } from '@/lib/types';

export default function MapsTabRoute() {
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
    userName,
    mapUserLoc,
    setMapUserLoc,
    mapGeoInitDone,
  } = ctx;

  const openVenueFromMaps = useCallback(
    (v: VenueResult) => openDetail(v, { presetSlotsFromSearch: false }),
    [openDetail],
  );

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
        onOpenVenue={openVenueFromMaps}
        onSearchQueryChange={setSearchQuery}
        onDateChange={setSelectedDate}
        onDurationChange={setSelectedDuration}
        onTimeChange={setSelectedTime}
        onRefetchSearch={refetchVenues}
        t={t}
        hasFlowPills={false}
        bookHomeTopBar
        catalogVenueCount={catalogVenueCount}
        userName={userName}
        onOpenProfile={() => router.push('/(tabs)/profile')}
        exploreMapFetch={fetchExploreMapVenues}
        initialUserLoc={mapUserLoc}
        onUserLocResolved={setMapUserLoc}
        geoInitDone={mapGeoInitDone.current}
        onGeoInitDone={useCallback(() => { mapGeoInitDone.current = true; }, [mapGeoInitDone])}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
