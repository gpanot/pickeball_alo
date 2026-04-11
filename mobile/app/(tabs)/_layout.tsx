import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs, useSegments, useRouter } from 'expo-router';
import BottomNav from '@/components/ui/BottomNav';
import { useCourtMap } from '@/context/CourtMapContext';

export default function TabLayout() {
  const segments = useSegments();
  const router = useRouter();
  const ctx = useCourtMap();
  const {
    t,
    hideTabBar,
    goBookTab,
    goMapsTab,
    goSavedTab,
    goMyBookingsTab,
    savedIds,
    userName,
    userPhone,
  } = ctx;

  useEffect(() => {
    const hasPlayerProfile = Boolean(userName?.trim()) && Boolean(userPhone?.trim());
    if (!hasPlayerProfile) {
      router.replace('/onboarding');
    }
  }, [router, userName, userPhone]);

  const notProfile = !segments.includes('profile');
  const bookActive = segments.includes('(book)') && notProfile;
  const mapsActive = segments.includes('maps') && notProfile;
  const savedActive = segments.includes('saved') && notProfile;
  const bookingsActive = segments.includes('(bookings)') && notProfile;
  const coachActive = segments.includes('(coach)') && notProfile;

  const goCoachTab = useCallback(() => {
    router.push('/(tabs)/(coach)');
  }, [router]);

  return (
    <View style={[styles.wrap, { backgroundColor: t.bg }]}>
      <Tabs
        initialRouteName="(book)"
        tabBar={() =>
          hideTabBar ? null : (
            <BottomNav
              key={`player-bottom-nav-${segments.join('/')}`}
              bookActive={bookActive}
              mapsActive={mapsActive}
              savedActive={savedActive}
              bookingsActive={bookingsActive}
              coachActive={coachActive}
              onBook={goBookTab}
              onMaps={goMapsTab}
              onSaved={goSavedTab}
              onMyBookings={goMyBookingsTab}
              onCoach={goCoachTab}
              savedCount={savedIds.size}
              t={t}
            />
          )
        }
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="(book)" options={{ title: 'Book' }} />
        <Tabs.Screen name="maps" options={{ title: 'Maps' }} />
        <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
        <Tabs.Screen name="(coach)" options={{ title: 'Coach' }} />
        <Tabs.Screen name="(bookings)" options={{ title: 'Bookings' }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="edit-gear" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
});
