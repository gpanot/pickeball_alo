import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BackIcon } from '@/components/Icons';
import ScreenTopBar from '@/components/ui/ScreenTopBar';
import BookingCard from '@/components/booking/BookingCard';
import { useCourtMap } from '@/context/CourtMapContext';
import { listSessions } from '@/mobile/lib/coach-api';
import { SessionCard } from '@/components/coach';
import { spacing, fontSize, borderRadius } from '@/mobile/lib/theme';
import type { BookingResult } from '@/lib/types';
import type { CoachSessionResult } from '@/mobile/lib/coach-types';

type Section = 'courts' | 'coach';
type TabKey = 'upcoming' | 'past' | 'all';

export default function BookingsListRoute() {
  const router = useRouter();
  const ctx = useCourtMap();
  const { t, bookings, bookingsLoading, backFromSavedOrBookings, handleCancelBooking, beginEditBooking, userId, loadBookings } = ctx;

  useFocusEffect(
    useCallback(() => {
      void loadBookings();
    }, [loadBookings]),
  );
  const [section, setSection] = useState<Section>('courts');
  const [tab, setTab] = useState<TabKey>('upcoming');
  const [coachSessions, setCoachSessions] = useState<CoachSessionResult[]>([]);
  const [coachLoading, setCoachLoading] = useState(false);

  useEffect(() => {
    if (section !== 'coach' || !userId) return;
    setCoachLoading(true);
    listSessions({ userId, limit: 100 })
      .then((r) => setCoachSessions(r.sessions))
      .catch(() => setCoachSessions([]))
      .finally(() => setCoachLoading(false));
  }, [section, userId]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const filteredBookings = useMemo(() => {
    if (tab === 'all') return bookings;
    return bookings.filter((b) => {
      const isPast = b.date < today || b.status === 'canceled' || b.status === 'paid';
      return tab === 'upcoming' ? !isPast : isPast;
    });
  }, [bookings, tab, today]);

  const filteredSessions = useMemo(() => {
    if (tab === 'all') return coachSessions;
    return coachSessions.filter((s) => {
      const isPast = s.date < today || s.status === 'canceled' || s.status === 'completed';
      return tab === 'upcoming' ? !isPast : isPast;
    });
  }, [coachSessions, tab, today]);

  const tabStyle = useCallback(
    (key: TabKey) => ({
      flex: 1,
      paddingVertical: 10,
      borderBottomWidth: 2,
      borderBottomColor: tab === key ? t.accent : 'transparent',
    }),
    [tab, t.accent],
  );

  const renderBooking = useCallback(
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

  const renderSession = useCallback(
    ({ item }: { item: CoachSessionResult }) => (
      <View style={{ marginBottom: spacing.md }}>
        <SessionCard
          coachName={item.coachName ?? 'Coach'}
          venueName={item.venueName}
          date={item.date}
          startTime={item.startTime}
          endTime={item.endTime}
          sessionType={item.sessionType === 'group' ? 'group' : '1on1'}
          status={item.status ?? item.paymentStatus}
          theme={t}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/(coach)/session-detail',
              params: { sessionId: item.id },
            } as unknown as Href)
          }
        />
      </View>
    ),
    [router, t],
  );

  const keyExtractorBooking = useCallback((b: BookingResult) => b.id, []);
  const keyExtractorSession = useCallback((s: CoachSessionResult) => s.id, []);

  const isLoading = section === 'courts' ? bookingsLoading : coachLoading;

  const ListEmpty = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.center}>
          <Text style={{ color: t.textSec }}>Loading...</Text>
        </View>
      );
    }
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>📋</Text>
        <Text style={[styles.emptyTitle, { color: t.text }]}>
          {section === 'courts' ? 'No court bookings' : 'No coach sessions'}
        </Text>
        <Text style={{ fontSize: 14, color: t.textSec, textAlign: 'center', marginBottom: 16 }}>
          {section === 'courts'
            ? 'Search for courts to make your first booking'
            : 'Book a session with a coach to get started'}
        </Text>
        {section === 'coach' && (
          <Pressable
            onPress={() => router.push('/(tabs)/(coach)' as any)}
            style={[styles.ctaBtn, { backgroundColor: t.accent }]}
          >
            <Ionicons name="search" size={16} color="#000" />
            <Text style={styles.ctaBtnText}>Find a Coach</Text>
          </Pressable>
        )}
      </View>
    );
  }, [isLoading, t, section]);

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <ScreenTopBar t={t} contentStyle={styles.topBarInner}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Pressable onPress={backFromSavedOrBookings}>
            <BackIcon color={t.text} />
          </Pressable>
          <Text style={[styles.title, { color: t.text }]}>My Bookings</Text>
        </View>

        {/* Segmented control: Court Bookings / Coach Sessions */}
        <View style={[styles.segmentRow, { backgroundColor: t.bgInput, borderColor: t.border }]}>
          <Pressable
            onPress={() => setSection('courts')}
            style={[
              styles.segmentBtn,
              section === 'courts' && { backgroundColor: t.accentBgStrong },
            ]}
          >
            <Text
              style={[
                styles.segmentLabel,
                { color: section === 'courts' ? t.accent : t.textSec },
              ]}
            >
              Court Bookings
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSection('coach')}
            style={[
              styles.segmentBtn,
              section === 'coach' && { backgroundColor: t.accentBgStrong },
            ]}
          >
            <Text
              style={[
                styles.segmentLabel,
                { color: section === 'coach' ? t.accent : t.textSec },
              ]}
            >
              Coach Sessions
            </Text>
          </Pressable>
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

      {section === 'courts' ? (
        <FlatList
          data={filteredBookings}
          renderItem={renderBooking}
          keyExtractor={keyExtractorBooking}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={ListEmpty}
          removeClippedSubviews
        />
      ) : (
        <FlatList
          data={filteredSessions}
          renderItem={renderSession}
          keyExtractor={keyExtractorSession}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={ListEmpty}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBarInner: { paddingTop: 14, paddingBottom: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.xs,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  segmentLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  center: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: borderRadius.md,
  },
  ctaBtnText: {
    color: '#000',
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
});
