import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { spacing, fontSize, borderRadius } from '@/mobile/lib/theme';
import { useCourtMap } from '@/context/CourtMapContext';
import { useCredits } from '@/context/CreditContext';
import { VietQRBlock, EmptyState } from '@/components/coach';
import { getCoach } from '@/mobile/lib/coach-api';
import type { CoachResult, CreditPackResult } from '@/mobile/lib/coach-types';
import { formatVndFull } from '@/lib/formatters';

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export default function BuyCreditPackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ coachId?: string | string[] }>();
  const coachIdParam = params.coachId;
  const coachId =
    typeof coachIdParam === 'string' ? coachIdParam : coachIdParam?.[0] ?? '';

  const { t, userId: ctxUserId, userName: ctxUserName, userPhone: ctxUserPhone } = useCourtMap();
  const userId = ctxUserId?.trim() ? ctxUserId : 'anon';
  const userName = ctxUserName?.trim() ? ctxUserName : 'Player';
  const userPhone = ctxUserPhone?.trim() ? ctxUserPhone : '';

  const { purchase, getAvailableCredits, loadCredits } = useCredits();

  const [coach, setCoach] = useState<CoachResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [payBusy, setPayBusy] = useState(false);

  useEffect(() => {
    if (!coachId) {
      setCoach(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadErr(null);
    let cancelled = false;
    void getCoach(coachId)
      .then((c) => {
        if (!cancelled) setCoach(c);
      })
      .catch((e) => {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : 'Failed to load coach');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coachId]);

  useEffect(() => {
    setImageFailed(false);
  }, [coachId, coach?.photo]);

  useEffect(() => {
    if (!userId || userId === 'anon') return;
    void loadCredits(userId);
  }, [userId, loadCredits]);

  const packs = useMemo(
    () => (coach?.creditPacks ?? []).filter((p: CreditPackResult) => p.isActive),
    [coach?.creditPacks],
  );

  const selectedPack = useMemo(
    () => packs.find((p) => p.id === selectedPackId) ?? null,
    [packs, selectedPackId],
  );

  const existingCredits = coachId ? getAvailableCredits(coachId) : undefined;
  const hasCredits = Boolean(existingCredits);

  const bankReady = Boolean(
    coach?.bankName && coach.bankAccountName && coach.bankAccountNumber,
  );

  const transferMemo = useMemo(() => {
    if (!selectedPack || !userId) return '';
    return `CourtMap credits ${userId.slice(0, 12)} ${selectedPack.id.slice(0, 8)}`;
  }, [selectedPack, userId]);

  const onPaid = useCallback(async () => {
    if (payBusy || !coachId || !selectedPack) return;
    setPayBusy(true);
    try {
      await purchase({
        coachId,
        userId,
        userName,
        userPhone,
        creditPackId: selectedPack.id,
      });
      if (userId && userId !== 'anon') {
        void loadCredits(userId);
      }
      Alert.alert('Purchase recorded', 'Thanks — your credits will appear once payment is confirmed.');
      router.back();
    } catch {
      Alert.alert('Could not record purchase', 'Please try again or contact support.');
    } finally {
      setPayBusy(false);
    }
  }, [payBusy, coachId, selectedPack, purchase, userId, userName, userPhone, loadCredits, router]);

  const showPhoto = Boolean(coach?.photo?.trim()) && !imageFailed;

  if (!coachId) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top', 'left', 'right']}>
        <View style={styles.backRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text style={[styles.backText, { color: t.accent }]}>Back</Text>
          </Pressable>
        </View>
        <EmptyState
          title="Pick a coach"
          subtitle="Open a coach profile and choose “Buy credits”, or browse the coach list."
          theme={t}
        />
      </SafeAreaView>
    );
  }

  if (loading && !coach) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top', 'left', 'right']}>
        <View style={styles.backRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text style={[styles.backText, { color: t.accent }]}>Back</Text>
          </Pressable>
        </View>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={t.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (loadErr || !coach) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top', 'left', 'right']}>
        <View style={styles.backRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text style={[styles.backText, { color: t.accent }]}>Back</Text>
          </Pressable>
        </View>
        <EmptyState title="Could not load coach" subtitle={loadErr ?? 'Unknown error'} theme={t} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top', 'left', 'right']}>
      <View style={styles.backRow}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Text style={[styles.backText, { color: t.accent }]}>Back</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            {showPhoto ? (
              <Image
                source={{ uri: coach.photo!.trim() }}
                style={[styles.avatar, { backgroundColor: t.bgSurface }]}
                onError={() => setImageFailed(true)}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: t.accentBg }]}>
                <Text style={[styles.avatarInitials, { color: t.accent }]}>
                  {initialsFromName(coach.name)}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.coachTitle, { color: t.text }]}>{coach.name}</Text>
          <Text style={[styles.coachSub, { color: t.textSec }]}>Credit packs</Text>
        </View>

        {packs.length === 0 ? (
          <EmptyState
            title="No packs available"
            subtitle="This coach has no active credit packs right now."
            theme={t}
          />
        ) : (
          packs.map((pack) => {
            const selected = pack.id === selectedPackId;
            const perCredit =
              pack.creditCount > 0 ? Math.round(pack.price / pack.creditCount) : pack.price;
            return (
              <Pressable
                key={pack.id}
                onPress={() => setSelectedPackId(pack.id)}
                style={({ pressed }) => [
                  styles.packCard,
                  {
                    backgroundColor: selected ? t.accentBgStrong : t.bgCard,
                    borderColor: selected ? t.accent : t.border,
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
              >
                <Text style={[styles.packName, { color: t.text }]}>{pack.name}</Text>
                <Text style={[styles.packCredits, { color: t.textSec }]}>
                  {pack.creditCount} credits
                </Text>
                <Text style={[styles.packPrice, { color: t.accent }]}>{formatVndFull(pack.price)}</Text>
                {pack.discountPercent != null && pack.discountPercent > 0 ? (
                  <Text style={[styles.discount, { color: t.green }]}>
                    {pack.discountPercent}% off
                  </Text>
                ) : null}
                <Text style={[styles.perCredit, { color: t.textSec }]}>
                  {formatVndFull(perCredit)} per credit
                </Text>
              </Pressable>
            );
          })
        )}

        {selectedPack ? (
          <View style={styles.paySection}>
            <Text style={[styles.payTitle, { color: t.text }]}>Payment</Text>
            {hasCredits ? (
              <View style={[styles.noteCard, { backgroundColor: t.accentBg, borderColor: t.border }]}>
                <Text style={[styles.noteTitle, { color: t.text }]}>Already have credits</Text>
                <Text style={[styles.noteBody, { color: t.textSec }]}>
                  You have usable credits with this coach. Use them when you book a session from the coach
                  profile.
                </Text>
              </View>
            ) : bankReady ? (
              <VietQRBlock
                bankName={coach.bankName!}
                bankAccountName={coach.bankAccountName!}
                bankAccountNumber={coach.bankAccountNumber!}
                amount={selectedPack.price}
                memo={transferMemo}
                onPaid={onPaid}
                theme={t}
              />
            ) : (
              <View style={[styles.noteCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                <Text style={[styles.noteBody, { color: t.textSec }]}>
                  This coach has not added bank transfer details yet. Check back later or message the coach.
                </Text>
              </View>
            )}
          </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  backRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing['4xl'],
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarWrap: {
    marginBottom: spacing.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.full,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
  },
  coachTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  coachSub: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  packCard: {
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  packName: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  packCredits: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  packPrice: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  discount: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  perCredit: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  paySection: {
    marginTop: spacing.lg,
  },
  payTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  noteCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  noteTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  noteBody: {
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.45,
  },
});
