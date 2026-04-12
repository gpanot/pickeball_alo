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
import { getAloboSlots, getVenue } from '@/mobile/lib/api';
import { spacing, fontSize, borderRadius } from '@/mobile/lib/theme';
import type { VenueResult } from '@/mobile/lib/types';


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

interface AloboVenueSlots { supported: boolean; bookedKeys?: string[] }

interface VenueAvailabilityState {
  available: boolean;
  pricePerHour: number | null;
  totalPrice: number | null;
  slotCount: number;
  hourOnlyConflict: boolean;
}

function addMinutes(t: string, mins: number): string {
  const [h, m] = t.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function parseHmToMinutes(value: string): number | null {
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
  return h * 60 + mm;
}

function detectStepMinutes(venue: VenueResult): 30 | 60 {
  if (venue.use30MinSlots !== false) return 30;
  for (const court of venue.courts) {
    for (const slot of court.slots) {
      if (slot.time.includes(':30')) return 30;
    }
  }
  return 60;
}

function computeVenueAvailability(
  venue: VenueResult | null,
  blockedKeys: Set<string>,
  selectedTime: string | null,
  durationMins: number,
): VenueAvailabilityState {
  const empty: VenueAvailabilityState = { available: false, pricePerHour: null, totalPrice: null, slotCount: 0, hourOnlyConflict: false };
  if (!venue || !venue.courts?.length || !selectedTime) return empty;

  if (venue.use30MinSlots === false && durationMins % 60 !== 0) {
    return { ...empty, hourOnlyConflict: true };
  }

  const startMinute = parseHmToMinutes(selectedTime);
  if (startMinute == null) return empty;

  const stepMinutes = detectStepMinutes(venue);
  const runLen = Math.max(1, Math.round(durationMins / stepMinutes));
  let best: { total: number; perHour: number } | null = null;

  for (const court of venue.courts) {
    const byMinute = new Map<number, { price: number; key: string }>();
    for (const slot of court.slots) {
      const minute = parseHmToMinutes(slot.time);
      if (minute == null) continue;
      const key = `${court.name}|${slot.time}`;
      if (slot.isBooked || blockedKeys.has(key)) continue;
      byMinute.set(minute, { price: slot.price, key });
    }

    let total = 0;
    let ok = true;
    for (let i = 0; i < runLen; i += 1) {
      const slot = byMinute.get(startMinute + i * stepMinutes);
      if (!slot) {
        ok = false;
        break;
      }
      total += slot.price;
    }
    if (!ok) continue;

    const durationHours = durationMins / 60;
    const perHour = durationHours > 0 ? Math.round(total / durationHours) : total;
    if (!best || perHour < best.perHour || (perHour === best.perHour && total < best.total)) {
      best = { total, perHour };
    }
  }

  if (!best) return { available: false, pricePerHour: null, totalPrice: null, slotCount: runLen, hourOnlyConflict: false };
  return { available: true, pricePerHour: best.perHour, totalPrice: best.total, slotCount: runLen, hourOnlyConflict: false };
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
  const [groupExtraPlayers, setGroupExtraPlayers] = useState(0);
  const [venueSlotPrices, setVenueSlotPrices] = useState<Record<string, number | null>>({});
  const [venueDetails, setVenueDetails] = useState<Record<string, VenueResult>>({});
  const [venueAloboBookedKeys, setVenueAloboBookedKeys] = useState<Record<string, Set<string>>>({});
  const [venueLoading, setVenueLoading] = useState(false);

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
    let cancelled = false;
    const fetchPrices = async () => {
      setVenueLoading(true);
      const prices: Record<string, number | null> = {};
      const venueById: Record<string, VenueResult> = {};
      const bookedByVenue: Record<string, Set<string>> = {};
      for (const c of courts) {
        try {
          const [venue, slots] = await Promise.all([
            getVenue(c.venueId, selectedDate),
            getAloboSlots(c.venueId, selectedDate) as Promise<AloboVenueSlots>,
          ]);
          venueById[c.venueId] = venue;
          bookedByVenue[c.venueId] = slots.supported ? new Set(slots.bookedKeys ?? []) : new Set();
          if (__DEV__) {
            console.log('[session-booking] aloboSlots for', c.venueName, ':', JSON.stringify({
              supported: slots.supported,
              courtCount: venue.courts?.length ?? 0,
            }));
          }
          const allPrices = venue.courts.flatMap((ct) => ct.slots.map((s) => s.price)).filter((p) => Number.isFinite(p));
          prices[c.venueId] = allPrices.length > 0 ? Math.min(...allPrices) : (venue.priceMin ?? c.venuePriceMin ?? null);
        } catch {
          prices[c.venueId] = c.venuePriceMin ?? null;
          bookedByVenue[c.venueId] = new Set();
        }
      }
      if (cancelled) return;
      if (__DEV__) console.log('[session-booking] fetched prices:', prices);
      setVenueSlotPrices(prices);
      setVenueDetails(venueById);
      setVenueAloboBookedKeys(bookedByVenue);
      setVenueLoading(false);
    };
    fetchPrices();
    return () => { cancelled = true; };
  }, [selectedDate, courts]);

  const sessionType: '1on1' | 'group' = groupExtraPlayers > 0 ? 'group' : '1on1';
  const maxExtraPlayers = useMemo(() => Math.max(0, (coach?.maxGroupSize ?? 1) - 1), [coach]);
  const venueAvailability = useMemo(() => {
    const out: Record<string, VenueAvailabilityState> = {};
    for (const c of courts) {
      out[c.venueId] = computeVenueAvailability(
        venueDetails[c.venueId] ?? null,
        venueAloboBookedKeys[c.venueId] ?? new Set<string>(),
        selectedTime,
        durationMins,
      );
    }
    return out;
  }, [courts, venueDetails, venueAloboBookedKeys, selectedTime, durationMins]);

  const hasAnyAvailableCourt = useMemo(
    () => courts.length === 0 || courts.some((c) => venueAvailability[c.venueId]?.available),
    [courts, venueAvailability],
  );

  useEffect(() => {
    if (!selectedDate || !selectedTime || courts.length === 0) return;
    const selectedAvailable = selectedVenueId ? venueAvailability[selectedVenueId]?.available : false;
    if (selectedAvailable) return;
    const firstAvailable = courts.find((c) => venueAvailability[c.venueId]?.available);
    setSelectedVenueId(firstAvailable?.venueId ?? null);
  }, [selectedDate, selectedTime, courts, selectedVenueId, venueAvailability]);

  const coachFee = useMemo(() => {
    if (!coach) return 0;
    const extraPerHour = coach.hourlyRateGroup ?? coach.hourlyRate1on1;
    const hourlyRate = coach.hourlyRate1on1 + (groupExtraPlayers * extraPerHour);
    return Math.round(hourlyRate * (durationMins / 60));
  }, [coach, groupExtraPlayers, durationMins]);

  const courtFee = useMemo(() => {
    if (!selectedVenueId) return 0;
    const exact = venueAvailability[selectedVenueId]?.totalPrice;
    if (typeof exact === 'number' && Number.isFinite(exact) && exact > 0) return exact;
    const price = venueSlotPrices[selectedVenueId];
    if (price == null) return 0;
    return Math.round(price * (durationMins / 60));
  }, [selectedVenueId, venueAvailability, venueSlotPrices, durationMins]);

  const totalFee = coachFee + courtFee;

  const selectedVenueAvailable = selectedVenueId ? venueAvailability[selectedVenueId]?.available : courts.length === 0;
  const canBook = Boolean(
    selectedDate &&
    selectedTime &&
    (selectedVenueId || courts.length === 0) &&
    selectedVenueAvailable &&
    hasAnyAvailableCourt &&
    coach &&
    !bookingLoading,
  );

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
        groupExtraPlayers,
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
  }, [canBook, coach, selectedVenueId, selectedDate, selectedTime, durationMins, sessionType, groupExtraPlayers, credit, bookSession, userId, userName, userPhone, router]);

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
            {venueLoading && (
              <View style={styles.venueLoadingRow}>
                <ActivityIndicator size="small" color={t.accent} />
                <Text style={{ color: t.textSec, fontSize: 13 }}>Checking court availability…</Text>
              </View>
            )}
            {!venueLoading && !hasAnyAvailableCourt && (
              <Text style={[styles.noSlots, { color: t.textMuted }]}>
                No courts have open slots at this time. Try another time.
              </Text>
            )}
            <View style={{ gap: spacing.sm, opacity: venueLoading ? 0.4 : 1 }}>
              {courts.map((court) => {
                const active = selectedVenueId === court.venueId;
                const availability = venueAvailability[court.venueId];
                const isAvailable = availability?.available ?? false;
                const isHourOnlyConflict = availability?.hourOnlyConflict ?? false;
                const dist = mapUserLoc && court.venueLat && court.venueLng
                  ? haversineKm(mapUserLoc.lat, mapUserLoc.lng, court.venueLat, court.venueLng)
                  : null;
                const slotPrice = availability?.pricePerHour ?? venueSlotPrices[court.venueId] ?? court.venuePriceMin;
                const courtCount = court.venueCourtCount ?? 0;
                return (
                  <Pressable
                    key={court.id}
                    disabled={!isAvailable}
                    onPress={() => setSelectedVenueId(court.venueId)}
                    style={[
                      styles.courtCard,
                      {
                        backgroundColor: !isAvailable ? t.bg : active ? t.accentBgStrong : t.bgCard,
                        borderColor: isHourOnlyConflict ? '#4A2026' : !isAvailable ? t.border : active ? t.accent : t.border,
                        opacity: isAvailable ? 1 : 0.55,
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
                    {isHourOnlyConflict ? (
                      <View style={[styles.hourOnlyBanner, { backgroundColor: '#2B0D10', borderColor: '#4A2026' }]}>
                        <Text style={{ fontSize: 12, color: '#FF7D7D', lineHeight: 16 }}>
                          This venue only accepts per-hour bookings (1h, 2h). Select a different duration or another venue.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.courtChips}>
                        {courtCount > 0 && (
                          <View style={[styles.courtChip, { backgroundColor: t.accentBg }]}>
                            <Text style={[styles.courtChipText, { color: t.accent }]}>
                              {courtCount} court{courtCount !== 1 ? 's' : ''}
                            </Text>
                          </View>
                        )}
                        <View
                          style={[
                            styles.courtChip,
                            { backgroundColor: isAvailable ? t.accentBg : t.bgCard, borderWidth: 1, borderColor: isAvailable ? t.accent : t.border },
                          ]}
                        >
                          <Text style={[styles.courtChipText, { color: isAvailable ? t.accent : t.textMuted }]}>
                            {isAvailable ? 'Slot available' : 'No slot'}
                          </Text>
                        </View>
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
                    )}
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
                onPress={() => setGroupExtraPlayers(0)}
                style={[
                  styles.typeCard,
                  {
                    backgroundColor: groupExtraPlayers === 0 ? t.accentBgStrong : t.bgCard,
                    borderColor: groupExtraPlayers === 0 ? t.accent : t.border,
                  },
                ]}
              >
                <View style={styles.typeRadio}>
                  <View style={[styles.radioOuter, { borderColor: groupExtraPlayers === 0 ? t.accent : t.textMuted }]}>
                    {groupExtraPlayers === 0 && <View style={[styles.radioInner, { backgroundColor: t.accent }]} />}
                  </View>
                  <Text style={[styles.typeLabel, { color: t.text }]}>1-on-1</Text>
                </View>
                <Text style={[styles.typePrice, { color: t.accent }]}>
                  {formatVndFull(coach?.hourlyRate1on1 ?? 0)}/h
                </Text>
              </Pressable>

              {coach?.hourlyRateGroup != null && (
                <Pressable
                  onPress={() => setGroupExtraPlayers((prev) => Math.min(maxExtraPlayers, Math.max(1, prev + 1)))}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: groupExtraPlayers > 0 ? t.accentBgStrong : t.bgCard,
                      borderColor: groupExtraPlayers > 0 ? t.accent : t.border,
                    },
                  ]}
                >
                  <View style={styles.typeRadio}>
                    <View style={[styles.radioOuter, { borderColor: groupExtraPlayers > 0 ? t.accent : t.textMuted }]}>
                      {groupExtraPlayers > 0 && <View style={[styles.radioInner, { backgroundColor: t.accent }]} />}
                    </View>
                    <Text style={[styles.typeLabel, { color: t.text }]}>
                      {groupExtraPlayers > 0 ? `Group +${groupExtraPlayers}` : 'Group'}
                    </Text>
                  </View>
                  <Text style={[styles.typePrice, { color: t.accent }]}>
                    {formatVndFull(coach.hourlyRateGroup)}/p/h
                  </Text>
                </Pressable>
              )}
            </View>
            {coach?.hourlyRateGroup != null && (
              <Text style={[styles.groupHint, { color: t.textMuted }]}>
                Tap Group to add players ({groupExtraPlayers}/{maxExtraPlayers}).
              </Text>
            )}
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
              <Text style={[styles.summaryLabel, { color: t.textSec }]}>Session</Text>
              <Text style={[styles.summaryValue, { color: t.text }]}>
                {groupExtraPlayers > 0 ? `Group +${groupExtraPlayers}` : '1-on-1'}
              </Text>
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
  hourOnlyBanner: { marginTop: spacing.sm, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  venueLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },

  typeRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  typeCard: { flex: 1, padding: spacing.lg, borderRadius: borderRadius.md, borderWidth: 1.5 },
  typeRadio: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  typeLabel: { fontSize: fontSize.md, fontWeight: '700' },
  typePrice: { fontSize: fontSize.sm, fontWeight: '700' },
  groupHint: { marginTop: spacing.sm, fontSize: fontSize.sm },

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
