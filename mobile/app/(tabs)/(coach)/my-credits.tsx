import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { spacing, fontSize, borderRadius } from '@/mobile/lib/theme';
import { useCourtMap } from '@/context/CourtMapContext';
import { useCredits } from '@/context/CreditContext';
import { CreditBadge, SectionHeader, EmptyState } from '@/components/coach';
import type { CreditResult } from '@/mobile/lib/coach-types';

type HeaderRow = { kind: 'header'; coachId: string; coachName: string };
type CreditRow = { kind: 'credit'; credit: CreditResult };
type ListRow = HeaderRow | CreditRow;

function formatExpiry(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusLabel(paymentStatus: string): string {
  if (paymentStatus === 'pending') return 'Awaiting payment';
  if (paymentStatus === 'confirmed') return 'Active';
  return paymentStatus.replace(/_/g, ' ');
}

export default function MyCreditsScreen() {
  const router = useRouter();
  const { t, userId: ctxUserId } = useCourtMap();
  const userId = ctxUserId?.trim() ? ctxUserId : 'anon';

  const { credits, loading, error, loadCredits } = useCredits();

  useEffect(() => {
    if (!userId || userId === 'anon') return;
    void loadCredits(userId);
  }, [userId, loadCredits]);

  const rows = useMemo((): ListRow[] => {
    const byCoach = new Map<string, CreditResult[]>();
    for (const c of credits) {
      const list = byCoach.get(c.coachId) ?? [];
      list.push(c);
      byCoach.set(c.coachId, list);
    }
    const coachIds = [...byCoach.keys()].sort((a, b) => {
      const na = byCoach.get(a)?.[0]?.coachName ?? a;
      const nb = byCoach.get(b)?.[0]?.coachName ?? b;
      return na.localeCompare(nb);
    });
    const out: ListRow[] = [];
    for (const coachId of coachIds) {
      const group = byCoach.get(coachId) ?? [];
      const coachName = group[0]?.coachName?.trim() || 'Coach';
      out.push({ kind: 'header', coachId, coachName });
      group.sort((x, y) => x.expiresAt.localeCompare(y.expiresAt));
      for (const credit of group) {
        out.push({ kind: 'credit', credit });
      }
    }
    return out;
  }, [credits]);

  const onBuyCredits = useCallback(() => {
    router.push('/(tabs)/(coach)/buy-credit-pack' as Href);
  }, [router]);

  const onRowPress = useCallback(
    (coachId: string) => {
      router.push({
        pathname: '/(tabs)/(coach)/coach-profile',
        params: { coachId },
      } as unknown as Href);
    },
    [router],
  );

  const renderItem: ListRenderItem<ListRow> = useCallback(
    ({ item }) => {
      if (item.kind === 'header') {
        return (
          <View style={styles.sectionPad}>
            <SectionHeader title={item.coachName} theme={t} />
          </View>
        );
      }
      const { credit } = item;
      const pending = credit.paymentStatus === 'pending';
      return (
        <Pressable
          onPress={() => onRowPress(credit.coachId)}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: t.bgCard,
              borderColor: t.border,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <View style={styles.cardTop}>
            <Text style={[styles.coachName, { color: t.text }]} numberOfLines={1}>
              {credit.coachName ?? 'Coach'}
            </Text>
            <CreditBadge remaining={credit.remainingCredits} total={credit.totalCredits} theme={t} />
          </View>
          <Text style={[styles.meta, { color: t.textSec }]}>
            Expires {formatExpiry(credit.expiresAt)}
          </Text>
          <Text
            style={[
              styles.status,
              { color: pending ? t.orange : credit.paymentStatus === 'confirmed' ? t.green : t.textSec },
            ]}
          >
            {statusLabel(credit.paymentStatus)}
          </Text>
        </Pressable>
      );
    },
    [onRowPress, t],
  );

  const keyExtractor = useCallback((item: ListRow) => {
    if (item.kind === 'header') return `h-${item.coachId}`;
    return `c-${item.credit.id}`;
  }, []);

  const showEmpty = !loading && credits.length === 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <Text style={[styles.title, { color: t.text }]}>My credits</Text>
      </View>

      {error ? (
        <View style={styles.centerPad}>
          <Text style={[styles.err, { color: t.red }]}>{error}</Text>
        </View>
      ) : null}

      {loading && credits.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={t.accent} />
        </View>
      ) : null}

      {showEmpty ? (
        <EmptyState
          icon="🎾"
          title="No credits yet"
          subtitle="Buy a credit pack from a coach to book sessions faster."
          actionLabel="Buy Credits"
          onAction={onBuyCredits}
          theme={t}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={<View style={styles.fabSpacer} />}
        />
      )}

      {!showEmpty ? (
        <Pressable
          onPress={onBuyCredits}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: t.accent, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={[styles.fabLabel, { color: t.bg }]}>Buy Credits</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '800',
  },
  centerPad: {
    paddingHorizontal: spacing.lg,
  },
  err: {
    fontSize: fontSize.sm,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing['4xl'],
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['5xl'],
  },
  sectionPad: {
    marginTop: spacing.md,
  },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  coachName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  meta: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  status: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing['2xl'],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    elevation: 6,
  },
  fabLabel: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  fabSpacer: {
    height: spacing['5xl'],
  },
});
