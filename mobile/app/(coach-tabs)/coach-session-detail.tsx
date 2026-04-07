import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { spacing, fontSize, borderRadius } from '@/mobile/lib/theme';
import { darkTheme as t } from '@/mobile/lib/theme';
import { useCoachAuth } from '@/context/CoachAuthContext';
import { StatusChip, SectionHeader, BottomSheet } from '@/components/coach';
import { API_BASE_URL } from '@/mobile/lib/config';
import { flagPayment, getSession, updateSessionStatus } from '@/mobile/lib/coach-api';
import type { SessionParticipantResult } from '@/mobile/lib/coach-types';

const FLAGS_MAX = 3;

type SessionDetail = {
  id: string;
  coachId: string;
  venueName: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionType: string;
  status: string;
  paymentStatus: string;
  participants: SessionParticipantResult[];
};

function normalizeSession(raw: unknown): SessionDetail | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== 'string') return null;
  return {
    id: s.id,
    coachId: typeof s.coachId === 'string' ? s.coachId : '',
    venueName: typeof s.venueName === 'string' ? s.venueName : '—',
    date: typeof s.date === 'string' ? s.date : '',
    startTime: typeof s.startTime === 'string' ? s.startTime : '',
    endTime: typeof s.endTime === 'string' ? s.endTime : '',
    sessionType: typeof s.sessionType === 'string' ? s.sessionType : '',
    status: typeof s.status === 'string' ? s.status : '',
    paymentStatus: typeof s.paymentStatus === 'string' ? s.paymentStatus : '',
    participants: Array.isArray(s.participants) ? (s.participants as SessionParticipantResult[]) : [],
  };
}

function proofImageUri(url: string | null | undefined, base: string): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (u.startsWith('/')) return `${base}${u}`;
  return `${base}/${u}`;
}

