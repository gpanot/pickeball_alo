import React, { memo, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchIcon, CalendarIcon, CoachIcon } from '@/components/Icons';
import type { ThemeTokens } from '@/lib/theme';

interface BottomNavProps {
  bookActive: boolean;
  bookingsActive: boolean;
  coachActive?: boolean;
  onBook: () => void;
  onMyBookings: () => void;
  onCoach?: () => void;
  t: ThemeTokens;
}

function BottomNav({
  bookActive,
  bookingsActive,
  coachActive,
  onBook,
  onMyBookings,
  onCoach,
  t,
}: BottomNavProps) {
  const insets = useSafeAreaInsets();

  const itemBase = useMemo(() => ({
    flex: 1,
    alignItems: 'center' as const,
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
  }), []);

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
        <Pressable onPress={onBook} style={itemBase}>
          <View style={{ opacity: bookActive ? 1 : 0.7 }}>
            <SearchIcon color={bookActive ? t.accent : t.textSec} />
          </View>
          <Text style={[styles.label, { color: bookActive ? t.accent : t.textSec }]}>Book</Text>
        </Pressable>
        {onCoach && (
          <Pressable onPress={onCoach} style={itemBase}>
            <View style={{ opacity: coachActive ? 1 : 0.7 }}>
              <CoachIcon size={22} color={coachActive ? t.accent : t.textSec} />
            </View>
            <Text style={[styles.label, { color: coachActive ? t.accent : t.textSec }]}>Coach</Text>
          </Pressable>
        )}
        <Pressable onPress={onMyBookings} style={itemBase}>
          <View style={{ opacity: bookingsActive ? 1 : 0.7 }}>
            <CalendarIcon color={bookingsActive ? t.accent : t.textSec} />
          </View>
          <Text style={[styles.label, { color: bookingsActive ? t.accent : t.textSec }]}>
            My bookings
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    borderTopWidth: 1,
    paddingTop: 6,
  },
  row: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
});

export default memo(BottomNav);
