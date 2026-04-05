import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { BackIcon } from '@/components/Icons';
import ScreenTopBar from '@/components/ui/ScreenTopBar';
import BookingCard from '@/components/booking/BookingCard';
import { useCourtMap } from '@/context/CourtMapContext';
import type { BookingResult } from '@/lib/types';

type TabKey = 'upcoming' | 'past' | 'all';

export default function BookingsListRoute() {
  const router = useRouter();
  const ctx = useCourtMap();
  const { t, bookings, bookingsLoading, backFromSavedOrBookings, handleCancelBooking, beginEditBooking } = ctx;
  const [tab, setTab] = useState<TabKey>('upcoming');

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const filtered = useMemo(() => {
    if (tab === 'all') return bookings;
    return bookings.filter((b) => {
      const isPast = b.date < today || b.status === 'canceled' || b.status === 'paid';
      return tab === 'upcoming' ? !isPast : isPast;
    });
  }, [bookings, tab, today]);

  const tabStyle = useCallback(
    (key: TabKey) => ({
      flex: 1,
      paddingVertical: 10,
      borderBottomWidth: 2,
      borderBottomColor: tab === key ? t.accent : 'transparent',
    }),
    [tab, t.accent],
  );

  const renderItem = useCallback(
    ({ item: b }: { item: BookingResult }) => (
      <BookingCard
        booking={b}
        onCancel={handleCancelBooking}
        onEdit={(bk) => void beginEditBooking(bk)}
        onPress={() => router.push(`/(tabs)/(bookings)/${b.id}`)}
        t={t}
      />
    ),
    [beginEditBooking, handleCancelBooking, router, t],
  );

  const keyExtractor = useCallback((b: BookingResult) => b.id, []);

  const ListEmpty = useMemo(() => {
    if (bookingsLoading) {
      return (
        <View style={styles.center}>
          <Text style={{ color: t.textSec }}>Loading bookings...</Text>
        </View>
      );
    }
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>📋</Text>
        <Text style={[styles.emptyTitle, { color: t.text }]}>No bookings yet</Text>
        <Text style={{ fontSize: 14, color: t.textSec }}>Search for courts to make your first booking</Text>
      </View>
    );
  }, [bookingsLoading, t]);

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <ScreenTopBar t={t} contentStyle={styles.topBarInner}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Pressable onPress={backFromSavedOrBookings}>
            <BackIcon color={t.text} />
          </Pressable>
          <Text style={[styles.title, { color: t.text }]}>My Bookings</Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <Pressable onPress={() => setTab('upcoming')} style={tabStyle('upcoming')}>
            <Text style={{ textAlign: 'center', fontSize: 13, fontWeight: '700', color: tab === 'upcoming' ? t.accent : t.textSec }}>
              Upcoming
            </Text>
          </Pressable>
          <Pressable onPress={() => setTab('past')} style={tabStyle('past')}>
            <Text style={{ textAlign: 'center', fontSize: 13, fontWeight: '700', color: tab === 'past' ? t.accent : t.textSec }}>
              Past
            </Text>
          </Pressable>
          <Pressable onPress={() => setTab('all')} style={tabStyle('all')}>
            <Text style={{ textAlign: 'center', fontSize: 13, fontWeight: '700', color: tab === 'all' ? t.accent : t.textSec }}>
              All
            </Text>
          </Pressable>
        </View>
      </ScreenTopBar>
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={ListEmpty}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBarInner: { paddingTop: 14, paddingBottom: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  center: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
});
