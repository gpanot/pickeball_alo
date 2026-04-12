import React from 'react';
import { View, StyleSheet } from 'react-native';
import CourtMapMapScreen from '@/components/screens/CourtMapMapScreen';
import { useCourtMap } from '@/context/CourtMapContext';

export default function ResultsMapRoute() {
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
    onResultsFlowPrimary,
  } = ctx;

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
        onOpenVenue={openDetail}
        onSearchQueryChange={setSearchQuery}
        onDateChange={setSelectedDate}
        onDurationChange={setSelectedDuration}
        onTimeChange={setSelectedTime}
        onRefetchSearch={refetchVenues}
        onToggleView={onResultsFlowPrimary}
        t={t}
        hasFlowPills={false}
        bookHomeTopBar={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
