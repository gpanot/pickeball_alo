import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { useCourtMap } from '@/context/CourtMapContext';
import { useCoachDiscovery } from '@/context/CoachDiscoveryContext';
import { useSession } from '@/context/SessionContext';
import { useCredits } from '@/context/CreditContext';
import { DatePicker, SectionHeader } from '@/components/coach';
import { PinIcon } from '@/components/Icons';
import { formatVndFull, formatPrice, formatDateFriendly } from '@/lib/formatters';
import { getAloboSlots } from '@/mobile/lib/api';
import { spacing, fontSize, borderRadius } from '@/mobile/lib/theme';


function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const DURATIONS = ['1h', '1h30', '2h'] as const;
const DURATION_MINUTES: Record<string, number> = { '1h': 60, '1h30': 90, '2h': 120 };

function addMinutes(t: string, mins: number): string {
  const [h, m] = t.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function generateStartTimes(
  availability: { startTime: string; endTime: string; isBlocked: boolean; dayOfWeek: number | null; date: string | null }[],
  selectedDate: string,
  durationMins: number,
): string[] {
  const dateObj = new Date(selectedDate + 'T00:00:00');
  const dow = dateObj.getDay();

  const windows = availability.filter((a) => {
    if (a.isBlocked) return false;
    if (a.date) return a.date === selectedDate;
    return a.dayOfWeek === dow;
  });

  const times: string[] = [];
  for (const w of windows) {
    const [sh, sm] = w.startTime.split(':').map(Number);
    const [eh, em] = w.endTime.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    for (let m = startMins; m + durationMins <= endMins; m += 60) {
      times.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    }
  }
  return [...new Set(times)].sort();
}

export default function SessionBookingScreen() {
  const router = useRouter();
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { t, userId = '', userName = '', userPhone = '', mapUserLoc } = useCourtMap();
  const { selectedCoach, loading: coachLoading, selectCoach, loadAvailability, selectedCoachAvailability } =
    useCoachDiscovery();
  const { bookSession, loading: bookingLoading, error: bookingError } = useSession();
  const { getAvailableCredits } = useCredits();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<'1on1' | 'group'>('1on1');
  const [venueSlotPrices, setVenueSlotPrices] = useState<Record<string, number | null>>({});

  useEffect(() => {
    if (coachId) {
      selectCoach(coachId);
      loadAvailability(coachId);
    }
  }, [coachId, selectCoach, loadAvailability]);

  const coach = selectedCoach;
  const credit = useMemo(
    () => (coach ? getAvailableCredits(coach.id) : undefined),
    [coach, getAvailableCredits],
  );

  const onDateSelect = useCallback(
    (date: string) => {
      setSelectedDate(date);
      setSelectedTime(null);
      if (coachId) loadAvailability(coachId, date);
    },
    [coachId, loadAvailability],
  );

  const durationMins = DURATION_MINUTES[DURATIONS[selectedDuration]] ?? 60;

  const startTimes = useMemo(() => {
    if (!selectedDate) return [];
    return generateStartTimes(selectedCoachAvailability, selectedDate, durationMins);
  }, [selectedDate, selectedCoachAvailability, durationMins]);

  useEffect(() => {
    if (selectedTime && !startTimes.includes(selectedTime)) {
      setSelectedTime(null);
    }
  }, [startTimes, selectedTime]);

  const courts = useMemo(() => coach?.courts?.filter((c) => c.isActive) ?? [], [coach]);

  if (__DEV__ && coach) {
    console.log('[session-booking] courts:', JSON.stringify(courts.map(c => ({
      venueName: c.venueName,
      venueLat: c.venueLat,
      venuePriceMin: c.venuePriceMin,
      venueCourtCount: c.venueCourtCount,
    }))));
    console.log('[session-booking] mapUserLoc:', mapUserLoc);
    console.log('[session-booking] venueSlotPrices:', venueSlotPrices);
  }

  useEffect(() => {
    if (courts.length === 1 && !selectedVenueId) {
      setSelectedVenueId(courts[0].venueId);
    }
  }, [courts, selectedVenueId]);

  useEffect(() => {
    if (!selectedDate || courts.length === 0) return;
    const fetchPrices = async () => {
      const prices: Record<string, number | null> = {};
      for (const c of courts) {
        try {
          const slots = await getAloboSlots(c.venueId, selectedDate);
          if (__DEV__) {
            console.log('[session-booking] aloboSlots for', c.venueName, ':', JSON.stringify({
              supported: slots.supported,
              courtCount: slots.courts?.length ?? 0,
              samplePrices: slots.courts?.slice(0, 1).map((ct: { slots: { price: number }[] }) =>
                ct.slots.slice(0, 3).map((s: { price: number }) => s.price),
              ),
            }));
          }
          if (slots.supported && slots.courts) {
            const allPrices = slots.courts.flatMap((ct: { slots: { price: number }[] }) =>
              ct.slots.map((s: { price: number }) => s.price),
            );
            prices[c.venueId] = allPrices.length > 0 ? Math.min(...allPrices) : c.venuePriceMin ?? null;
          } else {
            prices[c.venueId] = c.venuePriceMin ?? null;
          }
        } catch {
          prices[c.venueId] = c.venuePriceMin ?? null;
        }
      }
      if (__DEV__) console.log('[session-booking] fetched prices:', prices);
      setVenueSlotPrices(prices);
    };
    fetchPrices();
  }, [selectedDate, courts]);

  const coachFee = useMemo(() => {
    if (!coach) return 0;
    const hourlyRate = sessionType === '1on1' ? coach.hourlyRate1on1 : (coach.hourlyRateGroup ?? coach.hourlyRate1on1);
    return Math.round(hourlyRate * (durationMins / 60));
  }, [coach, sessionType, durationMins]);

  const courtFee = useMemo(() => {
    if (!selectedVenueId) return 0;
    const price = venueSlotPrices[selectedVenueId];
    if (price == null) return 0;
    return Math.round(price * (durationMins / 60));
  }, [selectedVenueId, venueSlotPrices, durationMins]);

  const totalFee = coachFee + courtFee;

  const canBook = selectedDate && selectedTime && (selectedVenueId || courts.length === 0) && coach && !bookingLoading;

  const onContinue = useCallback(async () => {
    if (!canBook || !coach || !selectedDate || !selectedTime) return;
    const venueId = selectedVenueId ?? coach.courts?.[0]?.venueId;
    if (!venueId) {
      Alert.alert('No venue', 'This coach has no linked court venue.');
      return;
    }

    const paymentMethod = credit && credit.remainingCredits > 0 ? 'credit' : 'vietqr';

    try {
      const session = await bookSession({
        coachId: coach.id,
        venueId,
        date: selectedDate,
        startTime: selectedTime,
        endTime: addMinutes(selectedTime, durationMins),
        sessionType,
        userId,
        userName,
        userPhone,
        paymentMethod,
      });

      if (paymentMethod === 'credit') {
        router.push({
          pathname: '/(tabs)/(coach)/session-detail',
          params: { sessionId: session.id },
        } as unknown as Href);
      } else {
        router.push({
          pathname: '/(tabs)/(coach)/session-payment',
          params: { sessionId: session.id },
        } as unknown as Href);
      }
    } catch (e) {
      Alert.alert('Booking Failed', e instanceof Error ? e.message : 'Please try again');
    }
  }, [canBook, coach, selectedVenueId, selectedDate, selectedTime, durationMins, sessionType, credit, bookSession, userId, userName, userPhone, router]);

  const chip = useCallback(
    (active: boolean) => ({
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 12,
      backgroundColor: active ? t.accent : t.bgCard,
      borderWidth: active ? 0 : 1,
      borderColor: t.border,
    }),
    [t],
  );

  if (coachLoading && !coach) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={t.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={router.back} hitSlop={12}>
            <Text style={[styles.backText, { color: t.accent }]}>← Back</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: t.text }]}>Book Session</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* Coach info */}
        {coach && (
          <View style={styles.coachInfo}>
            <Text style={[styles.coachName, { color: t.text }]}>{coach.name}</Text>
            {coach.courts?.[0] && (
              <Text style={[styles.courtLabel, { color: t.textSec }]}>
                📍 {coach.courts[0].venueName}
              </Text>
            )}
          </View>
        )}

        {/* Date picker */}
        <View style={styles.sectionWrap}>
          <SectionHeader title="Select Date" theme={t} />
          <View style={styles.datePickerWrap}>
            <DatePicker selectedDate={selectedDate} onSelect={onDateSelect} theme={t} />
          </View>
        </View>

        {/* Duration */}
        {selectedDate && (
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionLabel, { color: t.textMuted }]}>DURATION</Text>
            <View style={styles.chipRow}>
              {DURATIONS.map((d, i) => {
                const active = i === selectedDuration;
                return (
                  <Pressable key={d} onPress={() => { setSelectedDuration(i); setSelectedTime(null); }} style={chip(active)}>
                    <Text style={{ color: active ? '#000' : t.text, fontWeight: '700', fontSize: 14 }}>{d}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Start time */}
        {selectedDate && (
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionLabel, { color: t.textMuted }]}>START TIME</Text>
            {startTimes.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScrollRow}>
                {startTimes.map((time) => {
                  const active = selectedTime === time;
                  return (
                    <Pressable key={time} onPress={() => setSelectedTime(time)} style={chip(active)}>
                      <Text style={{ color: active ? '#000' : t.text, fontWeight: '700', fontSize: 14 }}>{time}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={[styles.noSlots, { color: t.textMuted }]}>
                No available times for this date
              </Text>
            )}
          </View>
        )}

        {/* Available Courts */}
        {selectedDate && selectedTime && courts.length > 0 && (
          <View style={styles.sectionWrap}>
            <SectionHeader title="Available Court" theme={t} />
            <View style={{ gap: spacing.sm }}>
              {courts.map((court) => {
                const active = selectedVenueId === court.venueId;
                const dist = mapUserLoc && court.venueLat && court.venueLng
                  ? haversineKm(mapUserLoc.lat, mapUserLoc.lng, court.venueLat, court.venueLng)
                  : null;
                const slotPrice = venueSlotPrices[court.venueId] ?? court.venuePriceMin;
                const courtCount = court.venueCourtCount ?? 0;
                return (
                  <Pressable
                    key={court.id}
                    onPress={() => setSelectedVenueId(court.venueId)}
                    style={[
                      styles.courtCard,
                      {
                        backgroundColor: active ? t.accentBgStrong : t.bgCard,
                        borderColor: active ? t.accent : t.border,
                      },
                    ]}
                  >
                    <View style={styles.courtCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.courtName, { color: t.text }]}>{court.venueName}</Text>
                        <View style={styles.courtMeta}>
                          <PinIcon size={12} color={t.textSec} />
                          <Text style={[styles.courtAddr, { color: t.textSec }]} numberOfLines={1}>
                            {court.venueAddress}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.courtRight}>
                        <View style={[styles.radioOuter, { borderColor: active ? t.accent : t.textMuted }]}>
                          {active && <View style={[styles.radioInner, { backgroundColor: t.accent }]} />}
                        </View>
                      </View>
                    </View>
                    <View style={styles.courtChips}>
                      {courtCount > 0 && (
                        <View style={[styles.courtChip, { backgroundColor: t.accentBg }]}>
                          <Text style={[styles.courtChipText, { color: t.accent }]}>
                            {courtCount} court{courtCount !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                      {slotPrice != null && slotPrice > 0 && (
                        <View style={[styles.courtChip, { backgroundColor: t.accentBg }]}>
                          <Text style={[styles.courtChipText, { color: t.accent }]}>
                            {formatPrice(slotPrice)}/h
                          </Text>
                        </View>
                      )}
                      {dist != null && (
                        <View style={[styles.courtChip, { backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border }]}>
                          <Text style={[styles.courtChipText, { color: t.textSec }]}>
                            {dist.toFixed(1)} km
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Session type */}
        {selectedDate && selectedTime && (
          <View style={styles.sectionWrap}>
            <SectionHeader title="Session Type" theme={t} />
            <View style={styles.typeRow}>
              <Pressable
                onPress={() => setSessionType('1on1')}
                style={[
                  styles.typeCard,
                  {
                    backgroundColor: sessionType === '1on1' ? t.accentBgStrong : t.bgCard,
                    borderColor: sessionType === '1on1' ? t.accent : t.border,
                  },
                ]}
              >
                <View style={styles.typeRadio}>
                  <View style={[styles.radioOuter, { borderColor: sessionType === '1on1' ? t.accent : t.textMuted }]}>
                    {sessionType === '1on1' && <View style={[styles.radioInner, { backgroundColor: t.accent }]} />}
                  </View>
                  <Text style={[styles.typeLabel, { color: t.text }]}>1-on-1</Text>
                </View>
                <Text style={[styles.typePrice, { color: t.accent }]}>
                  {formatVndFull(coach?.hourlyRate1on1 ?? 0)}/h
                </Text>
              </Pressable>

              {coach?.hourlyRateGroup != null && (
                <Pressable
                  onPress={() => setSessionType('group')}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: sessionType === 'group' ? t.accentBgStrong : t.bgCard,
                      borderColor: sessionType === 'group' ? t.accent : t.border,
                    },
                  ]}
                >
                  <View style={styles.typeRadio}>
                    <View style={[styles.radioOuter, { borderColor: sessionType === 'group' ? t.accent : t.textMuted }]}>
                      {sessionType === 'group' && <View style={[styles.radioInner, { backgroundColor: t.accent }]} />}
                    </View>
                    <Text style={[styles.typeLabel, { color: t.text }]}>Group</Text>
                  </View>
                  <Text style={[styles.typePrice, { color: t.accent }]}>
                    {formatVndFull(coach.hourlyRateGroup)}/p/h
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Summary */}
        {selectedDate && selectedTime && (
          <View style={[styles.summaryCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
            <SectionHeader title="Summary" theme={t} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: t.textSec }]}>Date</Text>
              <Text style={[styles.summaryValue, { color: t.text }]}>{formatDateFriendly(selectedDate)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: t.textSec }]}>Time</Text>
              <Text style={[styles.summaryValue, { color: t.text }]}>
                {selectedTime} – {addMinutes(selectedTime, durationMins)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: t.textSec }]}>Duration</Text>
              <Text style={[styles.summaryValue, { color: t.text }]}>{DURATIONS[selectedDuration]}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: t.textSec }]}>Coach fee</Text>
              <Text style={[styles.summaryValue, { color: t.text }]}>{formatVndFull(coachFee)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: t.textSec }]}>Court fee</Text>
              <Text style={[styles.summaryValue, { color: t.text }]}>
                {courtFee > 0 ? formatVndFull(courtFee) : '—'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: t.textSec }]}>Platform fee</Text>
              <Text style={[styles.summaryValue, { color: t.green, fontWeight: '700' }]}>Free</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: t.border }]}>
              <Text style={[styles.totalLabel, { color: t.text }]}>Total</Text>
              <Text style={[styles.totalValue, { color: t.accent }]}>{formatVndFull(totalFee)}</Text>
            </View>
            {credit && credit.remainingCredits > 0 && (
              <View style={[styles.creditRow, { backgroundColor: t.accentBg }]}>
                <Text style={[styles.creditRowText, { color: t.accent }]}>
                  🎫 {credit.remainingCredits} credit{credit.remainingCredits !== 1 ? 's' : ''} available — will be used automatically
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Error */}
        {bookingError && (
          <View style={[styles.errorBanner, { backgroundColor: t.red }]}>
            <Text style={[styles.errorText, { color: '#fff' }]}>{bookingError}</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.stickyBar, { backgroundColor: t.bg, borderTopColor: t.border }]}>
        <Pressable
          onPress={onContinue}
          disabled={!canBook}
          style={({ pressed }) => [
            styles.ctaBtn,
            {
              backgroundColor: canBook ? t.accent : t.border,
              opacity: pressed && canBook ? 0.88 : 1,
            },
          ]}
        >
          {bookingLoading ? (
            <ActivityIndicator color={t.bg} />
          ) : (
            <Text style={[styles.ctaBtnText, { color: canBook ? t.bg : t.textMuted }]}>
              {credit && credit.remainingCredits > 0 ? 'Book with Credit' : 'Continue → Pay'}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: spacing.lg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  backText: { fontSize: fontSize.md, fontWeight: '600' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700' },
  coachInfo: { paddingBottom: spacing.lg },
  coachName: { fontSize: fontSize.xl, fontWeight: '800', letterSpacing: -0.3 },
  courtLabel: { fontSize: fontSize.sm, marginTop: spacing.xs },
  sectionWrap: { paddingBottom: spacing.lg },
  datePickerWrap: { marginTop: spacing.sm, marginHorizontal: -spacing.lg },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipScrollRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  noSlots: { fontSize: fontSize.md, paddingVertical: spacing.lg, textAlign: 'center' },

  courtCard: {
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  courtCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  courtName: { fontSize: fontSize.md, fontWeight: '700' },
  courtMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  courtAddr: { fontSize: fontSize.sm, flex: 1 },
  courtRight: { alignItems: 'center' },
  courtChips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  courtChip: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 20 },
  courtChipText: { fontSize: fontSize.xs, fontWeight: '700' },

  typeRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  typeCard: { flex: 1, padding: spacing.lg, borderRadius: borderRadius.md, borderWidth: 1.5 },
  typeRadio: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  typeLabel: { fontSize: fontSize.md, fontWeight: '700' },
  typePrice: { fontSize: fontSize.sm, fontWeight: '700' },

  summaryCard: { borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.lg },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  summaryLabel: { fontSize: fontSize.md },
  summaryValue: { fontSize: fontSize.md, fontWeight: '600' },
  totalRow: { borderTopWidth: 1, marginTop: spacing.sm, paddingTop: spacing.md },
  totalLabel: { fontSize: fontSize.lg, fontWeight: '700' },
  totalValue: { fontSize: fontSize.lg, fontWeight: '800' },
  creditRow: { marginTop: spacing.md, padding: spacing.md, borderRadius: borderRadius.sm },
  creditRowText: { fontSize: fontSize.sm, fontWeight: '600' },
  errorBanner: { padding: spacing.md, borderRadius: borderRadius.md, marginTop: spacing.md },
  errorText: { fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' },
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['2xl'],
    borderTopWidth: 1,
  },
  ctaBtn: { paddingVertical: spacing.lg, borderRadius: borderRadius.lg, alignItems: 'center' },
  ctaBtnText: { fontSize: fontSize.lg, fontWeight: '800' },
});
