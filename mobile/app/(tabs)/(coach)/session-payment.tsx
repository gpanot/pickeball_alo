import React, { useCallback, useEffect, useMemo } from 'react';
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
import { useSession } from '@/context/SessionContext';
import { VietQRBlock, SectionHeader, StatusChip } from '@/components/coach';
import { formatVndFull } from '@/lib/formatters';
import { getCoach } from '@/mobile/lib/coach-api';
import type { CoachResult } from '@/mobile/lib/coach-types';
import { spacing, fontSize, borderRadius } from '@/mobile/lib/theme';

export default function SessionPaymentScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { t, userId = '' } = useCourtMap();
  const { currentSession, loading, loadSession, submitPayment } = useSession();
  const [coach, setCoach] = React.useState<CoachResult | null>(null);

  useEffect(() => {
    if (sessionId) loadSession(sessionId);
  }, [sessionId, loadSession]);

  useEffect(() => {
    if (!currentSession?.coachId) {
      setCoach(null);
      return;
    }
    let cancelled = false;
    getCoach(currentSession.coachId)
      .then((c) => {
        if (!cancelled) setCoach(c);
      })
      .catch(() => {
        if (!cancelled) setCoach(null);
      });
    return () => {
      cancelled = true;
    };
  }, [currentSession?.coachId]);

  const session = currentSession;

  const myParticipant = useMemo(
    () => session?.participants.find((p) => p.userId === userId),
    [session, userId],
  );

  const isPaid = myParticipant?.paymentStatus === 'paid' || myParticipant?.paymentStatus === 'confirmed';
  const isSubmitted = myParticipant?.paymentStatus === 'payment_submitted';
  const useCredit = myParticipant?.paymentMethod === 'credit';

  const onPaid = useCallback(async () => {
    if (!session || !userId) return;
    try {
      await submitPayment(session.id, userId, 'manual-confirmation');
      Alert.alert('Payment Submitted', 'The coach will confirm your payment shortly.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to submit payment');
    }
  }, [session, userId, submitPayment]);

  const goToDetail = useCallback(() => {
    if (!session) return;
    router.push({
      pathname: '/(tabs)/(coach)/session-detail',
      params: { sessionId: session.id },
    } as unknown as Href);
  }, [router, session]);

  if (loading && !session) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={t.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top']}>
        <Pressable onPress={router.back} style={styles.backBtn}>
          <Text style={[styles.backText, { color: t.accent }]}>← Back</Text>
        </Pressable>
        <View style={styles.center}>
          <Text style={{ color: t.textSec }}>Session not found</Text>
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
          <Text style={[styles.headerTitle, { color: t.text }]}>Payment</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* Session summary card */}
        <View style={[styles.summaryCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <View style={styles.summaryHeader}>
            <Text style={[styles.summaryCoach, { color: t.text }]}>{session.coachName}</Text>
            <StatusChip status={session.paymentStatus} theme={t} />
          </View>
          <Text style={[styles.summaryDetail, { color: t.textSec }]}>
            {session.date} · {session.startTime} – {session.endTime}
          </Text>
          <Text style={[styles.summaryVenue, { color: t.textSec }]}>{session.venueName}</Text>

          <View style={[styles.feeBreakdown, { borderTopColor: t.border }]}>
            <View style={styles.feeRow}>
              <Text style={[styles.feeLabel, { color: t.textSec }]}>Coach fee</Text>
              <Text style={[styles.feeValue, { color: t.text }]}>{formatVndFull(session.coachFee)}</Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={[styles.feeLabel, { color: t.textSec }]}>Court fee</Text>
              <Text style={[styles.feeValue, { color: t.text }]}>{formatVndFull(session.courtFee)}</Text>
            </View>
            <View style={[styles.feeRow, styles.totalFeeRow, { borderTopColor: t.border }]}>
              <Text style={[styles.totalFeeLabel, { color: t.text }]}>Total</Text>
              <Text style={[styles.totalFeeValue, { color: t.accent }]}>
                {formatVndFull(session.totalPerPlayer)}
              </Text>
            </View>
          </View>
        </View>

        {/* Credit auto-deducted */}
        {useCredit && (
          <View style={[styles.creditDone, { backgroundColor: t.accentBg }]}>
            <Text style={[styles.creditDoneIcon]}>🎫</Text>
            <View style={styles.creditDoneBody}>
              <Text style={[styles.creditDoneTitle, { color: t.accent }]}>Paid with Credit</Text>
              <Text style={[styles.creditDoneDesc, { color: t.textSec }]}>
                1 credit has been automatically deducted from your balance.
              </Text>
            </View>
          </View>
        )}

        {/* Already paid or submitted */}
        {(isPaid || isSubmitted) && !useCredit && (
          <View style={[styles.statusBanner, { backgroundColor: isPaid ? t.green : t.orange }]}>
            <Text style={[styles.statusBannerText, { color: '#fff' }]}>
              {isPaid ? 'Payment confirmed' : 'Payment submitted — awaiting confirmation'}
            </Text>
          </View>
        )}

        {/* VietQR Payment Block */}
        {!isPaid && !isSubmitted && !useCredit && session.coachName && (
          <View style={styles.qrSection}>
            <SectionHeader title="Transfer via VietQR" theme={t} />
            <View style={styles.qrWrap}>
              {coach?.bankName && coach.bankAccountName && coach.bankAccountNumber ? (
                <VietQRBlock
                  bankName={coach.bankName}
                  bankAccountName={coach.bankAccountName}
                  bankAccountNumber={coach.bankAccountNumber}
                  amount={session.totalPerPlayer}
                  memo={`CM-${session.id.slice(0, 8).toUpperCase()}`}
                  onPaid={onPaid}
                  theme={t}
                />
              ) : (
                <View style={[styles.statusBanner, { backgroundColor: t.orange }]}>
                  <Text style={[styles.statusBannerText, { color: '#fff' }]}>
                    Coach bank info is not configured yet.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Actions */}
        {(isPaid || useCredit) && (
          <View style={styles.actionWrap}>
            <Pressable
              onPress={goToDetail}
              style={({ pressed }) => [
                styles.viewDetailBtn,
                { backgroundColor: t.accent, opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Text style={[styles.viewDetailText, { color: t.bg }]}>View Session Detail</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  backBtn: {
    paddingVertical: spacing.md,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryCoach: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    flex: 1,
  },
  summaryDetail: {
    fontSize: fontSize.md,
    marginBottom: 2,
  },
  summaryVenue: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  feeBreakdown: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  feeLabel: {
    fontSize: fontSize.md,
  },
  feeValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  totalFeeRow: {
    borderTopWidth: 1,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  totalFeeLabel: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  totalFeeValue: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  creditDone: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  creditDoneIcon: {
    fontSize: 28,
  },
  creditDoneBody: {
    flex: 1,
  },
  creditDoneTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  creditDoneDesc: {
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.45,
  },
  statusBanner: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  statusBannerText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  qrSection: {
    marginBottom: spacing.lg,
  },
  qrWrap: {
    marginTop: spacing.md,
  },
  actionWrap: {
    marginTop: spacing.lg,
  },
  viewDetailBtn: {
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  viewDetailText: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
});
