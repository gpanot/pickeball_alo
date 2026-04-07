import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { spacing, fontSize, borderRadius, type ThemeTokens } from '@/mobile/lib/theme';
import { darkTheme as t } from '@/mobile/lib/theme';
import { useCoachAuth } from '@/context/CoachAuthContext';
import { EmptyState, RatingBar } from '@/components/coach';
import { updateCoachProfile } from '@/mobile/lib/coach-api';

const LANGUAGE_OPTIONS = ['English', 'Vietnamese', 'Japanese', 'Thai'] as const;
const SPECIALTY_OPTIONS = ['Pickleball', 'Tennis', 'Badminton'] as const;
const FOCUS_LEVEL_OPTIONS = ['Beginner', 'Advanced', 'Pro'] as const;
const EXPERIENCE_OPTIONS = ['<2', '2-5', '5+'] as const;
const GROUP_SIZE_OPTIONS = ['1-1', '2', '3', '4', '4+'] as const;

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

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

function deriveMaxGroupSize(groupSizes: string[]): number {
  if (groupSizes.includes('4+')) return 5;
  const values = groupSizes
    .map((v) => (v === '1-1' ? 1 : Number.parseInt(v, 10)))
    .filter((n) => Number.isFinite(n));
  return values.length ? Math.max(...values) : 1;
}

