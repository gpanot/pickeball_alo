import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CheckIcon } from '@/components/Icons';
import type { ThemeTokens } from '@/lib/theme';
import type { BookingResult } from '@/lib/types';
import { formatBookingOrderRef } from '@/lib/formatters';

interface BookingConfirmationProps {
  booking: BookingResult;
  onViewBookings: () => void;
  onDone: () => void;
  t: ThemeTokens;
}

export default function BookingConfirmation({
  booking,
  onViewBookings,
  onDone,
  t,
}: BookingConfirmationProps) {
  return (
    <View style={{ paddingVertical: 40, paddingHorizontal: 20, alignItems: 'center' }}>
      <View style={[styles.iconWrap, { backgroundColor: t.accentBgStrong }]}>
        <CheckIcon size={40} color={t.accent} />
      </View>
      <Text style={[styles.title, { color: t.text }]}>Request sent!</Text>
      <Text style={[styles.sub, { color: t.textSec }]}>
        The venue will confirm your booking shortly
      </Text>
      <Text style={[styles.order, { color: t.textMuted }]}>
        Order {formatBookingOrderRef(booking.orderId)}
      </Text>

      <Pressable onPress={onViewBookings} style={[styles.primary, { backgroundColor: t.accent }]}>
        <Text style={styles.primaryText}>VIEW MY BOOKINGS</Text>
      </Pressable>
      <Pressable
        onPress={onDone}
        style={[styles.secondary, { backgroundColor: t.bgCard, borderColor: t.border }]}
      >
        <Text style={[styles.secondaryText, { color: t.text }]}>DONE</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  sub: { fontSize: 14, marginBottom: 8, textAlign: 'center' },
  order: { fontSize: 13, marginBottom: 32 },
  primary: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#000', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  secondary: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryText: { fontWeight: '700', fontSize: 14 },
});
