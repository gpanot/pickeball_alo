import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhoneIcon, PinIcon } from '@/components/Icons';
import type { ThemeTokens } from '@/lib/theme';
import type { BookingResult, BookingSlot } from '@/lib/types';

interface BookingDetailScreenProps {
  booking: BookingResult;
  onCancel: (id: string) => void;
  onEditRequest?: (booking: BookingResult) => void;
  t: ThemeTokens;
}

const STEPS = ['pending', 'booked', 'paid'];

export default function BookingDetailScreen({ booking, onCancel, onEditRequest, t }: BookingDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const slots = booking.slots as BookingSlot[];
  const canCancel = booking.status === 'pending' || booking.status === 'booked';
  const canEdit =
    (booking.status === 'pending' || booking.status === 'booked') && onEditRequest != null;
  const isCanceled = booking.status === 'canceled';
  const currentStep = isCanceled ? -1 : STEPS.indexOf(booking.status);

  const confirmCancel = () => {
    Alert.alert(
      'Cancel booking?',
      'This cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', style: 'destructive', onPress: () => onCancel(booking.id) },
      ],
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: t.bg, paddingBottom: insets.bottom + 24 }]}>
      <View style={[styles.timeline, { marginBottom: 24 }]}>
        {STEPS.map((step, i) => {
          const isActive = i <= currentStep;
          const isCurrent = i === currentStep;
          return (
            <React.Fragment key={step}>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: isCanceled ? t.textMuted : isActive ? t.accent : t.bgInput,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: isCurrent ? 2 : 0,
                    borderColor: t.accent,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: isActive && !isCanceled ? '#000' : t.textSec,
                    }}
                  >
                    {i + 1}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 10,
                    color: isActive ? t.text : t.textMuted,
                    fontWeight: '600',
                    textTransform: 'capitalize',
                  }}
                >
                  {step}
                </Text>
              </View>
              {i < STEPS.length - 1 && (
                <View
                  style={{
                    width: 40,
                    height: 2,
                    backgroundColor: i < currentStep ? t.accent : t.border,
                    marginBottom: 18,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
        {isCanceled && (
          <View style={{ alignItems: 'center', gap: 4, marginLeft: 8 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: t.red,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>✕</Text>
            </View>
            <Text style={{ fontSize: 10, color: t.red, fontWeight: '600' }}>Canceled</Text>
          </View>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
        <Text style={{ fontWeight: '700', fontSize: 18, color: t.text, marginBottom: 12 }}>
          {booking.venueName}
        </Text>
        <Text style={{ fontSize: 14, color: t.textSec, marginBottom: 8 }}>Date: {booking.date}</Text>
        {slots.map((s, i) => (
          <View
            key={i}
            style={[styles.slotRow, { borderTopColor: t.border, borderTopWidth: i > 0 ? 1 : 0 }]}
          >
            <Text style={{ fontSize: 14, color: t.text }}>
              {s.courtName}, {s.time}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: t.accent }}>
              {s.price >= 1000 ? `${Math.round(s.price / 1000)}k` : `${s.price}k`}
            </Text>
          </View>
        ))}
        <View style={[styles.totalRow, { borderTopColor: t.border }]}>
          <Text style={{ fontWeight: '700', color: t.text }}>Total</Text>
          <Text style={{ fontWeight: '800', color: t.accent }}>
            {booking.totalPrice >= 1000 ? `${Math.round(booking.totalPrice / 1000)}k` : `${booking.totalPrice}k`}
          </Text>
        </View>
        {booking.notes ? (
          <View style={[styles.notes, { backgroundColor: t.bgInput }]}>
            <Text style={{ fontSize: 13, color: t.textSec }}>{booking.notes}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border, marginTop: 16 }]}>
        <Text style={[styles.section, { color: t.textMuted }]}>Venue Contact</Text>
        {booking.venuePhone ? (
          <Pressable
            onPress={() => void Linking.openURL(`tel:${booking.venuePhone}`)}
            style={styles.contactRow}
          >
            <PhoneIcon color={t.accent} />
            <Text style={{ fontSize: 14, color: t.text }}>{booking.venuePhone}</Text>
          </Pressable>
        ) : null}
        {booking.venueAddress ? (
          <View style={styles.contactRow}>
            <PinIcon color={t.accent} />
            <Text style={{ fontSize: 14, color: t.text, flex: 1 }}>{booking.venueAddress}</Text>
          </View>
        ) : null}
      </View>

      {canEdit ? (
        <Pressable
          onPress={() => onEditRequest!(booking)}
          style={[styles.editFull, { backgroundColor: t.accentBg, borderColor: t.accent, marginTop: 16 }]}
        >
          <Text style={{ color: t.accent, fontWeight: '800', fontSize: 14 }}>Edit request</Text>
        </Pressable>
      ) : null}

      {canCancel ? (
        <Pressable
          onPress={confirmCancel}
          style={[styles.cancelFull, { borderColor: t.red, marginTop: canEdit ? 10 : 16 }]}
        >
          <Text style={{ color: t.red, fontWeight: '700', fontSize: 14 }}>
            {booking.status === 'pending' ? 'Cancel Request' : 'Cancel Booking'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 16, paddingTop: 8 },
  timeline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 4 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1 },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 1,
  },
  notes: { marginTop: 12, padding: 8, borderRadius: 10 },
  section: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  editFull: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelFull: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
});
