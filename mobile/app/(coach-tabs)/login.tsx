import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Keyboard,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCoachAuth } from '@/context/CoachAuthContext';
import { spacing, fontSize, borderRadius } from '@/mobile/lib/theme';
import { darkTheme as t } from '@/mobile/lib/theme';
import WelcomePopup, { type WelcomeFeature } from '@/components/WelcomePopup';

const COACH_FEATURES: WelcomeFeature[] = [
  { icon: 'megaphone-outline', title: 'Attract new clients', subtitle: 'Grow your coaching business' },
  { icon: 'pricetag-outline', title: 'Sell packages and boost income', subtitle: 'Offer packs and increase earnings' },
  { icon: 'calendar-outline', title: 'Manage everything', subtitle: 'Schedule, track and stay organized' },
];

type TabMode = 'login' | 'register';
const LANGUAGE_OPTIONS = ['English', 'Vietnamese', 'Japanese', 'Thai'] as const;
const SPECIALTY_OPTIONS = ['Pickleball', 'Tennis', 'Badminton'] as const;
const FOCUS_LEVEL_OPTIONS = ['Beginner', 'Advanced', 'Pro'] as const;
const EXPERIENCE_OPTIONS = ['<2', '2-5', '5+'] as const;
const GROUP_SIZE_OPTIONS = ['1-1', '2', '3', '4', '4+'] as const;

function formatCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const n = Number.parseInt(digits, 10);
  return n.toLocaleString('en-US');
}

function parseCurrencyInput(value: string): number {
  const digits = value.replace(/\D/g, '');
  return Number.parseInt(digits, 10);
}

