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
import { DatePicker, TimeSlotGrid, SectionHeader } from '@/components/coach';
import { formatVndFull } from '@/lib/formatters';
import { spacing, fontSize, borderRadius } from '@/mobile/lib/theme';
import type { TimeSlot } from '@/components/coach/TimeSlotGrid';

function addHour(t: string): string {
  const [h, m] = t.split(':').map(Number);
  return `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function SessionBookingScreen() {
  const router = useRouter();
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { t, userId = '', userName = '', userPhone = '' } = useCourtMap();
  const { selectedCoach, loading: coachLoading, selectCoach, loadAvailability, selectedCoachAvailability } =
    useCoachDiscovery();
  const { bookSession, loading: bookingLoading, error: bookingError } = useSession();
  const { getAvailableCredits } = useCredits();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<'1on1' | 'group'>('1on1');

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

  const timeSlots: TimeSlot[] = useMemo(() => {
    if (!selectedDate) return [];
    const dateObj = new Date(selectedDate + 'T00:00:00');
    const dow = dateObj.getDay();

    return selectedCoachAvailability
      .filter((a) => {
        if (a.isBlocked) return false;
        if (a.date) return a.date === selectedDate;
        return a.dayOfWeek === dow;
      })
      .flatMap((a) => {
        const slots: TimeSlot[] = [];
        const [sh] = a.startTime.split(':').map(Number);
        const [eh] = a.endTime.split(':').map(Number);
        for (let h = sh; h < eh; h++) {
          slots.push({
            time: `${String(h).padStart(2, '0')}:00`,
            available: true,
          });
        }
        return slots;
      });
  }, [selectedDate, selectedCoachAvailability]);

  const coachFee = useMemo(() => {
    if (!coach) return 0;
    return sessionType === '1on1' ? coach.hourlyRate1on1 : (coach.hourlyRateGroup ?? coach.hourlyRate1on1);
  }, [coach, sessionType]);

  const courtFee = 0;
  const totalFee = coachFee + courtFee;

  const venueId = useMemo(() => {
    if (!selectedTime || !selectedDate) return null;
    const dateObj = new Date(selectedDate + 'T00:00:00');
    const dow = dateObj.getDay();
    const match = selectedCoachAvailability.find((a) => {
      if (a.isBlocked) return false;
      if (a.date && a.date === selectedDate) {
        const [sh] = a.startTime.split(':').map(Number);
        const [eh] = a.endTime.split(':').map(Number);
        const [selH] = selectedTime.split(':').map(Number);
        return selH >= sh && selH < eh;
      }
      if (a.dayOfWeek === dow) {
        const [sh] = a.startTime.split(':').map(Number);
        const [eh] = a.endTime.split(':').map(Number);
        const [selH] = selectedTime.split(':').map(Number);
        return selH >= sh && selH < eh;
      }
      return false;
    });
    return match?.venueId ?? coach?.courts?.[0]?.venueId ?? null;
  }, [selectedTime, selectedDate, selectedCoachAvailability, coach]);

  const canBook = selectedDate && selectedTime && venueId && coach && !bookingLoading;

  const onContinue = useCallback(async () => {
    if (!canBook || !coach || !venueId || !selectedDate || !selectedTime) return;

    const paymentMethod = credit && credit.remainingCredits > 0 ? 'credit' : 'vietqr';

    try {
      const session = await bookSession({
        coachId: coach.id,
        venueId,
        date: selectedDate,
        startTime: selectedTime,
        endTime: addHour(selectedTime),
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
  }, [canBook, coach, venueId, selectedDate, selectedTime, sessionType, credit, bookSession, userId, userName, userPhone, router]);

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
            <DatePicker
              selectedDate={selectedDate}
              onSelect={onDateSelect}
              theme={t}
            />
          </View>
        </View>

        {/* Time slots */}
        {selectedDate && (
          <View style={styles.sectionWrap}>
            <SectionHeader title={`Available Slots`} theme={t} />
            {timeSlots.length > 0 ? (
              <View style={styles.slotGrid}>
                <TimeSlotGrid
                  slots={timeSlots}
                  selectedTime={selectedTime}
                  onSelect={setSelectedTime}
                  theme={t}
                />
              </View>
            ) : (
              <Text style={[styles.noSlots, { color: t.textMuted }]}>
                No available slots for this date
              </Text>
            )}
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
                  <View
                    style={[
                      styles.radioOuter,
                      { borderColor: sessionType === '1on1' ? t.accent : t.textMuted },
                    ]}
                  >
                    {sessionType === '1on1' && (
                      <View style={[styles.radioInner, { backgroundColor: t.accent }]} />
                    )}
                  </View>
                  <Text style={[styles.typeLabel, { color: t.text }]}>1-on-1</Text>
                </View>
                <Text style={[styles.typePrice, { color: t.accent }]}>
                  {formatVndFull(coach?.hourlyRate1on1 ?? 0)}
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
                    <View
                      style={[
                        styles.radioOuter,
                        { borderColor: sessionType === 'group' ? t.accent : t.textMuted },
                      ]}
                    >
                      {sessionType === 'group' && (
                        <View style={[styles.radioInner, { backgroundColor: t.accent }]} />
                      )}
                    </View>
                    <Text style={[styles.typeLabel, { color: t.text }]}>Group</Text>
                  </View>
                  <Text style={[styles.typePrice, { color: t.accent }]}>
                    {formatVndFull(coach.hourlyRateGroup)}/p
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
              <Text style={[styles.summaryLabel, { color: t.textSec }]}>Coach fee</Text>
              <Text style={[styles.summaryValue, { color: t.text }]}>{formatVndFull(coachFee)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: t.textSec }]}>Court fee</Text>
              <Text style={[styles.summaryValue, { color: t.text }]}>{formatVndFull(courtFee)}</Text>
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
  backText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  coachInfo: {
    paddingBottom: spacing.lg,
  },
  coachName: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  courtLabel: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  sectionWrap: {
    paddingBottom: spacing.lg,
  },
  datePickerWrap: {
    marginTop: spacing.sm,
    marginHorizontal: -spacing.lg,
  },
  slotGrid: {
    marginTop: spacing.md,
  },
  noSlots: {
    fontSize: fontSize.md,
    paddingVertical: spacing.lg,
    textAlign: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  typeCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  typeRadio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  typeLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  typePrice: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.md,
  },
  summaryValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  creditRow: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
  },
  creditRowText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  errorBanner: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
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
  ctaBtn: {
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  ctaBtnText: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
});
