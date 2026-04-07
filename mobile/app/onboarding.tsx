import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useCourtMap } from '@/context/CourtMapContext';
import { darkTheme as t, spacing, fontSize, borderRadius } from '@/mobile/lib/theme';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userName, userPhone } = useCourtMap();

  useEffect(() => {
    if (userName?.trim() && userPhone?.trim()) {
      router.replace('/(tabs)/(book)');
    }
  }, [router, userName, userPhone]);

  return (
    <View style={[styles.root, { backgroundColor: t.bg, paddingTop: insets.top }]}>
      <View style={styles.hero}>
        <View style={[styles.logoBadge, { backgroundColor: t.accentBgStrong }]}>
          <Ionicons name="tennisball" size={36} color={t.accent} />
        </View>
        <Text style={[styles.brand, { color: t.accent }]}>COURTMAP</Text>
        <Text style={[styles.tagline, { color: t.textSec }]}>
          Find courts. Book coaches.{'\n'}Play more.
        </Text>
      </View>

      <View style={styles.cards}>
        <Pressable
          onPress={() => router.push('/player-auth')}
          style={({ pressed }) => [
            styles.roleCard,
            { backgroundColor: t.bgCard, borderColor: t.border, opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <View style={[styles.roleIcon, { backgroundColor: t.accentBg }]}>
            <Ionicons name="people" size={28} color={t.accent} />
          </View>
          <View style={styles.roleText}>
            <Text style={[styles.roleTitle, { color: t.text }]}>I'm a Player</Text>
            <Text style={[styles.roleDesc, { color: t.textSec }]}>
              Search courts, book sessions with coaches, and manage your game.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/(coach-tabs)/login')}
          style={({ pressed }) => [
            styles.roleCard,
            { backgroundColor: t.bgCard, borderColor: t.border, opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <View style={[styles.roleIcon, { backgroundColor: 'rgba(52,152,219,0.1)' }]}>
            <Ionicons name="fitness" size={28} color={t.blue} />
          </View>
          <View style={styles.roleText}>
            <Text style={[styles.roleTitle, { color: t.text }]}>I'm a Coach</Text>
            <Text style={[styles.roleDesc, { color: t.textSec }]}>
              Manage availability, accept bookings, and grow your coaching business.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
        </Pressable>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Text style={[styles.footerText, { color: t.textMuted }]}>
          1,976 venues across Vietnam
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  brand: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: fontSize.md,
    lineHeight: 22,
    textAlign: 'center',
  },
  cards: {
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  roleIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleText: {
    flex: 1,
  },
  roleTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: 2,
  },
  roleDesc: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: fontSize.xs,
  },
});
