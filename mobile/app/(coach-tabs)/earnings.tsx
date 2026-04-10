import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { spacing, fontSize, borderRadius } from '@/mobile/lib/theme';
import { darkTheme as t } from '@/mobile/lib/theme';
import { useCoachAuth } from '@/context/CoachAuthContext';
import { SectionHeader, EmptyState } from '@/components/coach';
import { listSessions } from '@/mobile/lib/coach-api';
import { formatVndFull } from '@/mobile/lib/formatters';
import type { CoachSessionResult, SessionParticipantResult } from '@/mobile/lib/coach-types';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function monthKey(y: number, m0: number): string {
  const mm = String(m0 + 1).padStart(2, '0');
  return `${y}-${mm}`;
}

function sessionStatus(s: CoachSessionResult): string | undefined {
  const ext = s as CoachSessionResult & { status?: string };
  return ext.status;
}

function sessionInMonth(session: CoachSessionResult, y: number, m0: number): boolean {
  if (sessionStatus(session) !== 'completed') return false;
  const prefix = monthKey(y, m0);
  return typeof session.date === 'string' && session.date.startsWith(prefix);
}

function playerLabel(session: CoachSessionResult): string {
  const parts = (session.participants ?? []) as SessionParticipantResult[];
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0]!.userName;
  return parts.map((p) => p.userName).join(', ');
}

export default function CoachEarningsScreen() {
  const router = useRouter();
  const { coach } = useCoachAuth();

  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<CoachSessionResult[]>([]);

  const load = useCallback(async () => {
    if (!coach?.id) {
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await listSessions({
        coachId: coach.id,
        status: 'completed',
        limit: 200,
        offset: 0,
      });
      setSessions(Array.isArray(result.sessions) ? result.sessions : []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [coach?.id]);

  useEffect(() => {
    void load();
  }, [load]);


  const monthSessions = useMemo(
    () => sessions.filter((s) => sessionInMonth(s, cursor.y, cursor.m)),
    [sessions, cursor.y, cursor.m],
  );

  const totals = useMemo(() => {
    let total = 0;
    for (const s of monthSessions) {
      total += typeof s.coachFee === 'number' ? s.coachFee : 0;
    }
    const count = monthSessions.length;
    const avg = count > 0 ? Math.round(total / count) : 0;
    return { total, count, avg };
  }, [monthSessions]);

  const monthLabel = `${MONTHS[cursor.m]} ${cursor.y}`;

  const shiftMonth = useCallback((delta: number) => {
    setCursor((prev) => {
      const d = new Date(prev.y, prev.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }, []);

  const renderRow = useCallback(
    ({ item }: { item: CoachSessionResult }) => (
      <View style={[styles.row, { backgroundColor: t.bgCard, borderColor: t.border }]}>
        <View style={styles.rowLeft}>
          <Text style={[styles.rowDate, { color: t.text }]}>{item.date}</Text>
          <Text style={[styles.rowName, { color: t.textSec }]} numberOfLines={1}>
            {playerLabel(item)}
          </Text>
        </View>
        <Text style={[styles.rowAmt, { color: t.accent }]}>{formatVndFull(item.coachFee)}</Text>
      </View>
    ),
    [],
  );

  const listEmpty =
    !loading && totals.count === 0 ? (
      <EmptyState
        title="No earnings this month"
        subtitle="Completed sessions for this month will show up here."
        theme={t}
      />
    ) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.back, { color: t.accent }]}>Back</Text>
        </Pressable>
      </View>

      <View style={styles.header}>
        <SectionHeader title="Earnings" theme={t} />
      </View>

      <View style={[styles.monthRow, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={12} style={styles.monthBtn}>
          <Text style={[styles.monthChevron, { color: t.accent }]}>{'<'}</Text>
        </Pressable>
        <Text style={[styles.monthLabel, { color: t.text }]}>{monthLabel}</Text>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={12} style={styles.monthBtn}>
          <Text style={[styles.monthChevron, { color: t.accent }]}>{'>'}</Text>
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <Text style={[styles.summaryLabel, { color: t.textSec }]}>Total</Text>
          <Text style={[styles.summaryValue, { color: t.text }]}>{formatVndFull(totals.total)}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <Text style={[styles.summaryLabel, { color: t.textSec }]}>Sessions</Text>
          <Text style={[styles.summaryValue, { color: t.text }]}>{totals.count}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <Text style={[styles.summaryLabel, { color: t.textSec }]}>Avg / session</Text>
          <Text style={[styles.summaryValue, { color: t.text }]}>{formatVndFull(totals.avg)}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={t.accent} />
        </View>
      ) : (
        <FlatList
          data={monthSessions}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={listEmpty}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  back: { fontSize: fontSize.md, fontWeight: '600' },
  header: {
    paddingHorizontal: spacing.lg,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  monthBtn: {
    paddingHorizontal: spacing.sm,
    minWidth: 40,
    alignItems: 'center',
  },
  monthChevron: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  monthLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    minWidth: 0,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryValue: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing['4xl'],
    flexGrow: 1,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  rowLeft: {
    flex: 1,
    minWidth: 0,
  },
  rowDate: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  rowName: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  rowAmt: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
