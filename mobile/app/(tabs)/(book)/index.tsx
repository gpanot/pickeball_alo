import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BookHomeTopBar from '@/components/search/BookHomeTopBar';
import SearchFormFields from '@/components/search/SearchFormFields';
import { SearchIcon } from '@/components/Icons';
import { useCourtMap } from '@/context/CourtMapContext';

export default function SearchRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ctx = useCourtMap();
  const {
    t,
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
  } = ctx;

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <BookHomeTopBar
        catalogVenueCount={catalogVenueCount}
        userName={userName}
        onOpenProfile={() => router.push('/(tabs)/profile')}
        t={t}
      />
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
