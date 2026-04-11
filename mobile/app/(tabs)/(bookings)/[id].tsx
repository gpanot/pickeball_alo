import React, { useCallback, useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { BackIcon } from '@/components/Icons';
import ScreenTopBar from '@/components/ui/ScreenTopBar';
import BookingDetailScreen from '@/components/booking/BookingDetailScreen';
import { useCourtMap } from '@/context/CourtMapContext';

export default function BookingDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const ctx = useCourtMap();
  const { t, bookings, userId, loadBookings, handleCancelBooking, beginEditBooking } = ctx;

  useFocusEffect(
    useCallback(() => {
      void loadBookings();
    }, [loadBookings]),
  );

  const booking = useMemo(() => bookings.find((b) => b.id === id), [bookings, id]);

  if (!booking) {
    return (
      <View style={[styles.root, { backgroundColor: t.bg }]}>
        <ScreenTopBar t={t} contentStyle={styles.topBarRow}>
          <Pressable onPress={() => router.back()}>
            <BackIcon color={t.text} />
          </Pressable>
        </ScreenTopBar>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <ScreenTopBar t={t} contentStyle={styles.topBarRow}>
        <Pressable onPress={() => router.back()}>
          <BackIcon color={t.text} />
        </Pressable>
        <View style={{ flex: 1 }} />
      </ScreenTopBar>
      <BookingDetailScreen
        booking={booking}
        userId={userId ?? ''}
        onCancel={handleCancelBooking}
        onEditRequest={(bk) => void beginEditBooking(bk)}
        onBookingRefresh={() => void loadBookings()}
        t={t}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 14,
  },
});
