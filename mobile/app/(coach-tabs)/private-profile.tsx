import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { spacing, fontSize, borderRadius } from '@/mobile/lib/theme';
import { darkTheme as t } from '@/mobile/lib/theme';
import { useCoachAuth } from '@/context/CoachAuthContext';
import { getCoachSubscription, type CoachSubscriptionResult } from '@/mobile/lib/coach-api';
import { StatusChip } from '@/components/coach';

export default function CoachPrivateProfileScreen() {
  const router = useRouter();
  const { coach, token, logout } = useCoachAuth();
  const [sub, setSub] = useState<CoachSubscriptionResult | null>(null);


  useEffect(() => {
    if (!coach?.id || !token) {
      setSub(null);
      return;
    }
    getCoachSubscription(coach.id, token)
      .then((data) => setSub(data))
      .catch(() => setSub(null));
  }, [coach?.id, token]);

  const onLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  const subLabel = sub?.plan ?? coach?.subscriptionPlan ?? '—';
  const expiresStr = sub?.expires
    ? new Date(sub.expires).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';
  const subStatusText = sub?.isExpired ? 'Expired' : sub?.plan === 'trial' ? 'Trial' : 'Active';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()}>
            <Text style={[styles.backText, { color: t.accent }]}>Back</Text>
          </Pressable>
          <Text style={[styles.title, { color: t.text }]}>Private profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <View style={[styles.privateAvatar, { backgroundColor: t.accentBg, borderColor: t.border }]}>
            <Text style={styles.privateAvatarEmoji}>🏓</Text>
          </View>
          <Text style={[styles.name, { color: t.text }]}>{coach?.name ?? 'Coach'}</Text>
          <Text style={[styles.phone, { color: t.textSec }]}>{coach?.phone ?? '—'}</Text>
          <Text style={[styles.privateHint, { color: t.textMuted }]}>
            Private avatar is fixed on this screen.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <Text style={[styles.sectionLabel, { color: t.textSec }]}>Subscription</Text>
          <View style={styles.subRow}>
            <Text style={[styles.subValue, { color: t.text }]}>Plan: {subLabel}</Text>
            <StatusChip status={subStatusText} theme={t} />
          </View>
          <Text style={[styles.subHint, { color: t.textMuted }]}>Renews / expires: {expiresStr}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <Text style={[styles.sectionLabel, { color: t.textSec }]}>Actions</Text>
          <Pressable
            onPress={() => router.push('/(coach-tabs)/profile-settings' as Href)}
            style={({ pressed }) => [
              styles.actionBtn,
              { borderColor: t.border, backgroundColor: t.bg, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <Text style={[styles.actionText, { color: t.text }]}>Edit public profile</Text>
          </Pressable>
          <Pressable
            onPress={onLogout}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: t.red, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text style={[styles.actionText, { color: t.text }]}>Log out coach</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing['5xl'],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  headerSpacer: { width: 36 },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  privateAvatar: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  privateAvatarEmoji: { fontSize: 30 },
  name: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  phone: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  privateHint: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  subValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  subHint: {
    fontSize: fontSize.sm,
  },
  actionBtn: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
