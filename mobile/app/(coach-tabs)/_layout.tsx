import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs, useSegments, useRouter } from 'expo-router';
import { CoachAuthProvider } from '@/context/CoachAuthContext';
import { SessionProvider } from '@/context/SessionContext';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { darkTheme as t } from '@/mobile/lib/theme';

const STACK_ONLY = [
  'coach-session-detail',
  'court-partnership',
  'earnings',
  'availability-editor',
  'login',
  'private-profile',
];

export default function CoachTabsLayout() {
  const segments = useSegments();
  const router = useRouter();

  const currentRoute = segments[segments.length - 1] ?? '';
  const hideTabBar = STACK_ONLY.includes(currentRoute);

  const todayActive = currentRoute === 'today' || currentRoute === '(coach-tabs)';
  const scheduleActive = currentRoute === 'schedule';
  const playersActive = currentRoute === 'players';
  const profileActive = currentRoute === 'profile-settings';

  const goToday = useCallback(() => router.navigate('/(coach-tabs)/today' as any), [router]);
  const goSchedule = useCallback(() => router.navigate('/(coach-tabs)/schedule' as any), [router]);
  const goPlayers = useCallback(() => router.navigate('/(coach-tabs)/players' as any), [router]);
  const goProfile = useCallback(() => router.navigate('/(coach-tabs)/profile-settings' as any), [router]);

  return (
    <CoachAuthProvider>
      <SessionProvider>
        <View style={styles.wrap}>
          <Tabs
            tabBar={() =>
              hideTabBar ? null : (
                <CoachBottomNav
                  key={`coach-bottom-nav-${segments.join('/')}`}
                  todayActive={todayActive}
                  scheduleActive={scheduleActive}
                  playersActive={playersActive}
                  profileActive={profileActive}
                  onToday={goToday}
                  onSchedule={goSchedule}
                  onPlayers={goPlayers}
                  onProfile={goProfile}
                  t={t}
                />
              )
            }
            screenOptions={{ headerShown: false }}
          >
            <Tabs.Screen name="today" options={{ title: 'Today' }} />
            <Tabs.Screen name="schedule" options={{ title: 'Schedule' }} />
            <Tabs.Screen name="players" options={{ title: 'Players' }} />
            <Tabs.Screen name="profile-settings" options={{ title: 'Profile' }} />
            <Tabs.Screen name="availability-editor" options={{ href: null }} />
            <Tabs.Screen name="coach-session-detail" options={{ href: null }} />
            <Tabs.Screen name="court-partnership" options={{ href: null }} />
            <Tabs.Screen name="earnings" options={{ href: null }} />
            <Tabs.Screen name="login" options={{ href: null }} />
            <Tabs.Screen name="private-profile" options={{ href: null }} />
          </Tabs>
        </View>
      </SessionProvider>
    </CoachAuthProvider>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
});
