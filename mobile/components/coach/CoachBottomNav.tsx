import React, { memo, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeTokens } from '@/mobile/lib/theme';

interface CoachBottomNavProps {
  todayActive: boolean;
  scheduleActive: boolean;
  playersActive: boolean;
  profileActive: boolean;
  onToday: () => void;
  onSchedule: () => void;
  onPlayers: () => void;
  onProfile: () => void;
  t: ThemeTokens;
}

const TABS: {
  key: keyof Pick<CoachBottomNavProps, 'todayActive' | 'scheduleActive' | 'playersActive' | 'profileActive'>;
  cb: keyof Pick<CoachBottomNavProps, 'onToday' | 'onSchedule' | 'onPlayers' | 'onProfile'>;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}[] = [
  { key: 'todayActive', cb: 'onToday', icon: 'home-outline', label: 'Today' },
  { key: 'scheduleActive', cb: 'onSchedule', icon: 'calendar-outline', label: 'Schedule' },
  { key: 'playersActive', cb: 'onPlayers', icon: 'people-outline', label: 'Players' },
  { key: 'profileActive', cb: 'onProfile', icon: 'person-circle-outline', label: 'Profile' },
];

function CoachBottomNav(props: CoachBottomNavProps) {
  const { t } = props;
  const insets = useSafeAreaInsets();

  const itemBase = useMemo(
    () => ({
      flex: 1,
      alignItems: 'center' as const,
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 4,
    }),
    [],
  );

  return (
    <View
      style={[
        styles.nav,
        {
          backgroundColor: t.sheetBg,
          borderTopColor: t.border,
          paddingBottom: Math.max(12, insets.bottom),
        },
      ]}
    >
      <View style={styles.row}>
        {TABS.map((tab) => {
          const active = props[tab.key];
          return (
            <Pressable key={tab.key} onPress={props[tab.cb] as () => void} style={itemBase}>
              <View style={{ opacity: active ? 1 : 0.7 }}>
                <Ionicons
                  name={active ? (tab.icon.replace('-outline', '') as any) : tab.icon}
                  size={22}
                  color={active ? t.accent : t.textSec}
                />
              </View>
              <Text style={[styles.label, { color: active ? t.accent : t.textSec }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    borderTopWidth: 1,
    paddingTop: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default memo(CoachBottomNav);
