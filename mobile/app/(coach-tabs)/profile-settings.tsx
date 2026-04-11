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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { spacing, fontSize, borderRadius, type ThemeTokens } from '@/mobile/lib/theme';
import { darkTheme as t } from '@/mobile/lib/theme';
import { useCoachAuth } from '@/context/CoachAuthContext';
import { EmptyState, RatingBar, SectionHeader } from '@/components/coach';
import {
  updateCoachProfile,
  verifyCoachPhone,
  listCreditPacks,
  createCreditPack,
  updateCreditPack,
  deleteCreditPack,
} from '@/mobile/lib/coach-api';
import { formatVndFull } from '@/lib/formatters';
import type { CreditPackResult } from '@/mobile/lib/coach-types';
import PhoneFieldVerificationSection from '@/components/PhoneFieldVerificationSection';

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

type AmountModalTarget = '1on1' | 'group' | null;

export default function CoachProfileSettingsScreen() {
  const router = useRouter();
  const { coach, token, refreshProfile, patchCoach } = useCoachAuth();
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

  // Amount input modal
  const [amountModalTarget, setAmountModalTarget] = useState<AmountModalTarget>(null);
  const [amountModalValue, setAmountModalValue] = useState('');

  // Credit packs state
  const [packs, setPacks] = useState<CreditPackResult[]>([]);
  const [packsLoading, setPacksLoading] = useState(false);
  const [packModalVisible, setPackModalVisible] = useState(false);
  const [editingPack, setEditingPack] = useState<CreditPackResult | null>(null);
  const [packSessionCount, setPackSessionCount] = useState<number | null>(null);
  const [packPrice, setPackPrice] = useState('');
  const [packDiscountPct, setPackDiscountPct] = useState<number | null>(null);
  const [packSaving, setPackSaving] = useState(false);

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

  const loadPacks = useCallback(async () => {
    if (!coach?.id || !token) return;
    setPacksLoading(true);
    try {
      const data = await listCreditPacks(coach.id, token);
      setPacks(data);
    } catch {
      // silent
    } finally {
      setPacksLoading(false);
    }
  }, [coach?.id, token]);

  useEffect(() => {
    void loadPacks();
  }, [loadPacks]);

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

  const hasChanges = useMemo(() => {
    if (!coach) return false;
    const orig = {
      name: coach.name ?? '',
      bio: coach.bio ?? '',
      photo: coach.photo ?? '',
      specialties: (coach.specialties ?? []).filter((v) => SPECIALTY_OPTIONS.includes(v as (typeof SPECIALTY_OPTIONS)[number])),
      languages: (coach.languages ?? []).filter((v) => LANGUAGE_OPTIONS.includes(v as (typeof LANGUAGE_OPTIONS)[number])),
      focusLevels: (coach.focusLevels ?? []).filter((v) => FOCUS_LEVEL_OPTIONS.includes(v as (typeof FOCUS_LEVEL_OPTIONS)[number])),
      groupSizes: (coach.groupSizes ?? []).filter((v) => GROUP_SIZE_OPTIONS.includes(v as (typeof GROUP_SIZE_OPTIONS)[number])),
      experienceBand: coach.experienceBand && EXPERIENCE_OPTIONS.includes(coach.experienceBand as (typeof EXPERIENCE_OPTIONS)[number]) ? coach.experienceBand : null,
      responseHint: coach.responseHint ?? '',
      hourly1: (coach.hourlyRate1on1 ?? 0).toLocaleString('en-US'),
      hourlyGroup: coach.hourlyRateGroup != null ? coach.hourlyRateGroup.toLocaleString('en-US') : '',
      isProfilePublic: coach.isProfilePublic ?? true,
    };
    return (
      name !== orig.name ||
      bio !== orig.bio ||
      photo !== orig.photo ||
      JSON.stringify(specialties) !== JSON.stringify(orig.specialties) ||
      JSON.stringify(languages) !== JSON.stringify(orig.languages) ||
      JSON.stringify(focusLevels) !== JSON.stringify(orig.focusLevels) ||
      JSON.stringify(groupSizes) !== JSON.stringify(orig.groupSizes) ||
      experienceBand !== orig.experienceBand ||
      responseHint !== orig.responseHint ||
      hourly1 !== orig.hourly1 ||
      hourlyGroup !== orig.hourlyGroup ||
      isProfilePublic !== orig.isProfilePublic
    );
  }, [coach, name, bio, photo, specialties, languages, focusLevels, groupSizes, experienceBand, responseHint, hourly1, hourlyGroup, isProfilePublic]);

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
  }, [bio, coach?.id, experienceBand, focusLevels, groupSizes, hourly1, hourlyGroup, isProfilePublic, languages, name, photo, refreshProfile, responseHint, specialties, token]);

  // ── Amount modal (pricing rows) ──

  const openAmountModal = useCallback((target: AmountModalTarget) => {
    setAmountModalTarget(target);
    setAmountModalValue(
      target === '1on1' ? hourly1 : target === 'group' ? hourlyGroup : '',
    );
  }, [hourly1, hourlyGroup]);

  const confirmAmountModal = useCallback(() => {
    if (amountModalTarget === '1on1') {
      setHourly1(amountModalValue);
    } else if (amountModalTarget === 'group') {
      setHourlyGroup(amountModalValue);
    }
    setAmountModalTarget(null);
  }, [amountModalTarget, amountModalValue]);

  const clearGroupRate = useCallback(() => {
    setHourlyGroup('');
    setAmountModalTarget(null);
  }, []);

  // ── Credit Pack Modal ──

  const SESSION_COUNT_OPTIONS = [5, 10, 15, 20] as const;
  const DISCOUNT_OPTIONS = [5, 10, 15, 20, 25, 30] as const;

  const hourlyRate = parseCurrencyInput(hourly1);
  const packBasePrice = useMemo(() => {
    if (!packSessionCount || !Number.isFinite(hourlyRate) || hourlyRate <= 0) return 0;
    return hourlyRate * packSessionCount;
  }, [packSessionCount, hourlyRate]);

  const packAutoName = useMemo(() => {
    if (!packSessionCount) return '';
    return `${packSessionCount}-Session Pack`;
  }, [packSessionCount]);

  const packFinalPrice = parseCurrencyInput(packPrice);
  const effectiveDiscountPct = useMemo(() => {
    if (packBasePrice <= 0 || !Number.isFinite(packFinalPrice) || packFinalPrice <= 0) return null;
    if (packFinalPrice >= packBasePrice) return 0;
    return Math.round(((packBasePrice - packFinalPrice) / packBasePrice) * 100);
  }, [packBasePrice, packFinalPrice]);

  const applyDiscount = useCallback((pct: number | null) => {
    setPackDiscountPct(pct);
    if (pct != null && packBasePrice > 0) {
      const discounted = Math.round(packBasePrice * (1 - pct / 100));
      setPackPrice(discounted.toLocaleString('en-US'));
    }
  }, [packBasePrice]);

  const selectSessionCount = useCallback((n: number) => {
    setPackSessionCount(n);
    const base = Number.isFinite(hourlyRate) && hourlyRate > 0 ? hourlyRate * n : 0;
    if (base > 0 && packDiscountPct != null) {
      const discounted = Math.round(base * (1 - packDiscountPct / 100));
      setPackPrice(discounted.toLocaleString('en-US'));
    } else if (base > 0) {
      setPackPrice(base.toLocaleString('en-US'));
    }
  }, [hourlyRate, packDiscountPct]);

  const openAddPack = useCallback(() => {
    setEditingPack(null);
    setPackSessionCount(null);
    setPackPrice('');
    setPackDiscountPct(null);
    setPackModalVisible(true);
  }, []);

  const openEditPack = useCallback((pack: CreditPackResult) => {
    setEditingPack(pack);
    setPackSessionCount(pack.creditCount);
    setPackPrice(pack.price.toLocaleString('en-US'));
    setPackDiscountPct(pack.discountPercent);
    setPackModalVisible(true);
  }, []);

  const onSavePack = useCallback(async () => {
    if (!coach?.id || !token) return;
    if (!packSessionCount || packSessionCount < 1) { Alert.alert('Validation', 'Select number of sessions'); return; }
    const price = parseCurrencyInput(packPrice);
    if (!Number.isFinite(price) || price < 0) { Alert.alert('Validation', 'Enter a valid price'); return; }
    const generatedName = editingPack?.name ?? `${packSessionCount}-Session Pack`;
    const discToSave = effectiveDiscountPct != null && effectiveDiscountPct > 0 ? effectiveDiscountPct : null;

    setPackSaving(true);
    try {
      if (editingPack) {
        await updateCreditPack(coach.id, token, { packId: editingPack.id, name: generatedName, creditCount: packSessionCount, price, discountPercent: discToSave });
      } else {
        await createCreditPack(coach.id, token, { name: generatedName, creditCount: packSessionCount, price, discountPercent: discToSave });
      }
      setPackModalVisible(false);
      await loadPacks();
      await refreshProfile();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save pack');
    } finally {
      setPackSaving(false);
    }
  }, [coach?.id, token, packSessionCount, packPrice, effectiveDiscountPct, editingPack, loadPacks, refreshProfile]);

  const onDeletePack = useCallback(
    (pack: CreditPackResult) => {
      Alert.alert('Delete pack', `Remove "${pack.name}"? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!coach?.id || !token) return;
            try {
              await deleteCreditPack(coach.id, pack.id, token);
              await loadPacks();
              await refreshProfile();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete');
            }
          },
        },
      ]);
    },
    [coach?.id, token, loadPacks, refreshProfile],
  );

  const phoneVerified = Boolean(coach?.phoneVerified ?? coach?.isPhoneVerified);
  const onPhoneVerified = useCallback(() => {
    patchCoach({ phoneVerified: true, isPhoneVerified: true });
    if (coach?.id && token) {
      verifyCoachPhone(coach.id, token).catch(() => {});
    }
  }, [coach?.id, token, patchCoach]);

  const [quickSetupLoading, setQuickSetupLoading] = useState(false);
  const quickSetupPacks = useCallback(async () => {
    if (!coach?.id || !token) return;
    const rate = parseCurrencyInput(hourly1);
    if (!Number.isFinite(rate) || rate <= 0) {
      Alert.alert('Set your rate first', 'Enter your 1-on-1 hourly rate in the Pricing section above before using quick setup.');
      return;
    }
    const templates = [
      { sessions: 5, discount: 10 },
      { sessions: 10, discount: 20 },
      { sessions: 20, discount: 30 },
    ];
    setQuickSetupLoading(true);
    try {
      for (const t of templates) {
        const price = Math.round(rate * t.sessions * (1 - t.discount / 100));
        await createCreditPack(coach.id, token, {
          name: `${t.sessions}-Session Pack`,
          creditCount: t.sessions,
          price,
          discountPercent: t.discount,
        });
      }
      await loadPacks();
      await refreshProfile();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create packs');
    } finally {
      setQuickSetupLoading(false);
    }
  }, [coach?.id, token, hourly1, loadPacks, refreshProfile]);

  const showRatings = coach && (coach.ratingOverall != null || coach.ratingOnTime != null || coach.ratingFriendly != null || coach.ratingProfessional != null || coach.ratingRecommend != null);
  const initials = useMemo(() => initialsFromName(name || coach?.name || ''), [name, coach?.name]);
  const showPhoto = photo.trim().length > 0;
  const parsedRate1 = parseCurrencyInput(hourly1);
  const parsedRateG = hourlyGroup.trim() ? parseCurrencyInput(hourlyGroup) : null;

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
        {hasChanges && (
          <Pressable
            onPress={onSave}
            disabled={saving}
            style={({ pressed }) => [styles.savePill, { backgroundColor: t.accent, opacity: saving || pressed ? 0.82 : 1 }]}
          >
            {saving ? <ActivityIndicator color={t.bg} size="small" /> : <Text style={[styles.savePillText, { color: t.bg }]}>Save</Text>}
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* ── Visibility ── */}
        <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <View style={styles.publicRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.publicLabel, { color: t.text }]}>Visible to students</Text>
              <Text style={[styles.publicHint, { color: t.textMuted }]}>Hide your profile from coach discovery.</Text>
            </View>
            <Switch value={isProfilePublic} onValueChange={setIsProfilePublic} trackColor={{ false: t.border, true: t.accent }} thumbColor={t.bg} />
          </View>
        </View>

        {/* ── Photo & Name ── */}
        <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <View style={styles.avatarWrap}>
            {showPhoto ? (
              <Image source={{ uri: photo.trim() }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: t.accentBg }]}>
                <Text style={[styles.avatarInitials, { color: t.accent }]}>{initials}</Text>
              </View>
            )}
            <Pressable
              onPress={() => { void onPickPhoto(); }}
              style={({ pressed }) => [styles.smallActionBtn, { borderColor: t.border, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[styles.smallActionText, { color: t.text }]}>Change photo</Text>
            </Pressable>
          </View>
          <Field label="Name" theme={t}>
            <TextInput value={name} onChangeText={setName} style={[styles.input, { color: t.text, backgroundColor: t.bgInput, borderColor: t.border }]} placeholder="Your display name" placeholderTextColor={t.textMuted} />
          </Field>
          <Field label="Bio" theme={t}>
            <TextInput value={bio} onChangeText={setBio} style={[styles.input, styles.multiline, { color: t.text, backgroundColor: t.bgInput, borderColor: t.border }]} placeholder="Tell students about your coaching style" placeholderTextColor={t.textMuted} multiline />
          </Field>
          <Field label="Response hint" theme={t}>
            <TextInput value={responseHint} onChangeText={setResponseHint} style={[styles.input, { color: t.text, backgroundColor: t.bgInput, borderColor: t.border }]} placeholder="e.g. Usually responds within 2 hours" placeholderTextColor={t.textMuted} />
          </Field>
        </View>

        {/* ── Phone Verification ── */}
        <PhoneFieldVerificationSection
          theme={t}
          phone={coach.phone}
          verified={phoneVerified}
          onVerified={onPhoneVerified}
        />

        {/* ── Languages ── */}
        <SectionCard title="Languages" theme={t}>
          <View style={styles.optionWrap}>
            {LANGUAGE_OPTIONS.map((o) => (
              <OptionChip key={o} label={o} selected={languages.includes(o)} onPress={() => setLanguages((p) => toggleOption(p, o))} />
            ))}
          </View>
        </SectionCard>

        {/* ── Specialties ── */}
        <SectionCard title="Specialties" theme={t}>
          <View style={styles.optionWrap}>
            {SPECIALTY_OPTIONS.map((o) => (
              <OptionChip key={o} label={o} selected={specialties.includes(o)} onPress={() => setSpecialties((p) => toggleOption(p, o))} />
            ))}
          </View>
        </SectionCard>

        {/* ── Focus Level ── */}
        <SectionCard title="Focus Level" theme={t}>
          <View style={styles.optionWrap}>
            {FOCUS_LEVEL_OPTIONS.map((o) => (
              <OptionChip key={o} label={o} selected={focusLevels.includes(o)} onPress={() => setFocusLevels((p) => toggleOption(p, o))} />
            ))}
          </View>
        </SectionCard>

        {/* ── Experience ── */}
        <SectionCard title="Years of Experience" theme={t}>
          <View style={styles.optionWrap}>
            {EXPERIENCE_OPTIONS.map((o) => (
              <OptionChip key={o} label={o} selected={experienceBand === o} onPress={() => setExperienceBand(o)} />
            ))}
          </View>
        </SectionCard>

        {/* ── Pricing ── */}
        <SectionCard title="Pricing" theme={t}>
          <View style={[styles.priceCard, { borderColor: t.border }]}>
            <Pressable onPress={() => openAmountModal('1on1')} style={({ pressed }) => [styles.priceRow, { opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[styles.priceLabel, { color: t.textSec }]}>1-on-1</Text>
              <View style={styles.priceRight}>
                {Number.isFinite(parsedRate1) && parsedRate1 > 0 ? (
                  <Text style={[styles.priceValue, { color: t.text }]}>{formatVndFull(parsedRate1)} / hr</Text>
                ) : (
                  <Text style={[styles.priceValue, { color: t.textMuted }]}>Tap to set</Text>
                )}
                <Text style={[styles.priceChevron, { color: t.textMuted }]}>›</Text>
              </View>
            </Pressable>
            <Pressable onPress={() => openAmountModal('group')} style={({ pressed }) => [styles.priceRow, styles.priceRowBorder, { borderTopColor: t.border, opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[styles.priceLabel, { color: t.textSec }]}>Group</Text>
              <View style={styles.priceRight}>
                {parsedRateG != null && parsedRateG > 0 ? (
                  <Text style={[styles.priceValue, { color: t.text }]}>{formatVndFull(parsedRateG)} / person</Text>
                ) : (
                  <Text style={[styles.priceValue, { color: t.textMuted }]}>Tap to set</Text>
                )}
                <Text style={[styles.priceChevron, { color: t.textMuted }]}>›</Text>
              </View>
            </Pressable>
          </View>

          <View style={{ marginTop: spacing.md }}>
            <Text style={[styles.chipSectionLabel, { color: t.textSec }]}>Group size</Text>
            <View style={styles.optionWrap}>
              {GROUP_SIZE_OPTIONS.map((o) => (
                <OptionChip key={o} label={o} selected={groupSizes.includes(o)} onPress={() => setGroupSizes((p) => toggleOption(p, o))} />
              ))}
            </View>
          </View>
        </SectionCard>

        {/* ── Credit Packs ── */}
        <SectionCard title="Credit Packs" action="+ Add" onAction={openAddPack} theme={t}>
          {packsLoading ? (
            <ActivityIndicator color={t.accent} style={{ marginVertical: spacing.lg }} />
          ) : packs.length === 0 ? (
            <View style={[styles.emptyPacks, { borderColor: t.border }]}>
              <Text style={styles.emptyPacksIcon}>📦</Text>
              <Text style={[styles.emptyPacksTitle, { color: t.textSec }]}>No credit packs yet</Text>
              <Text style={[styles.emptyPacksBody, { color: t.textMuted }]}>
                Offer session bundles at a discount to attract committed students.
              </Text>
              <Pressable
                onPress={quickSetupPacks}
                disabled={quickSetupLoading}
                style={({ pressed }) => [styles.quickSetupBtn, { backgroundColor: t.accent, opacity: quickSetupLoading || pressed ? 0.82 : 1 }]}
              >
                {quickSetupLoading ? (
                  <ActivityIndicator color={t.bg} size="small" />
                ) : (
                  <Text style={[styles.quickSetupText, { color: t.bg }]}>Quick setup (5h · 10h · 20h)</Text>
                )}
              </Pressable>
            </View>
          ) : (
            packs.map((pack) => {
              const perCredit = pack.creditCount > 0 ? Math.round(pack.price / pack.creditCount) : pack.price;
              return (
                <View key={pack.id} style={[styles.packCard, { backgroundColor: pack.isActive ? t.bg : t.bgSurface, borderColor: t.border }]}>
                  <View style={styles.packHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.packName, { color: t.text }]}>{pack.name}</Text>
                      <Text style={[styles.packMeta, { color: t.textSec }]}>
                        {pack.creditCount} session{pack.creditCount !== 1 ? 's' : ''} · {formatVndFull(perCredit)} each
                      </Text>
                    </View>
                    <View style={styles.packRight}>
                      <Text style={[styles.packPrice, { color: t.accent }]}>{formatVndFull(pack.price)}</Text>
                      {pack.discountPercent != null && pack.discountPercent > 0 && (
                        <View style={[styles.discountBadge, { backgroundColor: t.green }]}>
                          <Text style={[styles.discountText, { color: t.bg }]}>-{pack.discountPercent}%</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {!pack.isActive && (
                    <View style={[styles.inactiveBadge, { backgroundColor: t.bgSurface }]}>
                      <Text style={[styles.inactiveBadgeText, { color: t.textMuted }]}>Inactive</Text>
                    </View>
                  )}
                  <View style={styles.packActions}>
                    <Pressable onPress={() => openEditPack(pack)} style={({ pressed }) => [styles.packActionBtn, { borderColor: t.border, opacity: pressed ? 0.85 : 1 }]}>
                      <Text style={[styles.packActionText, { color: t.accent }]}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => onDeletePack(pack)} style={({ pressed }) => [styles.packActionBtn, { borderColor: t.red, opacity: pressed ? 0.85 : 1 }]}>
                      <Text style={[styles.packActionText, { color: t.red }]}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </SectionCard>

        {/* ── Ratings ── */}
        {showRatings && (
          <SectionCard title="Ratings" theme={t}>
            {coach.ratingOverall != null && <RatingBar label="Overall" value={coach.ratingOverall} theme={t} />}
            {coach.ratingOnTime != null && <RatingBar label="On time" value={coach.ratingOnTime} theme={t} />}
            {coach.ratingFriendly != null && <RatingBar label="Friendly" value={coach.ratingFriendly} theme={t} />}
            {coach.ratingProfessional != null && <RatingBar label="Professional" value={coach.ratingProfessional} theme={t} />}
            {coach.ratingRecommend != null && <RatingBar label="Recommend" value={coach.ratingRecommend} theme={t} />}
          </SectionCard>
        )}
      </ScrollView>

      {/* ── Amount input modal (pricing) ── */}
      <Modal visible={amountModalTarget != null} transparent animationType="fade" onRequestClose={() => setAmountModalTarget(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAmountModalTarget(null)}>
          <Pressable style={[styles.amountSheet, { backgroundColor: t.bgCard }]} onPress={() => {}}>
            <View style={[styles.modalHandle, { backgroundColor: t.border }]} />
            <Text style={[styles.modalTitle, { color: t.text }]}>
              {amountModalTarget === '1on1' ? '1-on-1 Hourly Rate' : 'Group Hourly Rate'}
            </Text>
            <Text style={[styles.amountHint, { color: t.textMuted }]}>
              {amountModalTarget === 'group' ? 'Price per person per hour. Leave empty to disable group pricing.' : 'Price per hour in VND.'}
            </Text>
            <TextInput
              value={amountModalValue}
              onChangeText={(v) => setAmountModalValue(formatCurrencyInput(v))}
              style={[styles.amountInput, { color: t.text, backgroundColor: t.bgInput, borderColor: t.border }]}
              keyboardType="number-pad"
              placeholder="500,000"
              placeholderTextColor={t.textMuted}
              autoFocus
            />
            <Text style={[styles.amountSuffix, { color: t.textMuted }]}>VND / hour</Text>
            <View style={styles.modalButtons}>
              {amountModalTarget === 'group' && (
                <Pressable onPress={clearGroupRate} style={({ pressed }) => [styles.modalCancelBtn, { borderColor: t.red, opacity: pressed ? 0.85 : 1 }]}>
                  <Text style={[styles.modalCancelText, { color: t.red }]}>Clear</Text>
                </Pressable>
              )}
              <Pressable onPress={() => setAmountModalTarget(null)} style={({ pressed }) => [styles.modalCancelBtn, { borderColor: t.border, opacity: pressed ? 0.85 : 1 }]}>
                <Text style={[styles.modalCancelText, { color: t.textSec }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmAmountModal} style={({ pressed }) => [styles.modalSaveBtn, { backgroundColor: t.accent, opacity: pressed ? 0.82 : 1 }]}>
                <Text style={[styles.modalSaveText, { color: t.bg }]}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Credit Pack modal ── */}
      <Modal visible={packModalVisible} transparent animationType="slide" onRequestClose={() => setPackModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: t.bgCard }]}>
            <View style={[styles.modalHandle, { backgroundColor: t.border }]} />
            <Text style={[styles.modalTitle, { color: t.text }]}>
              {editingPack ? 'Edit Credit Pack' : 'New Credit Pack'}
            </Text>

            {/* Sessions count buttons */}
            <Text style={[styles.packFieldLabel, { color: t.textSec }]}>Number of sessions</Text>
            <View style={styles.packBtnRow}>
              {SESSION_COUNT_OPTIONS.map((n) => {
                const active = packSessionCount === n;
                return (
                  <Pressable
                    key={n}
                    onPress={() => selectSessionCount(n)}
                    style={({ pressed }) => [
                      styles.packOptionBtn,
                      { backgroundColor: active ? t.accentBgStrong : t.bgInput, borderColor: active ? t.accent : t.border, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <Text style={[styles.packOptionText, { color: active ? t.accent : t.textSec }]}>{n}h</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Auto-generated name */}
            {packAutoName ? (
              <Text style={[styles.packAutoName, { color: t.textMuted }]}>{packAutoName}</Text>
            ) : null}

            {/* Base price (read-only info) */}
            {packBasePrice > 0 && (
              <View style={[styles.packInfoRow, { borderColor: t.border }]}>
                <Text style={[styles.packInfoLabel, { color: t.textSec }]}>Base price</Text>
                <Text style={[styles.packInfoValue, { color: t.textMuted }]}>
                  {packSessionCount} × {formatVndFull(hourlyRate)} = {formatVndFull(packBasePrice)}
                </Text>
              </View>
            )}

            {/* Discount buttons */}
            {packBasePrice > 0 && (
              <>
                <Text style={[styles.packFieldLabel, { color: t.textSec }]}>Discount</Text>
                <View style={styles.packBtnRow}>
                  {DISCOUNT_OPTIONS.map((d) => {
                    const active = packDiscountPct === d;
                    return (
                      <Pressable
                        key={d}
                        onPress={() => applyDiscount(active ? null : d)}
                        style={({ pressed }) => [
                          styles.packOptionBtn,
                          { backgroundColor: active ? t.accentBgStrong : t.bgInput, borderColor: active ? t.accent : t.border, opacity: pressed ? 0.85 : 1 },
                        ]}
                      >
                        <Text style={[styles.packOptionText, { color: active ? t.accent : t.textSec }]}>{d}%</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {/* Final price (editable) */}
            {packBasePrice > 0 && (
              <View style={{ marginTop: spacing.sm }}>
                <Text style={[styles.packFieldLabel, { color: t.textSec }]}>Pack price (VND)</Text>
                <TextInput
                  value={packPrice}
                  onChangeText={(v) => { setPackPrice(formatCurrencyInput(v)); setPackDiscountPct(null); }}
                  style={[styles.packPriceInput, { color: t.text, backgroundColor: t.bgInput, borderColor: t.border }]}
                  keyboardType="number-pad"
                  placeholder={packBasePrice.toLocaleString('en-US')}
                  placeholderTextColor={t.textMuted}
                />
                {effectiveDiscountPct != null && effectiveDiscountPct > 0 && (
                  <View style={styles.packDiscountHintRow}>
                    <View style={[styles.discountBadgeInline, { backgroundColor: t.green }]}>
                      <Text style={[styles.discountBadgeText, { color: t.bg }]}>-{effectiveDiscountPct}%</Text>
                    </View>
                    <Text style={[styles.packSavingsText, { color: t.textMuted }]}>
                      saves {formatVndFull(packBasePrice - packFinalPrice)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.modalButtons}>
              <Pressable onPress={() => setPackModalVisible(false)} style={({ pressed }) => [styles.modalCancelBtn, { borderColor: t.border, opacity: pressed ? 0.85 : 1 }]}>
                <Text style={[styles.modalCancelText, { color: t.textSec }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={onSavePack} disabled={packSaving} style={({ pressed }) => [styles.modalSaveBtn, { backgroundColor: t.accent, opacity: packSaving || pressed ? 0.82 : 1 }]}>
                {packSaving ? <ActivityIndicator color={t.bg} size="small" /> : <Text style={[styles.modalSaveText, { color: t.bg }]}>{editingPack ? 'Update' : 'Create'}</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Reusable section card (SectionHeader + bordered card) ──

function SectionCard({
  title,
  action,
  onAction,
  theme,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  theme: ThemeTokens;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <SectionHeader title={title} action={action} onAction={onAction} theme={theme} />
      {children}
    </View>
  );
}

function Field({ label, theme, children }: { label: string; theme: ThemeTokens; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textSec }]}>{label}</Text>
      {children}
    </View>
  );
}

function OptionChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? t.accentBgStrong : t.bgInput, borderColor: selected ? t.accent : t.border, opacity: pressed ? 0.85 : 1 },
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
  topTitle: { fontSize: fontSize.lg, fontWeight: '800' },
  savePill: {
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePillText: { fontSize: fontSize.sm, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing['5xl'], gap: spacing.md },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  publicRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  publicLabel: { fontSize: fontSize.md, fontWeight: '700' },
  publicHint: { marginTop: 2, fontSize: fontSize.xs },
  avatarWrap: { alignItems: 'center', marginBottom: spacing.sm },
  avatar: { width: 76, height: 76, borderRadius: borderRadius.full },
  avatarFallback: { width: 76, height: 76, borderRadius: borderRadius.full, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: fontSize.xl, fontWeight: '800' },
  smallActionBtn: { marginTop: spacing.sm, borderWidth: 1, borderRadius: borderRadius.full, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  smallActionText: { fontSize: fontSize.xs, fontWeight: '700' },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderWidth: 1, borderRadius: borderRadius.full, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  chipText: { fontSize: fontSize.sm, fontWeight: '700' },
  chipSectionLabel: { fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: spacing.sm },
  label: { fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: spacing.xs },
  field: { marginBottom: spacing.sm },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.md },
  multiline: { minHeight: 96, textAlignVertical: 'top' },

  // Pricing card
  priceCard: { borderRadius: borderRadius.md, borderWidth: 1, overflow: 'hidden' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  priceRowBorder: { borderTopWidth: 1 },
  priceRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priceLabel: { fontSize: fontSize.md, fontWeight: '600' },
  priceValue: { fontSize: fontSize.md, fontWeight: '700' },
  priceChevron: { fontSize: fontSize.lg, fontWeight: '300' },

  // Credit packs
  emptyPacks: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, borderWidth: 1, borderStyle: 'dashed', borderRadius: borderRadius.md },
  emptyPacksIcon: { fontSize: 32, marginBottom: spacing.sm },
  emptyPacksTitle: { fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.xs },
  emptyPacksBody: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: fontSize.sm * 1.45 },
  quickSetupBtn: { marginTop: spacing.lg, borderRadius: borderRadius.full, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, minWidth: 180, alignItems: 'center' },
  quickSetupText: { fontSize: fontSize.sm, fontWeight: '700' },
  packCard: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md },
  packHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  packName: { fontSize: fontSize.md, fontWeight: '700' },
  packMeta: { fontSize: fontSize.sm, marginTop: 2, color: undefined },
  packRight: { alignItems: 'flex-end', gap: spacing.xs },
  packPrice: { fontSize: fontSize.md, fontWeight: '800' },
  discountBadge: { paddingVertical: 2, paddingHorizontal: spacing.sm, borderRadius: borderRadius.sm },
  discountText: { fontSize: fontSize.xs, fontWeight: '700' },
  inactiveBadge: { alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: spacing.sm, borderRadius: borderRadius.sm, marginTop: spacing.xs },
  inactiveBadgeText: { fontSize: fontSize.xs, fontWeight: '600' },
  packActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.06)' },
  packActionBtn: { flex: 1, borderWidth: 1, borderRadius: borderRadius.md, paddingVertical: spacing.sm, alignItems: 'center' },
  packActionText: { fontSize: fontSize.sm, fontWeight: '700' },

  // Modals (shared)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.xl, paddingBottom: spacing['4xl'] },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: fontSize.xl, fontWeight: '800', marginBottom: spacing.md },
  modalButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalCancelBtn: { flex: 1, borderWidth: 1, borderRadius: borderRadius.md, paddingVertical: spacing.md, alignItems: 'center' },
  modalCancelText: { fontSize: fontSize.md, fontWeight: '700' },
  modalSaveBtn: { flex: 1.5, borderRadius: borderRadius.md, paddingVertical: spacing.md, alignItems: 'center' },
  modalSaveText: { fontSize: fontSize.md, fontWeight: '800' },

  // Pack modal fields
  packFieldLabel: { fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: spacing.sm, marginTop: spacing.sm },
  packBtnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  packOptionBtn: { borderWidth: 1, borderRadius: borderRadius.full, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, minWidth: 52, alignItems: 'center' },
  packOptionText: { fontSize: fontSize.sm, fontWeight: '700' },
  packAutoName: { fontSize: fontSize.sm, fontStyle: 'italic', marginBottom: spacing.sm },
  packInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderWidth: 1, borderStyle: 'dashed', borderRadius: borderRadius.md, marginBottom: spacing.md },
  packInfoLabel: { fontSize: fontSize.sm, fontWeight: '600' },
  packInfoValue: { fontSize: fontSize.sm, fontWeight: '700' },
  packPriceInput: { borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: fontSize.xl, fontWeight: '700', textAlign: 'center' },
  packDiscountHintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm },
  discountBadgeInline: { paddingVertical: 2, paddingHorizontal: spacing.sm, borderRadius: borderRadius.sm },
  discountBadgeText: { fontSize: fontSize.xs, fontWeight: '700' },
  packSavingsText: { fontSize: fontSize.sm },

  // Amount modal
  amountSheet: { borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.xl, paddingBottom: spacing['4xl'] },
  amountHint: { fontSize: fontSize.sm, marginBottom: spacing.lg, lineHeight: fontSize.sm * 1.4 },
  amountInput: { borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, fontSize: fontSize['2xl'], fontWeight: '700', textAlign: 'center' },
  amountSuffix: { fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.sm },
});