function toggleOption<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function CoachLoginScreen() {
  const router = useRouter();
  const { login, register, loading, error, clearError } = useCoachAuth();

  const [tab, setTab] = useState<TabMode>('login');
  const [authReady, setAuthReady] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    if (!loading) setAuthReady(true);
  }, [loading]);

  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRate, setRegRate] = useState('');
  const [regSpecialties, setRegSpecialties] = useState<string[]>([]);
  const [regLanguages, setRegLanguages] = useState<string[]>([]);
  const [regFocusLevels, setRegFocusLevels] = useState<string[]>([]);
  const [regGroupSizes, setRegGroupSizes] = useState<string[]>([]);
  const [regExperienceBand, setRegExperienceBand] = useState<string | null>(null);
  const [regGender, setRegGender] = useState<'male' | 'female' | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const onLogin = useCallback(async () => {
    setValidationError(null);
    if (!loginPhone.trim()) {
      setValidationError('Phone number is required.');
      return;
    }
    if (!loginPassword) {
      setValidationError('Password is required.');
      return;
    }
    try {
      await login(loginPhone.trim(), loginPassword);
      router.replace('/(coach-tabs)/today');
    } catch {
      // error surfaced via context
    }
  }, [login, loginPhone, loginPassword, router]);

  const onRegister = useCallback(async () => {
    setValidationError(null);
    if (!regName.trim() || !regPhone.trim() || !regPassword.trim()) {
      setValidationError('Name, phone, and password are required.');
      return;
    }
    if (regPassword.trim().length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }
    const rate = parseCurrencyInput(regRate);
    if (!Number.isFinite(rate) || rate < 0) {
      setValidationError('Enter a valid hourly rate.');
      return;
    }
    if (!regGender) {
      setValidationError('Please select your gender.');
      return;
    }
    try {
      await register({
        name: regName.trim(),
        phone: regPhone.trim(),
        password: regPassword,
        hourlyRate1on1: rate,
        specialties: regSpecialties.length ? regSpecialties : undefined,
        languages: regLanguages.length ? regLanguages : undefined,
        focusLevels: regFocusLevels.length ? regFocusLevels : undefined,
        groupSizes: regGroupSizes.length ? regGroupSizes : undefined,
        experienceBand: regExperienceBand ?? undefined,
        gender: regGender,
      });
      router.replace('/(coach-tabs)/today');
    } catch {
      // error surfaced via context
    }
  }, [
    register,
    regExperienceBand,
    regFocusLevels,
    regGender,
    regGroupSizes,
    regLanguages,
    regName,
    regPassword,
    regPhone,
    regRate,
    regSpecialties,
    router,
  ]);

  const initialHydrating = !authReady && loading;

  if (initialHydrating) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={t.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <WelcomePopup
        visible={showWelcome}
        onDismiss={() => setShowWelcome(false)}
        headline={'Get more clients.\nEarn more'}
        subheadline="Turn sessions into steady income"
        features={COACH_FEATURES}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.replace('/onboarding?start=role')} style={styles.backBtn}>
          <Text style={[styles.backText, { color: t.textSec }]}>← Back</Text>
        </Pressable>

        <Text style={[styles.title, { color: t.text }]}>Coach</Text>

        <View style={[styles.tabRow, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
          <Pressable
            onPress={() => {
              setValidationError(null);
              clearError();
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
              setValidationError(null);
              clearError();
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
            <Text style={[styles.label, { color: t.textSec }]}>Gender</Text>
            <View style={styles.genderRow}>
              {(['male', 'female'] as const).map((g) => {
                const active = regGender === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => setRegGender(g)}
                    style={({ pressed }) => [
                      styles.genderBtn,
                      {
                        backgroundColor: active ? t.accentBgStrong : t.bgInput,
                        borderColor: active ? t.accent : t.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.genderBtnText, { color: active ? t.accent : t.textSec }]}>
                      {g === 'male' ? 'Male' : 'Female'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.label, { color: t.textSec }]}>Hourly rate (1:1)</Text>
            <TextInput
              value={regRate}
              onChangeText={(v) => setRegRate(formatCurrencyInput(v))}
              placeholder="e.g. 500,000"
              placeholderTextColor={t.textMuted}
              keyboardType="number-pad"
              style={[styles.input, { backgroundColor: t.bgInput, borderColor: t.border, color: t.text }]}
            />
            <Text style={[styles.label, { color: t.textSec }]}>Languages</Text>
            <View style={styles.chipWrap}>
              {LANGUAGE_OPTIONS.map((option) => (
                <SelectorChip
                  key={option}
                  label={option}
                  selected={regLanguages.includes(option)}
                  onPress={() => {
                    Keyboard.dismiss();
                    setRegLanguages((prev) => toggleOption(prev, option));
                  }}
                />
              ))}
            </View>
            <Text style={[styles.label, { color: t.textSec }]}>Specialties</Text>
            <View style={styles.chipWrap}>
              {SPECIALTY_OPTIONS.map((option) => (
                <SelectorChip
                  key={option}
                  label={option}
                  selected={regSpecialties.includes(option)}
                  onPress={() => setRegSpecialties((prev) => toggleOption(prev, option))}
                />
              ))}
            </View>
            <Text style={[styles.label, { color: t.textSec }]}>Focus level</Text>
            <View style={styles.chipWrap}>
              {FOCUS_LEVEL_OPTIONS.map((option) => (
                <SelectorChip
                  key={option}
                  label={option}
                  selected={regFocusLevels.includes(option)}
                  onPress={() => setRegFocusLevels((prev) => toggleOption(prev, option))}
                />
              ))}
            </View>
            <Text style={[styles.label, { color: t.textSec }]}>Years of experience</Text>
            <View style={styles.chipWrap}>
              {EXPERIENCE_OPTIONS.map((option) => (
                <SelectorChip
                  key={option}
                  label={option}
                  selected={regExperienceBand === option}
                  onPress={() => setRegExperienceBand(option)}
                />
              ))}
            </View>
            <Text style={[styles.label, { color: t.textSec }]}>Group sizes</Text>
            <View style={styles.chipWrap}>
              {GROUP_SIZE_OPTIONS.map((option) => (
                <SelectorChip
                  key={option}
                  label={option}
                  selected={regGroupSizes.includes(option)}
                  onPress={() => setRegGroupSizes((prev) => toggleOption(prev, option))}
                />
              ))}
            </View>
          </View>
        )}

        {error || validationError ? (
          <Text style={[styles.error, { color: t.red }]} accessibilityLiveRegion="polite">
            {error ?? validationError}
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

function SelectorChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? t.accentBgStrong : t.bgInput,
          borderColor: selected ? t.accent : t.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? t.accent : t.textSec }]}>{label}</Text>
    </Pressable>
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
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
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
  genderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  genderBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  genderBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  error: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    fontWeight: '600',
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
  backBtn: {
    marginBottom: spacing.sm,
  },
  backText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
