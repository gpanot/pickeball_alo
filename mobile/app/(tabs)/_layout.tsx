import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs, useSegments } from 'expo-router';
import BottomNav from '@/components/ui/BottomNav';
import { useCourtMap } from '@/context/CourtMapContext';

export default function TabLayout() {
  const segments = useSegments();
  const ctx = useCourtMap();
  const {
    t,
    hideTabBar,
    goBookTab,
    goMapsTab,
    goSavedTab,
    goMyBookingsTab,
    savedIds,
  } = ctx;

  const notProfile = !segments.includes('profile');
  const bookActive = segments.includes('(book)') && notProfile;
  const mapsActive = segments.includes('maps') && notProfile;
  const savedActive = segments.includes('saved') && notProfile;
  const bookingsActive = segments.includes('(bookings)') && notProfile;

  const renderTabBar = useCallback(
    () =>
      hideTabBar ? null : (
        <BottomNav
          bookActive={bookActive}
          mapsActive={mapsActive}
          savedActive={savedActive}
          bookingsActive={bookingsActive}
          onBook={goBookTab}
          onMaps={goMapsTab}
          onSaved={goSavedTab}
          onMyBookings={goMyBookingsTab}
          savedCount={savedIds.size}
          t={t}
        />
      ),
    [hideTabBar, bookActive, mapsActive, savedActive, bookingsActive, goBookTab, goMapsTab, goSavedTab, goMyBookingsTab, savedIds.size, t],
  );

  return (
    <View style={[styles.wrap, { backgroundColor: t.bg }]}>
      <Tabs
        initialRouteName="(book)"
        tabBar={renderTabBar}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="(book)" options={{ title: 'Book' }} />
        <Tabs.Screen name="maps" options={{ title: 'Maps' }} />
        <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
        <Tabs.Screen name="(bookings)" options={{ title: 'Bookings' }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
});
