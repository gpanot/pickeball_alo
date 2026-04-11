import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BackIcon } from '@/components/Icons';
import { createBooking, updateBooking } from '@/lib/api';
import ContactCourtCTA from '@/components/booking/ContactCourtCTA';
import type { ThemeTokens } from '@/lib/theme';
import type { VenueResult, BookingResult } from '@/lib/types';
import { formatVndFull, formatBookingOrderRef } from '@/lib/formatters';

interface SlotInfo {
  courtName: string;
  time: string;
  price: number;
}

interface BookingFormProps {
  venue: VenueResult;
  selectedSlots: SlotInfo[];
  totalPrice: number;
  searchDate: string;
  userId: string;
  defaultName: string;
  defaultPhone: string;
  editBookingId?: string | null;
  editBooking?: BookingResult | null;
  onPersistPlayerProfile?: (name: string, phone: string) => void;
  onBack: () => void;
  onSuccess: (booking: BookingResult) => void;
  t: ThemeTokens;
}

export default function BookingForm({
  venue,
  selectedSlots,
  totalPrice,
  searchDate,
  userId,
  defaultName,
  defaultPhone,
  editBookingId = null,
  editBooking = null,
  onPersistPlayerProfile,
  onBack,
  onSuccess,
  t,
}: BookingFormProps) {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [supplementaryProofUri, setSupplementaryProofUri] = useState<string | null>(null);

  const isEditingExisting = Boolean(editBookingId && editBookingId !== '');
  const isPaidEdit =
    isEditingExisting &&
    editBooking != null &&
    (editBooking.status === 'payment_submitted' || editBooking.status === 'paid');
  const priceDelta = isPaidEdit ? totalPrice - editBooking!.totalPrice : 0;
  const needsSupplementaryProof = isPaidEdit && priceDelta > 0;
  const isLowerPrice = isPaidEdit && priceDelta < 0;

  useEffect(() => {
    if (isEditingExisting) return;
    setName(defaultName);
    setPhone(defaultPhone);
  }, [defaultName, defaultPhone, isEditingExisting]);

  const pickSupplementaryProof = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.base64) {
      setSupplementaryProofUri(`data:image/jpeg;base64,${asset.base64}`);
    } else {
      setSupplementaryProofUri(asset.uri);
    }
  };

  const handleSubmit = async () => {
    if (isLowerPrice) {
      Alert.alert(
        'Cannot change to a lower price slot',
        'The new slot has a lower price. Please contact the court directly to adjust.',
      );
      return;
    }

    const resolvedName = (isEditingExisting ? defaultName : name).trim();
    const resolvedPhone = (isEditingExisting ? defaultPhone : phone).trim();
    if (!resolvedName || !resolvedPhone) {
      setError('Name and phone number are required');
      return;
    }
    if (needsSupplementaryProof && !supplementaryProofUri) {
      setError('Please upload proof of the additional payment before submitting');
      return;
    }

    setLoading(true);
    setError('');
    const slotsPayload = selectedSlots.map((s) => ({
      courtName: s.courtName,
      time: s.time,
      duration: venue.use30MinSlots !== false ? 30 : 60,
      price: s.price,
    }));
    try {
      const booking =
        editBookingId != null && editBookingId !== ''
          ? await updateBooking(editBookingId, {
              userId,
              userName: resolvedName,
              userPhone: resolvedPhone,
              date: searchDate,
              slots: slotsPayload,
              totalPrice,
              supplementaryProofUrl: supplementaryProofUri ?? undefined,
            })
          : await createBooking({
              venueId: venue.id,
              venueName: venue.name,
              venuePhone: venue.phone || undefined,
              venueAddress: venue.address,
              userId,
              userName: resolvedName,
              userPhone: resolvedPhone,
              date: searchDate,
              slots: slotsPayload,
              totalPrice,
            });
      onPersistPlayerProfile?.(resolvedName, resolvedPhone);
      onSuccess(booking);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send booking request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%' as const,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: t.bgInput,
    borderWidth: 1,
    borderColor: t.border,
    color: t.text,
    fontSize: 15,
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, { color: t.text }]}>
          {isEditingExisting ? 'Update booking' : 'Confirm booking'}
        </Text>

        <View style={[styles.summary, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <Text style={{ fontWeight: '700', fontSize: 16, color: t.text, marginBottom: 8 }}>
            {venue.name}
          </Text>
          <Text style={{ fontSize: 13, color: t.textSec, marginBottom: 12 }}>{searchDate}</Text>
          {selectedSlots.map((s, i) => (
            <View
              key={i}
              style={[
                styles.slotRow,
                { borderTopWidth: i > 0 ? 1 : 0, borderTopColor: t.border },
              ]}
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
            <Text style={{ fontSize: 15, fontWeight: '700', color: t.text }}>Total</Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: t.accent }}>
              {totalPrice >= 1000 ? `${Math.round(totalPrice / 1000)}k` : `${totalPrice}k`}
            </Text>
          </View>
        </View>

        {isPaidEdit && priceDelta !== 0 ? (
          <View
            style={[
              styles.deltaCard,
              {
                backgroundColor: isLowerPrice ? `${t.red}11` : `${t.accent}11`,
                borderColor: isLowerPrice ? t.red : t.accent,
              },
            ]}
          >
            {isLowerPrice ? (
              <>
                <Text style={{ fontSize: 14, fontWeight: '700', color: t.red, marginBottom: 6 }}>
                  Lower price slot selected
                </Text>
                <Text style={{ fontSize: 13, color: t.textSec, lineHeight: 18 }}>
                  The new slot costs {formatVndFull(Math.abs(priceDelta))} less. Please contact the court directly to adjust your booking.
                </Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 14, fontWeight: '700', color: t.accent, marginBottom: 6 }}>
                  Additional payment required
                </Text>
                <Text style={{ fontSize: 13, color: t.textSec, lineHeight: 18 }}>
                  The new slot costs {formatVndFull(priceDelta)} more. Please transfer the difference and upload proof below.
                </Text>
              </>
            )}
          </View>
        ) : null}

        {isLowerPrice && editBooking ? (
          <View style={{ marginBottom: 16 }}>
            <ContactCourtCTA
              bookingRef={formatBookingOrderRef(editBooking.orderId)}
              courtName={venue.name}
              courtPhone={venue.phone}
              courtZalo={venue.zaloId}
              t={t}
            />
          </View>
        ) : null}

        {needsSupplementaryProof ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.label, { color: t.textMuted }]}>
              Proof of additional payment ({formatVndFull(priceDelta)})
            </Text>
            {supplementaryProofUri ? (
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Image
                  source={{ uri: supplementaryProofUri }}
                  style={{ width: 200, height: 200, borderRadius: 12 }}
                  resizeMode="contain"
                />
                <Pressable onPress={pickSupplementaryProof}>
                  <Text style={{ color: t.accent, fontWeight: '700', fontSize: 13 }}>Change image</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={pickSupplementaryProof}
                style={[styles.uploadBtn, { borderColor: t.accent, backgroundColor: t.accentBg }]}
              >
                <Text style={{ color: t.accent, fontWeight: '700', fontSize: 14 }}>
                  Upload payment proof
                </Text>
              </Pressable>
            )}
          </View>
        ) : null}

        {isEditingExisting ? (
          <View
            style={[
              styles.contactReadonly,
              { backgroundColor: t.bgCard, borderColor: t.border },
            ]}
          >
            <Text style={[styles.label, { color: t.textMuted }]}>Your details</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: t.text, marginTop: 4 }}>
              {defaultName.trim() || '—'}
            </Text>
            <Text style={{ fontSize: 14, color: t.textSec, marginTop: 4 }}>{defaultPhone.trim() || '—'}</Text>
            <Text style={{ fontSize: 12, color: t.textMuted, marginTop: 10 }}>
              Change name or phone anytime in Profile.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12, marginBottom: 20 }}>
            <View>
              <Text style={[styles.label, { color: t.textMuted }]}>Name</Text>
              <TextInput
                style={inputStyle}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={t.textMuted}
              />
            </View>
            <View>
              <Text style={[styles.label, { color: t.textMuted }]}>Phone</Text>
              <TextInput
                style={inputStyle}
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
                placeholderTextColor={t.textMuted}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        )}

        {!isEditingExisting && !defaultName && !defaultPhone ? (
          <View style={[styles.hint, { backgroundColor: t.accentBg }]}>
            <Text style={{ fontSize: 12, color: t.textSec }}>
              Your name and phone will be saved on this device for your next booking
            </Text>
          </View>
        ) : null}

        {error ? (
          <Text style={{ fontSize: 13, color: t.red, marginBottom: 12, fontWeight: '600' }}>{error}</Text>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: t.border, backgroundColor: t.sheetBg }]}>
        <Pressable
          onPress={onBack}
          hitSlop={8}
          style={[styles.footerIconBtn, { backgroundColor: t.bgCard, borderColor: t.border }]}
        >
          <BackIcon color={t.text} />
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={loading || isLowerPrice}
          style={[
            styles.footerCta,
            {
              backgroundColor: isLowerPrice ? t.textMuted : t.accent,
              opacity: loading ? 0.7 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.footerCtaText}>
              {isLowerPrice
                ? 'CONTACT COURT TO CHANGE'
                : editBookingId
                  ? 'UPDATE BOOKING REQUEST'
                  : 'SEND BOOKING REQUEST'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 16 },
  screenTitle: { fontSize: 18, fontWeight: '800', marginBottom: 20 },
  summary: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 20 },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
  },
  deltaCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  hint: { padding: 8, borderRadius: 10, marginBottom: 16 },
  contactReadonly: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  uploadBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  footerIconBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerCta: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerCtaText: { color: '#000', fontWeight: '800', fontSize: 14, letterSpacing: 0.3, textAlign: 'center' },
});
