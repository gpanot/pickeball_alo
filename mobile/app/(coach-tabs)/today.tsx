import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCoachAuth } from '@/context/CoachAuthContext';
import { useSession } from '@/context/SessionContext';
import { SectionHeader, EmptyState } from '@/components/coach';
import { listCoachCourts } from '@/mobile/lib/coach-api';
import { formatVndFull } from '@/mobile/lib/formatters';
import { spacing, fontSize, borderRadius, darkTheme as t } from '@/mobile/lib/theme';
import type { CoachSessionResult } from '@/mobile/lib/coach-types';

function localYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function greetingLabel(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function statusDot(status: string): string {
  switch (status) {
    case 'confirmed':
    case 'paid':
      return '🟢';
    case 'pending':
    case 'payment_submitted':
      return '🟡';
    case 'canceled':
    case 'cancelled':
      return '🔴';
    default:
      return '⚪';
  }
}

function paymentLabel(p: CoachSessionResult): string {
  const method = p.paymentMethod ?? '';
  const status = p.paymentStatus ?? 'pending';
  if (method === 'credit') return 'Credit';
  if (status === 'paid' || status === 'confirmed') return 'Paid';
  if (status === 'payment_submitted') return 'VietQR (verifying)';
  return 'VietQR (pending)';
}

export default function CoachTodayScreen() {
  const router = useRouter();
  const { coach, loading: authLoading } = useCoachAuth();
  const { sessions, loading: sessionsLoading, loadSessions } = useSession();
  const safeSessions = Array.isArray(sessions) ? sessions : [];

  const todayStr = useMemo(() => localYMD(new Date()), []);

  useEffect(() => {
    if (authLoading) return;
    if (!coach) {
      router.replace('/(coach-tabs)/login' as Href);
      return;
    }
    void loadSessions({ coachId: coach.id });
  }, [authLoading, coach, loadSessions, router]);

  const [hasCourts, setHasCourts] = useState<boolean | null>(null);
  useEffect(() => {
    if (!coach) return;
    listCoachCourts(coach.id)
      .then((courts) => setHasCourts(Array.isArray(courts) && courts.length > 0))
      .catch(() => setHasCourts(false));
  }, [coach]);

  const hasBank = Boolean(coach?.bankAccountNumber);
  const setupComplete = hasCourts === true && hasBank;

  const todaySessions = useMemo(
    () =>
      safeSessions
        .filter((s) => s.date === todayStr && s.status !== 'canceled')
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [safeSessions, todayStr],
  );

  const upcomingSessions = useMemo(
    () =>
      safeSessions
        .filter((s) => s.date > todayStr && s.status !== 'canceled')
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
        .slice(0, 5),
    [safeSessions, todayStr],
  );

  const monthSessions = useMemo(
    () => safeSessions.filter((s) => s.date.slice(0, 7) === todayStr.slice(0, 7) && s.status !== 'canceled'),
    [safeSessions, todayStr],
  );

  const todayEarnings = useMemo(
    () => todaySessions.reduce((sum, s) => sum + (s.coachFee ?? 0), 0),
    [todaySessions],
  );

  const openSession = useCallback(
    (sessionId: string) => {
      router.push({
        pathname: '/(coach-tabs)/coach-session-detail',
        params: { sessionId },
      } as unknown as Href);
    },
    [router],
  );

  const renderTodaySession = useCallback(
    (item: CoachSessionResult) => {
      const typeLabel = item.sessionType === 'group'
        ? `Group (${item.participants.length} player${item.participants.length !== 1 ? 's' : ''})`
        : `Player: ${item.participants[0]?.userName ?? 'TBD'}`;

      return (
        <Pressable
          key={item.id}
          onPress={() => openSession(item.id)}
          style={({ pressed }) => [
            styles.todayCard,
            { backgroundColor: t.bgCard, borderColor: t.border, opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <View style={styles.todayTopRow}>
            <Text style={styles.todayDot}>{statusDot(item.paymentStatus)}</Text>
            <Text style={[styles.todayTime, { color: t.accent }]}>
              {item.startTime} – {item.endTime}
            </Text>
          </View>
          <Text style={[styles.todayPlayer, { color: t.text }]}>{typeLabel}</Text>
          <Text style={[styles.todayVenue, { color: t.textSec }]}>
            {item.venueName}{item.courtName ? ` · ${item.courtName}` : ''}
          </Text>
          <View style={styles.todayMeta}>
            <Text style={[styles.todayType, { color: t.textMuted }]}>
              {item.sessionType === '1on1' ? '1-on-1' : 'Group'} · {paymentLabel(item)}
            </Text>
          </View>
        </Pressable>
      );
    },
    [openSession],
  );

  const renderUpcomingSession = useCallback(
    (item: CoachSessionResult) => {
      const dateLabel = new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      return (
        <Pressable
          key={item.id}
          onPress={() => openSession(item.id)}
          style={({ pressed }) => [
            styles.upcomingCard,
            { backgroundColor: t.bgCard, borderColor: t.border, opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <View style={styles.upcomingLeft}>
            <Text style={[styles.upcomingDate, { color: t.text }]}>{dateLabel}</Text>
            <Text style={[styles.upcomingTime, { color: t.textSec }]}>
              {item.startTime} – {item.endTime}
            </Text>
          </View>
          <View style={styles.upcomingRight}>
            <Text style={[styles.upcomingPlayer, { color: t.text }]} numberOfLines={1}>
              {item.participants[0]?.userName ?? 'TBD'}
            </Text>
            <Text style={[styles.upcomingVenue, { color: t.textMuted }]} numberOfLines={1}>
              {item.venueName}
            </Text>
          </View>
        </Pressable>
      );
    },
    [openSession],
  );

  const headerDate = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    [],
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

  const initial = (coach.name?.trim()?.charAt(0) ?? '?').toUpperCase();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top']}>
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <View style={styles.pageContent}>
            {/* Greeting */}
            <View style={styles.greetRow}>
              <Pressable
                onPress={() => router.push('/(coach-tabs)/private-profile' as Href)}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                {coach.photo ? (
                  <Image source={{ uri: coach.photo }} style={[styles.avatar, { borderColor: t.border }]} />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: t.accentBg, borderColor: t.border }]}>
                    <Text style={[styles.avatarLetter, { color: t.accent }]}>{initial}</Text>
                  </View>
                )}
              </Pressable>
              <View style={styles.greetTextCol}>
                <Text style={[styles.greeting, { color: t.textSec }]}>
                  {greetingLabel(new Date())}, {(coach.name?.trim() || 'Coach').split(/\s+/)[0]}
                </Text>
                <Text style={[styles.dateLabel, { color: t.text }]}>{headerDate}</Text>
              </View>
            </View>

            {/* Quick Stats */}
            <View style={[styles.statsBar, { backgroundColor: t.bgCard, borderColor: t.border }]}>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: t.text }]}>{todaySessions.length}</Text>
                <Text style={[styles.statLabel, { color: t.textSec }]}>Sessions{'\n'}today</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: t.border }]} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: t.text }]}>{monthSessions.length}</Text>
                <Text style={[styles.statLabel, { color: t.textSec }]}>This{'\n'}month</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: t.border }]} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: t.text }]}>
                  {coach.ratingOverall != null ? coach.ratingOverall.toFixed(1) : '—'}
                </Text>
                <Text style={[styles.statLabel, { color: t.textSec }]}>Rating{'\n'}⭐</Text>
              </View>
            </View>

            {/* Setup Checklist */}
            {!setupComplete && hasCourts !== null && (
              <View style={[styles.setupCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                <Text style={[styles.setupTitle, { color: t.text }]}>Get started</Text>
                <Text style={[styles.setupSub, { color: t.textSec }]}>
                  Complete these steps to start receiving bookings.
                </Text>
                <SetupItem
                  done={hasCourts === true}
                  label="Link a court"
                  onPress={() => router.push('/(coach-tabs)/court-partnership' as Href)}
                />
                <SetupItem
                  done={false}
                  label="Set your availability"
                  onPress={() => router.push('/(coach-tabs)/availability-editor' as Href)}
                />
                <SetupItem
                  done={hasBank}
                  label="Add bank details"
                  onPress={() => router.push('/(coach-tabs)/profile-settings' as Href)}
                />
              </View>
            )}

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <QuickAction icon="calendar-outline" label="Availability" onPress={() => router.push('/(coach-tabs)/availability-editor' as Href)} />
              <QuickAction icon="business-outline" label="Courts" onPress={() => router.push('/(coach-tabs)/court-partnership' as Href)} />
              <QuickAction icon="cash-outline" label="Earnings" onPress={() => router.push('/(coach-tabs)/earnings' as Href)} />
            </View>

            {/* Today's Sessions */}
            <SectionHeader title="Today's Sessions" theme={t} />
            {sessionsLoading && todaySessions.length === 0 && (
              <View style={styles.inlineLoad}>
                <ActivityIndicator color={t.accent} />
              </View>
            )}
            {!sessionsLoading && todaySessions.length === 0 && (
              <EmptyState
                title="No sessions today"
                subtitle="Your schedule is clear. Enjoy your time off!"
                theme={t}
              />
            )}
            {todaySessions.map(renderTodaySession)}

            {/* Upcoming */}
            {upcomingSessions.length > 0 && (
              <View style={styles.upcomingSection}>
                <SectionHeader title="Upcoming" theme={t} />
                {upcomingSessions.map(renderUpcomingSession)}
              </View>
            )}

            {/* Today's estimated earnings */}
            {todayEarnings > 0 && (
              <View style={[styles.earningsCard, { backgroundColor: t.accentBg }]}>
                <Text style={[styles.earningsLabel, { color: t.textSec }]}>
                  Estimated earnings today
                </Text>
                <Text style={[styles.earningsValue, { color: t.accent }]}>
                  {formatVndFull(todayEarnings)}
                </Text>
              </View>
            )}
          </View>
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function SetupItem({ done, label, onPress }: { done: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.setupItem}>
      <Ionicons
        name={done ? 'checkmark-circle' : 'ellipse-outline'}
        size={20}
        color={done ? t.green : t.textMuted}
      />
      <Text style={[styles.setupItemLabel, { color: done ? t.textSec : t.text }]}>{label}</Text>
      {!done && <Ionicons name="chevron-forward" size={16} color={t.textMuted} />}
    </Pressable>
  );
}

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quickBtn, { backgroundColor: t.bgCard, borderColor: t.border, opacity: pressed ? 0.88 : 1 }]}
    >
      <Ionicons name={icon as any} size={20} color={t.accent} />
      <Text style={[styles.quickLabel, { color: t.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: {
    paddingBottom: spacing['4xl'],
    flexGrow: 1,
  },
  pageContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  greetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  greetTextCol: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  dateLabel: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingVertical: spacing.lg,
    marginBottom: spacing.xl,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: fontSize.xs * 1.4,
  },
  inlineLoad: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  todayCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  todayTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  todayDot: {
    fontSize: 12,
  },
  todayTime: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  todayPlayer: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  todayVenue: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  todayMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayType: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  upcomingSection: {
    marginTop: spacing['2xl'],
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  upcomingLeft: {
    minWidth: 80,
    marginRight: spacing.md,
  },
  upcomingDate: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  upcomingTime: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  upcomingRight: {
    flex: 1,
    minWidth: 0,
  },
  upcomingPlayer: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  upcomingVenue: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  earningsCard: {
    marginTop: spacing['2xl'],
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  earningsValue: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
  },
  setupCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  setupTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: 2,
  },
  setupSub: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  setupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  setupItemLabel: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  quickLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
