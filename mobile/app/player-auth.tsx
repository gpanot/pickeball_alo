import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCourtMap } from '@/context/CourtMapContext';
import { playerLogin, playerRegister } from '@/mobile/lib/player-api';
import { darkTheme as t, spacing, fontSize, borderRadius } from '@/mobile/lib/theme';
import WelcomePopup, { type WelcomeFeature } from '@/components/WelcomePopup';

const PLAYER_FEATURES: WelcomeFeature[] = [
  { icon: 'card-outline', title: 'Join a club', subtitle: 'Train regularly, pay less' },
  { icon: 'trophy-outline', title: 'Buy packs', subtitle: 'Save up to 20%' },
  { icon: 'people-outline', title: 'Train with friends', subtitle: 'Split the cost' },
];

type TabMode = 'login' | 'register';

export default function PlayerAuthScreen() {
  const router = useRouter();
  const { userName, userPhone, handleSaveProfile } = useCourtMap();

  const [tab, setTab] = useState<TabMode>('login');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    if (userName?.trim() && userPhone?.trim()) {
      router.replace('/(tabs)/(book)');
    }
  }, [router, userName, userPhone]);

  const onLogin = useCallback(async () => {
    setError(null);
    const phone = loginPhone.trim();
    const password = loginPassword;
    if (!phone || !password) {
      setError('Phone and password are required.');
      return;
    }
    setLoading(true);
    try {
      const profile = await playerLogin(phone, password);
      handleSaveProfile(profile.name, profile.phone, profile.id);
      router.replace('/(tabs)/(book)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }, [handleSaveProfile, loginPassword, loginPhone, router]);

  const onRegister = useCallback(async () => {
    setError(null);
    const name = regName.trim();
    const phone = regPhone.trim();
    const password = regPassword;
    if (!name || !phone || !password) {
      setError('Name, phone, and password are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const profile = await playerRegister({ name, phone, password });
      handleSaveProfile(profile.name, profile.phone, profile.id);
      router.replace('/(tabs)/(book)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }, [handleSaveProfile, regName, regPassword, regPhone, router]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <WelcomePopup
        visible={showWelcome}
        onDismiss={() => setShowWelcome(false)}
        headline={'Flexible training\nthat fits you'}
        subheadline="Train your way, save money, no pressure"
        features={PLAYER_FEATURES}
        footnote="You're always in control of how you train"
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.replace('/onboarding?start=role')} style={styles.backBtn}>
          <Text style={[styles.backText, { color: t.textSec }]}>← Back</Text>
        </Pressable>

        <Text style={[styles.title, { color: t.text }]}>Player</Text>

        <View style={[styles.tabRow, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
          <Pressable
            onPress={() => {
              setError(null);
              setTab('login');
            }}
            style={({ pressed }) => [
              styles.tabBtn,
              tab === 'login' && { backgroundColor: t.accentBgStrong },
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.tabLabel, { color: tab === 'login' ? t.accent : t.textSec }]}>Login</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setError(null);
              setTab('register');
            }}
            style={({ pressed }) => [
              styles.tabBtn,
              tab === 'register' && { backgroundColor: t.accentBgStrong },
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.tabLabel, { color: tab === 'register' ? t.accent : t.textSec }]}>
              Register
            </Text>
          </Pressable>
        </View>

        {tab === 'login' ? (
          <View style={styles.form}>
            <Text style={[styles.label, { color: t.textSec }]}>Phone</Text>
            <TextInput
              value={loginPhone}
              onChangeText={setLoginPhone}
              placeholder="Phone number"
              placeholderTextColor={t.textMuted}
              keyboardType="phone-pad"
              autoCapitalize="none"
              style={[styles.input, { backgroundColor: t.bgInput, borderColor: t.border, color: t.text }]}
            />
            <Text style={[styles.label, { color: t.textSec }]}>Password</Text>
            <TextInput
              value={loginPassword}
              onChangeText={setLoginPassword}
              placeholder="Password"
              placeholderTextColor={t.textMuted}
              secureTextEntry
              style={[styles.input, { backgroundColor: t.bgInput, borderColor: t.border, color: t.text }]}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={[styles.label, { color: t.textSec }]}>Name</Text>
            <TextInput
              value={regName}
              onChangeText={setRegName}
              placeholder="Full name"
              placeholderTextColor={t.textMuted}
              style={[styles.input, { backgroundColor: t.bgInput, borderColor: t.border, color: t.text }]}
            />
            <Text style={[styles.label, { color: t.textSec }]}>Phone</Text>
            <TextInput
              value={regPhone}
              onChangeText={setRegPhone}
              placeholder="Phone number"
              placeholderTextColor={t.textMuted}
              keyboardType="phone-pad"
              autoCapitalize="none"
              style={[styles.input, { backgroundColor: t.bgInput, borderColor: t.border, color: t.text }]}
            />
            <Text style={[styles.label, { color: t.textSec }]}>Password</Text>
            <TextInput
              value={regPassword}
              onChangeText={setRegPassword}
              placeholder="Password"
              placeholderTextColor={t.textMuted}
              secureTextEntry
              style={[styles.input, { backgroundColor: t.bgInput, borderColor: t.border, color: t.text }]}
            />
          </View>
        )}

        {error ? (
          <Text style={[styles.error, { color: t.red }]} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={tab === 'login' ? onLogin : onRegister}
          disabled={loading}
          style={({ pressed }) => [
            styles.submit,
            { backgroundColor: t.accent, opacity: pressed || loading ? 0.88 : 1 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={t.bg} />
          ) : (
            <Text style={[styles.submitText, { color: t.bg }]}>{tab === 'login' ? 'Log in' : 'Create account'}</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  backBtn: {
    marginBottom: spacing.sm,
  },
  backText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '800',
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.xs,
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  form: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
  },
  submit: {
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitText: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  error: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
