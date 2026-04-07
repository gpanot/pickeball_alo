import React, { memo, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchIcon, PinIcon, HeartIcon, CalendarIcon, CoachIcon } from '@/components/Icons';
import type { ThemeTokens } from '@/lib/theme';

interface BottomNavProps {
  bookActive: boolean;
  mapsActive: boolean;
  savedActive: boolean;
  bookingsActive: boolean;
  coachActive?: boolean;
  onBook: () => void;
  onMaps: () => void;
  onSaved: () => void;
  onMyBookings: () => void;
  onCoach?: () => void;
  savedCount: number;
  t: ThemeTokens;
}

function BottomNav({
  bookActive,
  mapsActive,
  savedActive,
  bookingsActive,
  coachActive,
  onBook,
  onMaps,
  onSaved,
  onMyBookings,
  onCoach,
  savedCount,
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
        <Pressable onPress={onMaps} style={itemBase}>
          <View style={{ opacity: mapsActive ? 1 : 0.7 }}>
            <PinIcon size={22} color={mapsActive ? t.accent : t.textSec} />
          </View>
          <Text style={[styles.label, { color: mapsActive ? t.accent : t.textSec }]}>Maps</Text>
        </Pressable>
        <Pressable onPress={onSaved} style={[itemBase, { position: 'relative' }]}>
          <View style={{ opacity: savedActive ? 1 : 0.7 }}>
            <HeartIcon size={22} fill={savedActive} color={savedActive ? t.accent : t.textSec} />
          </View>
          <Text style={[styles.label, { color: savedActive ? t.accent : t.textSec }]}>Saved</Text>
          {savedCount > 0 && (
            <View style={[styles.badge, { backgroundColor: t.red }]}>
              <Text style={styles.badgeText}>{savedCount > 99 ? '99+' : savedCount}</Text>
            </View>
          )}
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
  badge: {
    position: 'absolute',
    top: 0,
    right: '12%',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});

export default memo(BottomNav);
