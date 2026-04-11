import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhoneIcon, PinIcon } from '@/components/Icons';
import type { ThemeTokens } from '@/lib/theme';
import type { BookingResult, BookingSlot, VenueResult } from '@/lib/types';
import { formatVndFull, formatDateFriendly } from '@/lib/formatters';
import { getVenue } from '@/lib/api';
import VietQrPaymentPanel from '@/components/booking/VietQrPaymentPanel';

interface BookingDetailScreenProps {
  booking: BookingResult;
  userId: string;
  onCancel: (id: string) => void;
  onEditRequest?: (booking: BookingResult) => void;
  onBookingRefresh?: () => void;
  t: ThemeTokens;
}

const STEP_ORDER = ['pending', 'payment_submitted', 'paid'] as const;
const STEP_LABELS: Record<string, string> = {
  pending: 'Requested',
  payment_submitted: 'Verifying',
  paid: 'Paid',
};

export default function BookingDetailScreen({
  booking,
  userId,
  onCancel,
  onEditRequest,
  onBookingRefresh,
  t,
}: BookingDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const [live, setLive] = useState(booking);
  React.useEffect(() => {
    setLive(booking);
  }, [booking]);

  const slots = live.slots as BookingSlot[];
  const isCanceled = live.status === 'canceled';
  const canCancel = live.status === 'pending' || live.status === 'payment_submitted';
  const canEdit = live.status === 'pending' && onEditRequest != null;
  const currentStep = isCanceled ? -1 : STEP_ORDER.indexOf(live.status as (typeof STEP_ORDER)[number]);

  const [payOpen, setPayOpen] = useState(false);
  const [payVenue, setPayVenue] = useState<VenueResult | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  const openPay = useCallback(async () => {
    setPayOpen(true);
    setPayLoading(true);
    setPayVenue(null);
    try {
      const v = await getVenue(live.venueId, live.date);
      setPayVenue(v);
    } catch {
      setPayVenue(null);
    } finally {
      setPayLoading(false);
    }
  }, [live.venueId, live.date]);

  const confirmCancel = () => {
    const msg =
      live.status === 'payment_submitted'
        ? 'If you already transferred money, contact the venue for a refund. Continue?'
        : 'This cannot be undone.';
    Alert.alert('Cancel booking?', msg, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: () => onCancel(live.id) },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: t.bg, paddingBottom: insets.bottom + 24 }]}>
      <View style={[styles.timeline, { marginBottom: 24 }]}>
        {STEP_ORDER.map((step, i) => {
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
                  }}
                >
                  {STEP_LABELS[step] ?? step}
                </Text>
              </View>
              {i < STEP_ORDER.length - 1 && (
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
          {live.venueName}
        </Text>
        <Text style={{ fontSize: 14, color: t.textSec, marginBottom: 8 }}>Date: {formatDateFriendly(live.date)}</Text>
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
          <Text style={{ fontWeight: '800', color: t.accent }}>{formatVndFull(live.totalPrice)}</Text>
        </View>
        {live.notes ? (
          <View style={[styles.notes, { backgroundColor: t.bgInput }]}>
            <Text style={{ fontSize: 13, color: t.textSec }}>{live.notes}</Text>
          </View>
        ) : null}
      </View>

      {live.status === 'pending' ? (
        <Pressable
          onPress={() => void openPay()}
          style={[styles.payCta, { backgroundColor: t.accent, marginTop: 16 }]}
        >
          <Text style={{ color: '#000', fontWeight: '800', fontSize: 15 }}>Pay now</Text>
        </Pressable>
      ) : null}

      <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border, marginTop: 16 }]}>
        <Text style={[styles.section, { color: t.textMuted }]}>Venue Contact</Text>
        {live.venuePhone ? (
          <Pressable
            onPress={() => void Linking.openURL(`tel:${live.venuePhone}`)}
            style={styles.contactRow}
          >
            <PhoneIcon color={t.accent} />
            <Text style={{ fontSize: 14, color: t.text }}>{live.venuePhone}</Text>
          </Pressable>
        ) : null}
        {live.venueAddress ? (
          <View style={styles.contactRow}>
            <PinIcon color={t.accent} />
            <Text style={{ fontSize: 14, color: t.text, flex: 1 }}>{live.venueAddress}</Text>
          </View>
        ) : null}
      </View>

      {canEdit ? (
        <Pressable
          onPress={() => onEditRequest!(live)}
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
            {live.status === 'pending' ? 'Cancel request' : 'Cancel booking'}
          </Text>
        </Pressable>
      ) : null}

      <Modal visible={payOpen} animationType="slide" onRequestClose={() => setPayOpen(false)}>
        <View style={[styles.modalRoot, { backgroundColor: t.bg, paddingTop: insets.top + 8 }]}>
          <View style={[styles.modalBar, { borderBottomColor: t.border }]}>
            <Pressable onPress={() => setPayOpen(false)} style={{ padding: 12 }}>
              <Text style={{ color: t.accent, fontWeight: '700' }}>Close</Text>
            </Pressable>
            <Text style={{ flex: 1, textAlign: 'center', color: t.text, fontWeight: '800' }}>Pay</Text>
            <View style={{ width: 56 }} />
          </View>
          {payLoading ? (
            <ActivityIndicator size="large" color={t.accent} style={{ marginTop: 40 }} />
          ) : payVenue ? (
            <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 12 }}>
              <VietQrPaymentPanel
                booking={live}
                venue={payVenue}
                userId={userId}
                t={t}
                showSuccessHeader={false}
                onBookingUpdated={(b) => {
                  setLive(b);
                  onBookingRefresh?.();
                }}
              />
            </View>
          ) : (
            <Text style={{ color: t.textSec, textAlign: 'center', marginTop: 32 }}>Could not load venue.</Text>
          )}
        </View>
      </Modal>
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
  payCta: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalRoot: { flex: 1 },
  modalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
});
