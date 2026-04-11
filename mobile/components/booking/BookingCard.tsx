import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import type { ThemeTokens } from '@/lib/theme';
import type { BookingResult, BookingSlot } from '@/lib/types';
import { formatVndFull, formatDateFriendly } from '@/lib/formatters';

interface BookingCardProps {
  booking: BookingResult;
  onCancel: (id: string) => void;
  onEdit?: (booking: BookingResult) => void;
  onPress: () => void;
  t: ThemeTokens;
}

const STATUS_CONFIG: Record<string, { label: string; colorKey: 'orange' | 'green' | 'blue' | 'red' }> = {
  pending: { label: 'Pending payment', colorKey: 'orange' },
  payment_submitted: { label: 'Verifying payment', colorKey: 'orange' },
  paid: { label: 'Confirmed & paid', colorKey: 'blue' },
  canceled: { label: 'Canceled', colorKey: 'red' },
};

function BookingCard({ booking, onCancel, onEdit, onPress, t }: BookingCardProps) {
  const config = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const slots = booking.slots as BookingSlot[];
  const isCanceled = booking.status === 'canceled';
  const canCancel = booking.status === 'pending';
  const canEdit = booking.status !== 'canceled' && onEdit != null;
  const statusColor = t[config.colorKey];

  const requestCancel = () => {
    Alert.alert('Cancel booking?', 'This cannot be undone.', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: () => onCancel(booking.id) },
    ]);
  };

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: t.bgCard, borderColor: t.border },
        isCanceled && { opacity: 0.5 },
      ]}
    >
      <View style={styles.header}>
        <Text style={{ fontWeight: '700', fontSize: 16, color: t.text, flex: 1 }}>{booking.venueName}</Text>
        <View style={[styles.badge, { backgroundColor: `${statusColor}22` }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor }}>{config.label}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 13, color: t.textSec, marginBottom: 4 }}>
        {formatDateFriendly(booking.date)} · {slots.map((s) => s.time).join(', ')}
      </Text>
      <Text style={{ fontSize: 13, color: t.textSec, marginBottom: 4 }}>
        {slots.map((s) => s.courtName).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
      </Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color: t.accent, marginTop: 8 }}>
        {formatVndFull(booking.totalPrice)}
      </Text>
      <View style={styles.actions}>
        {booking.status === 'pending' ? (
          <Pressable
            onPress={(e) => {
              e?.stopPropagation?.();
              onPress();
            }}
            style={[styles.payBtn, { backgroundColor: t.accent }]}
          >
            <Text style={{ color: '#000', fontSize: 12, fontWeight: '800' }}>Pay now</Text>
          </Pressable>
        ) : booking.status === 'payment_submitted' ? (
          <Pressable
            onPress={(e) => {
              e?.stopPropagation?.();
              onPress();
            }}
            style={[styles.secondaryBtn, { borderColor: t.accent }]}
          >
            <Text style={{ color: t.accent, fontSize: 12, fontWeight: '700' }}>View progress</Text>
          </Pressable>
        ) : null}
        {canEdit ? (
          <Pressable
            onPress={(e) => {
              e?.stopPropagation?.();
              onEdit!(booking);
            }}
            style={[styles.secondaryBtn, { borderColor: t.accent }]}
          >
            <Text style={{ color: t.accent, fontSize: 12, fontWeight: '700' }}>Edit request</Text>
          </Pressable>
        ) : null}
        {canCancel ? (
          <Pressable
            onPress={(e) => {
              e?.stopPropagation?.();
              requestCancel();
            }}
            style={[styles.cancelBtn, { borderColor: t.red }]}
          >
            <Text style={{ color: t.red, fontSize: 12, fontWeight: '700' }}>Cancel</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  badge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 8 },
  actions: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  payBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  secondaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
});

export default memo(BookingCard);