export default function CoachSessionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const sessionId =
    typeof params.sessionId === 'string' ? params.sessionId : params.sessionId?.[0];

  const { coach, token, isLoggedIn } = useCoachAuth();
  const base = API_BASE_URL.replace(/\/$/, '');

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [flagSheetOpen, setFlagSheetOpen] = useState(false);
  const [flagsRemainingHint, setFlagsRemainingHint] = useState(FLAGS_MAX);

  const load = useCallback(async () => {
    if (!sessionId) {
      setSession(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const raw = await getSession(sessionId);
      setSession(normalizeSession(raw));
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/(coach-tabs)/login');
    }
  }, [isLoggedIn, router]);

  const isCoachSession = session && coach && session.coachId === coach.id;

  const completeSession = useCallback(async () => {
    if (!sessionId || !token) {
      Alert.alert('Sign in required', 'Coach token is required to update this session.');
      return;
    }
    setActionBusy(true);
    try {
      const raw = await updateSessionStatus(sessionId, token, 'completed');
      setSession(normalizeSession(raw));
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Request failed');
    } finally {
      setActionBusy(false);
    }
  }, [sessionId, token]);

  const onConfirmFlagPayment = useCallback(async () => {
    if (!sessionId || !token) {
      Alert.alert('Sign in required', 'Coach token is required.');
      return;
    }
    setFlagSheetOpen(false);
    setActionBusy(true);
    try {
      await flagPayment(sessionId, token);
      setFlagsRemainingHint((n) => Math.max(0, n - 1));
      await load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not flag payment');
    } finally {
      setActionBusy(false);
    }
  }, [sessionId, token, load]);

  const showPaymentActions = session?.paymentStatus === 'payment_submitted';
  const showMarkComplete =
    session?.status === 'confirmed' && session.paymentStatus !== 'payment_submitted';

  if (!sessionId) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Text style={[styles.backLabel, { color: t.accent }]}>Back</Text>
          </Pressable>
        </View>
        <Text style={[styles.muted, { color: t.textSec }]}>Missing session id.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Text style={[styles.backLabel, { color: t.accent }]}>Back</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={t.accent} />
        </View>
      ) : !session ? (
        <Text style={[styles.muted, { color: t.textSec }]}>Session not found.</Text>
      ) : !isCoachSession ? (
        <Text style={[styles.muted, { color: t.textSec }]}>You can only manage your own sessions.</Text>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <SectionHeader title="Session" theme={t} />

          <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
            <Text style={[styles.rowLabel, { color: t.textSec }]}>Date</Text>
            <Text style={[styles.rowValue, { color: t.text }]}>{session.date}</Text>
            <Text style={[styles.rowLabel, { color: t.textSec, marginTop: spacing.sm }]}>Time</Text>
            <Text style={[styles.rowValue, { color: t.text }]}>
              {session.startTime} – {session.endTime}
            </Text>
            <Text style={[styles.rowLabel, { color: t.textSec, marginTop: spacing.sm }]}>Venue</Text>
            <Text style={[styles.rowValue, { color: t.text }]}>{session.venueName}</Text>
            <Text style={[styles.rowLabel, { color: t.textSec, marginTop: spacing.sm }]}>Type</Text>
            <Text style={[styles.rowValue, { color: t.text }]}>{session.sessionType}</Text>
            <View style={styles.statusRow}>
              <Text style={[styles.rowLabel, { color: t.textSec }]}>Session status</Text>
              <StatusChip status={session.status} theme={t} />
            </View>
            <View style={styles.statusRow}>
              <Text style={[styles.rowLabel, { color: t.textSec }]}>Payment</Text>
              <StatusChip status={session.paymentStatus} theme={t} />
            </View>
          </View>

          <SectionHeader title="Participants" theme={t} />
          {session.participants.map((p) => {
            const uri = proofImageUri(p.paymentProofUrl, base);
            return (
              <View
                key={p.id}
                style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}
              >
                <View style={styles.participantTop}>
                  <View style={styles.participantText}>
                    <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                      {p.userName}
                    </Text>
                    <Text style={[styles.phone, { color: t.textSec }]} numberOfLines={1}>
                      {p.userPhone}
                    </Text>
                  </View>
                  <StatusChip status={p.paymentStatus} theme={t} />
                </View>
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={[styles.proofImage, { backgroundColor: t.bgInput }]}
                    resizeMode="cover"
                  />
                ) : null}
              </View>
            );
          })}

          {showPaymentActions ? (
            <View style={styles.actions}>
              <Pressable
                disabled={actionBusy || !token}
                onPress={() => setFlagSheetOpen(true)}
                style={({ pressed }) => [
                  styles.btnSecondary,
                  {
                    borderColor: t.border,
                    backgroundColor: t.bgSurface,
                    opacity: pressed || actionBusy ? 0.75 : 1,
                  },
                ]}
              >
                <Text style={[styles.btnSecondaryText, { color: t.text }]}>Flag Payment</Text>
              </Pressable>
              <Pressable
                disabled={actionBusy || !token}
                onPress={completeSession}
                style={({ pressed }) => [
                  styles.btnPrimary,
                  {
                    backgroundColor: t.accent,
                    opacity: pressed || actionBusy ? 0.88 : 1,
                  },
                ]}
              >
                <Text style={[styles.btnPrimaryText, { color: t.bg }]}>Confirm Payment</Text>
              </Pressable>
            </View>
          ) : null}

          {showMarkComplete ? (
            <View style={styles.actions}>
              <Pressable
                disabled={actionBusy || !token}
                onPress={completeSession}
                style={({ pressed }) => [
                  styles.btnPrimary,
                  {
                    backgroundColor: t.accent,
                    opacity: pressed || actionBusy ? 0.88 : 1,
                  },
                ]}
              >
                <Text style={[styles.btnPrimaryText, { color: t.bg }]}>Mark Complete</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      )}

      <BottomSheet visible={flagSheetOpen} onClose={() => setFlagSheetOpen(false)} theme={t}>
        <Text style={[styles.sheetTitle, { color: t.text }]}>Flag this payment?</Text>
        <Text style={[styles.sheetBody, { color: t.textSec }]}>
          Payment will be reverted to pending. The player will be notified. You have {flagsRemainingHint} flags
          remaining (max {FLAGS_MAX} lifetime; server enforces the real balance).
        </Text>
        <View style={styles.sheetActions}>
          <Pressable
            onPress={() => setFlagSheetOpen(false)}
            style={({ pressed }) => [
              styles.btnSecondary,
              {
                borderColor: t.border,
                backgroundColor: t.bgSurface,
                flex: 1,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[styles.btnSecondaryText, { color: t.text }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={onConfirmFlagPayment}
            style={({ pressed }) => [
              styles.btnPrimary,
              { backgroundColor: t.orange, flex: 1, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text style={[styles.btnPrimaryText, { color: t.text }]}>Flag payment</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    paddingVertical: spacing.xs,
  },
  backLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.md,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  rowLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  rowValue: {
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  participantTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  participantText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  phone: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  proofImage: {
    width: '100%',
    height: 180,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  btnPrimary: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  btnSecondary: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  btnSecondaryText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  sheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  sheetBody: {
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.45,
    marginBottom: spacing.lg,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
