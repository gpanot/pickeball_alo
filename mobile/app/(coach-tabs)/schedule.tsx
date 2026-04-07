import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { useCoachAuth } from '@/context/CoachAuthContext';
import { useSession } from '@/context/SessionContext';
import { SessionCard, SectionHeader } from '@/components/coach';
import { spacing, fontSize, borderRadius } from '@/mobile/lib/theme';
import { darkTheme as t } from '@/mobile/lib/theme';
import type { CoachSessionResult } from '@/mobile/lib/coach-types';

const COLUMN_WIDTH = 158;

function localYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeekMonday(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + n);
  return copy;
}

export default function CoachScheduleScreen() {
  const router = useRouter();
  const { coach, loading: authLoading } = useCoachAuth();
  const { sessions, loading: sessionsLoading, loadSessions } = useSession();

  const weekDays = useMemo(() => {
    const start = startOfWeekMonday(new Date());
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!coach) {
      router.replace('/(coach-tabs)/login' as Href);
      return;
    }
    void loadSessions({ coachId: coach.id });
  }, [authLoading, coach, loadSessions, router]);

  const sessionsByYmd = useMemo(() => {
    const map = new Map<string, CoachSessionResult[]>();
    for (const s of sessions) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [sessions]);

  const openSession = useCallback(
    (sessionId: string) => {
      router.push({
        pathname: '/(coach-tabs)/coach-session-detail',
        params: { sessionId },
      } as unknown as Href);
    },
    [router],
  );

  if (authLoading || !coach) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={t.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={styles.pagePad}>
        <SectionHeader title="Schedule" theme={t} />
        <Text style={[styles.subtitle, { color: t.textSec }]}>
          Week of {weekDays[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} –{' '}
          {weekDays[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </Text>

        {sessionsLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={t.accent} />
          </View>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekScroll}
        >
          {weekDays.map((day) => {
            const ymd = localYMD(day);
            const daySessions = sessionsByYmd.get(ymd) ?? [];
            const isToday = ymd === localYMD(new Date());

            return (
              <View
                key={ymd}
                style={[
                  styles.dayColumn,
                  { borderColor: t.border, backgroundColor: t.bgSurface },
                  isToday && { borderColor: t.accent, backgroundColor: t.accentBg },
                ]}
              >
                <View style={[styles.dayHeader, { borderBottomColor: t.border }]}>
                  <Text style={[styles.dayName, { color: t.textSec }]}>
                    {day.toLocaleDateString(undefined, { weekday: 'short' })}
                  </Text>
                  <Text style={[styles.dayNum, { color: t.text }]}>{day.getDate()}</Text>
                </View>
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.daySlots}
                >
                  {daySessions.length === 0 ? (
                    <Text style={[styles.emptyDay, { color: t.textMuted }]}>—</Text>
                  ) : (
                    daySessions.map((item) => (
                      <View key={item.id} style={styles.slotCard}>
                        <SessionCard
                          coachName={item.coachName ?? coach.name}
                          venueName={item.venueName}
                          date={item.date}
                          startTime={item.startTime}
                          endTime={item.endTime}
                          sessionType={item.sessionType === 'group' ? 'group' : '1on1'}
                          status={item.paymentStatus}
                          theme={t}
                          onPress={() => openSession(item.id)}
                        />
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagePad: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  loadingRow: {
    paddingVertical: spacing.sm,
    alignItems: 'flex-start',
  },
  weekScroll: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  dayColumn: {
    width: COLUMN_WIDTH,
    maxHeight: 520,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  dayHeader: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  dayName: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dayNum: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    marginTop: 2,
  },
  daySlots: {
    padding: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  slotCard: {
    marginBottom: spacing.xs,
  },
  emptyDay: {
    textAlign: 'center',
    fontSize: fontSize.lg,
    paddingVertical: spacing.xl,
    fontWeight: '600',
  },
});