export default function CoachProfileSettingsScreen() {
  const router = useRouter();
  const { coach, token, refreshProfile, isLoggedIn } = useCoachAuth();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [focusLevels, setFocusLevels] = useState<string[]>([]);
  const [groupSizes, setGroupSizes] = useState<string[]>([]);
  const [experienceBand, setExperienceBand] = useState<string | null>(null);
  const [responseHint, setResponseHint] = useState('');
  const [hourly1, setHourly1] = useState('');
  const [hourlyGroup, setHourlyGroup] = useState('');
  const [isProfilePublic, setIsProfilePublic] = useState(true);

  const hydrateFromCoach = useCallback(() => {
    if (!coach) return;
    setName(coach.name ?? '');
    setBio(coach.bio ?? '');
    setPhoto(coach.photo ?? '');
    setSpecialties((coach.specialties ?? []).filter((v) => SPECIALTY_OPTIONS.includes(v as (typeof SPECIALTY_OPTIONS)[number])));
    setLanguages((coach.languages ?? []).filter((v) => LANGUAGE_OPTIONS.includes(v as (typeof LANGUAGE_OPTIONS)[number])));
    setFocusLevels((coach.focusLevels ?? []).filter((v) => FOCUS_LEVEL_OPTIONS.includes(v as (typeof FOCUS_LEVEL_OPTIONS)[number])));
    setGroupSizes((coach.groupSizes ?? []).filter((v) => GROUP_SIZE_OPTIONS.includes(v as (typeof GROUP_SIZE_OPTIONS)[number])));
    setExperienceBand(
      coach.experienceBand && EXPERIENCE_OPTIONS.includes(coach.experienceBand as (typeof EXPERIENCE_OPTIONS)[number])
        ? coach.experienceBand
        : null,
    );
    setResponseHint(coach.responseHint ?? '');
    setHourly1((coach.hourlyRate1on1 ?? 0).toLocaleString('en-US'));
    setHourlyGroup(coach.hourlyRateGroup != null ? coach.hourlyRateGroup.toLocaleString('en-US') : '');
    setIsProfilePublic(coach.isProfilePublic ?? true);
  }, [coach]);

  useEffect(() => {
    hydrateFromCoach();
  }, [hydrateFromCoach]);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/(coach-tabs)/login');
    }
  }, [isLoggedIn, router]);

  const onPickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Please allow photo library access to pick a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.65,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.base64) {
      setPhoto(`data:image/jpeg;base64,${asset.base64}`);
      return;
    }
    setPhoto(asset.uri);
  }, []);

  const onSave = useCallback(async () => {
    if (!coach?.id || !token) {
      Alert.alert('Error', 'Not signed in');
      return;
    }
    const hourlyRate1on1 = parseCurrencyInput(hourly1);
    if (!Number.isFinite(hourlyRate1on1) || hourlyRate1on1 < 0) {
      Alert.alert('Validation', 'Hourly rate 1-on-1 must be a non-negative integer');
      return;
    }
    if (groupSizes.length === 0) {
      Alert.alert('Validation', 'Please select at least one group size.');
      return;
    }

    let hourlyRateGroup: number | null = null;
    if (hourlyGroup.trim() !== '') {
      const g = parseCurrencyInput(hourlyGroup);
      if (!Number.isFinite(g) || g < 0) {
        Alert.alert('Validation', 'Group hourly rate must be a non-negative integer or empty');
        return;
      }
      hourlyRateGroup = g;
    }

    setSaving(true);
    try {
      await updateCoachProfile(coach.id, token, {
        name: name.trim(),
        bio: bio.trim() || null,
        photo: photo.trim() || null,
        specialties,
        languages,
        focusLevels,
        groupSizes,
        experienceBand,
        responseHint: responseHint.trim() || null,
        hourlyRate1on1,
        hourlyRateGroup,
        maxGroupSize: deriveMaxGroupSize(groupSizes),
        isProfilePublic,
      });
      await refreshProfile();
      Alert.alert('Saved', 'Public profile updated.');
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Network error');
    } finally {
      setSaving(false);
    }
  }, [
    bio,
    coach?.id,
    experienceBand,
    focusLevels,
    groupSizes,
    hourly1,
    hourlyGroup,
    isProfilePublic,
    languages,
    name,
    photo,
    refreshProfile,
    responseHint,
    specialties,
    token,
  ]);

  const showRatings =
    coach &&
    (coach.ratingOverall != null ||
      coach.ratingOnTime != null ||
      coach.ratingFriendly != null ||
      coach.ratingProfessional != null ||
      coach.ratingRecommend != null);

  const initials = useMemo(() => initialsFromName(name || coach?.name || ''), [name, coach?.name]);
  const showPhoto = photo.trim().length > 0;

  if (!coach) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
        <EmptyState title="No profile" subtitle="Sign in as a coach to edit settings." theme={t} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={[styles.topBar, { borderBottomColor: t.border }]}>
        <Text style={[styles.topTitle, { color: t.text }]}>Public profile</Text>
        <Pressable
          onPress={onSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.savePill,
            { backgroundColor: t.accent, opacity: saving || pressed ? 0.82 : 1 },
          ]}
        >
          {saving ? <ActivityIndicator color={t.bg} size="small" /> : <Text style={[styles.savePillText, { color: t.bg }]}>Save profile</Text>}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <View style={styles.publicRow}>
            <View>
              <Text style={[styles.publicLabel, { color: t.text }]}>Visible to students</Text>
              <Text style={[styles.publicHint, { color: t.textMuted }]}>
                Turn off to hide your profile from coach discovery.
              </Text>
            </View>
            <Switch
              value={isProfilePublic}
              onValueChange={setIsProfilePublic}
              trackColor={{ false: t.border, true: t.accent }}
              thumbColor={t.bg}
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <View style={styles.avatarWrap}>
            {showPhoto ? (
              <Image source={{ uri: photo.trim() }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: t.accentBg }]}>
                <Text style={[styles.avatarInitials, { color: t.accent }]}>{initials}</Text>
              </View>
            )}
            <Text style={[styles.avatarHint, { color: t.textMuted }]}>This avatar is public.</Text>
            <Pressable
              onPress={() => {
                void onPickPhoto();
              }}
              style={({ pressed }) => [
                styles.smallActionBtn,
                { borderColor: t.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.smallActionText, { color: t.text }]}>Upload square photo</Text>
            </Pressable>
          </View>

          <Field label="Name" theme={t}>
            <TextInput
              value={name}
              onChangeText={setName}
              style={[styles.input, { color: t.text, backgroundColor: t.bgInput, borderColor: t.border }]}
              placeholder="Your display name"
              placeholderTextColor={t.textMuted}
            />
          </Field>
          <Field label="Bio" theme={t}>
            <TextInput
              value={bio}
              onChangeText={setBio}
              style={[
                styles.input,
                styles.multiline,
                { color: t.text, backgroundColor: t.bgInput, borderColor: t.border },
              ]}
              placeholder="Tell students about your coaching style"
              placeholderTextColor={t.textMuted}
              multiline
            />
          </Field>
          <Field label="Languages" theme={t}>
            <View style={styles.optionWrap}>
              {LANGUAGE_OPTIONS.map((option) => (
                <OptionChip
                  key={option}
                  label={option}
                  selected={languages.includes(option)}
                  onPress={() => setLanguages((prev) => toggleOption(prev, option))}
                />
              ))}
            </View>
          </Field>
          <Field label="Specialties" theme={t}>
            <View style={styles.optionWrap}>
              {SPECIALTY_OPTIONS.map((option) => (
                <OptionChip
                  key={option}
                  label={option}
                  selected={specialties.includes(option)}
                  onPress={() => setSpecialties((prev) => toggleOption(prev, option))}
                />
              ))}
            </View>
          </Field>
          <Field label="Focus level" theme={t}>
            <View style={styles.optionWrap}>
              {FOCUS_LEVEL_OPTIONS.map((option) => (
                <OptionChip
                  key={option}
                  label={option}
                  selected={focusLevels.includes(option)}
                  onPress={() => setFocusLevels((prev) => toggleOption(prev, option))}
                />
              ))}
            </View>
          </Field>
          <Field label="Years of experience" theme={t}>
            <View style={styles.optionWrap}>
              {EXPERIENCE_OPTIONS.map((option) => (
                <OptionChip
                  key={option}
                  label={option}
                  selected={experienceBand === option}
                  onPress={() => setExperienceBand(option)}
                />
              ))}
            </View>
          </Field>
          <Field label="Response / reliability hint" theme={t}>
            <TextInput
              value={responseHint}
              onChangeText={setResponseHint}
              style={[styles.input, { color: t.text, backgroundColor: t.bgInput, borderColor: t.border }]}
              placeholder="e.g. Usually responds within 2 hours"
              placeholderTextColor={t.textMuted}
            />
          </Field>
        </View>

        <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <Field label="Hourly rate 1-on-1 (VND)" theme={t}>
            <TextInput
              value={hourly1}
              onChangeText={(v) => setHourly1(formatCurrencyInput(v))}
              style={[styles.input, { color: t.text, backgroundColor: t.bgInput, borderColor: t.border }]}
              keyboardType="number-pad"
              placeholder="500,000"
              placeholderTextColor={t.textMuted}
            />
          </Field>
          <Field label="Hourly rate group (VND, optional)" theme={t}>
            <TextInput
              value={hourlyGroup}
              onChangeText={(v) => setHourlyGroup(formatCurrencyInput(v))}
              style={[styles.input, { color: t.text, backgroundColor: t.bgInput, borderColor: t.border }]}
              keyboardType="number-pad"
              placeholder="250,000"
              placeholderTextColor={t.textMuted}
            />
          </Field>
          <Field label="Group size" theme={t}>
            <View style={styles.optionWrap}>
              {GROUP_SIZE_OPTIONS.map((option) => (
                <OptionChip
                  key={option}
                  label={option}
                  selected={groupSizes.includes(option)}
                  onPress={() => setGroupSizes((prev) => toggleOption(prev, option))}
                />
              ))}
            </View>
          </Field>
        </View>

        {showRatings ? (
          <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
            <Text style={[styles.label, { color: t.textSec }]}>Ratings preview</Text>
            {coach.ratingOverall != null ? <RatingBar label="Overall" value={coach.ratingOverall} theme={t} /> : null}
            {coach.ratingOnTime != null ? <RatingBar label="On time" value={coach.ratingOnTime} theme={t} /> : null}
            {coach.ratingFriendly != null ? <RatingBar label="Friendly" value={coach.ratingFriendly} theme={t} /> : null}
            {coach.ratingProfessional != null ? <RatingBar label="Professional" value={coach.ratingProfessional} theme={t} /> : null}
            {coach.ratingRecommend != null ? <RatingBar label="Recommend" value={coach.ratingRecommend} theme={t} /> : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  theme,
  children,
}: {
  label: string;
  theme: ThemeTokens;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textSec }]}>{label}</Text>
      {children}
    </View>
  );
}

function OptionChip({
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
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  savePill: {
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePillText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['5xl'],
    gap: spacing.lg,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  publicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  publicLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  publicHint: {
    marginTop: 2,
    fontSize: fontSize.xs,
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: borderRadius.full,
  },
  avatarFallback: {
    width: 76,
    height: 76,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  avatarHint: {
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
  },
  smallActionBtn: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  smallActionText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
  },
  field: {
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
});
