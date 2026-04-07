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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { spacing, fontSize, borderRadius } from '@/mobile/lib/theme';
import { darkTheme as t } from '@/mobile/lib/theme';
import { useCoachAuth } from '@/context/CoachAuthContext';
import { SectionHeader, EmptyState, StatusChip, RatingBar } from '@/components/coach';
import {
  getCoachAvailability,
  listCoachCourts,
  saveCoachAvailability,
} from '@/mobile/lib/coach-api';
import type { CoachAvailabilityResult } from '@/mobile/lib/coach-types';

/** Monday .. Sunday as JS weekday: Mon=1 … Sat=6, Sun=0 */
const WEEK_DAYS: { label: string; dow: number }[] = [
  { label: 'Mon', dow: 1 },
  { label: 'Tue', dow: 2 },
  { label: 'Wed', dow: 3 },
  { label: 'Thu', dow: 4 },
  { label: 'Fri', dow: 5 },
  { label: 'Sat', dow: 6 },
  { label: 'Sun', dow: 0 },
];

type TimeBlock = {
  id: string;
  startTime: string;
  endTime: string;
  venueId: string;
};

type VenueOption = { venueId: string; name: string };

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyBlock(defaultVenueId: string): TimeBlock {
  return {
    id: randomId(),
    startTime: '09:00',
    endTime: '12:00',
    venueId: defaultVenueId,
  };
}

export default function CoachAvailabilityEditorScreen() {
  const router = useRouter();
  const { coach, token, isLoggedIn } = useCoachAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [blocksByDay, setBlocksByDay] = useState<Record<number, TimeBlock[]>>({});
  const [picker, setPicker] = useState<{ dow: number; blockId: string } | null>(null);

  const defaultVenueId = venues[0]?.venueId ?? '';

  const loadCourts = useCallback(async () => {
    if (!coach?.id) return [];
    const links = await listCoachCourts(coach.id).catch(() => []);
    return links.map((l) => ({
      venueId: l.venueId,
      name: l.venue?.name ?? l.venueId,
    }));
  }, [coach?.id]);

  const loadAvailability = useCallback(async (): Promise<CoachAvailabilityResult[]> => {
    if (!coach?.id) return [];
    return getCoachAvailability(coach.id).catch(() => []);
  }, [coach?.id]);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/(coach-tabs)/login');
    }
  }, [isLoggedIn, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!coach?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [vList, rows] = await Promise.all([loadCourts(), loadAvailability()]);
        if (cancelled) return;
        setVenues(vList);
        const fromApi: Record<number, TimeBlock[]> = {};
        for (const row of rows) {
          if (row.date != null) continue;
          if (row.dayOfWeek == null) continue;
          const dow = row.dayOfWeek;
          if (!fromApi[dow]) fromApi[dow] = [];
          fromApi[dow].push({
            id: row.id || randomId(),
            startTime: row.startTime,
            endTime: row.endTime,
            venueId: row.venueId,
          });
        }
        const firstVid = vList[0]?.venueId ?? '';
        for (const { dow } of WEEK_DAYS) {
          if (!fromApi[dow]?.length && firstVid) {
            fromApi[dow] = [emptyBlock(firstVid)];
          }
        }
        setBlocksByDay(fromApi);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coach?.id, loadAvailability, loadCourts]);

  useEffect(() => {
    if (loading || venues.length === 0) return;
    setBlocksByDay((prev) => {
      const dv = venues[0]!.venueId;
      const next = { ...prev };
      let changed = false;
      for (const { dow } of WEEK_DAYS) {
        const blocks = next[dow];
        if (!blocks || blocks.length === 0) {
          next[dow] = [emptyBlock(dv)];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [loading, venues]);

  const venueName = useCallback(
    (id: string) => venues.find((v) => v.venueId === id)?.name ?? id,
    [venues],
  );

  const updateBlock = useCallback((dow: number, blockId: string, patch: Partial<TimeBlock>) => {
    setBlocksByDay((prev) => {
      const list = prev[dow] ?? [];
      return {
        ...prev,
        [dow]: list.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
      };
    });
  }, []);

  const addBlock = useCallback(
    (dow: number) => {
      const dv = defaultVenueId;
      if (!dv) {
        Alert.alert('Venues', 'Link a court first.');
        return;
      }
      setBlocksByDay((prev) => ({
        ...prev,
        [dow]: [...(prev[dow] ?? []), emptyBlock(dv)],
      }));
    },
    [defaultVenueId],
  );

  const removeBlock = useCallback((dow: number, blockId: string) => {
    setBlocksByDay((prev) => {
      const list = (prev[dow] ?? []).filter((b) => b.id !== blockId);
      const dv = defaultVenueId;
      return {
        ...prev,
        [dow]: list.length > 0 ? list : dv ? [emptyBlock(dv)] : [],
      };
    });
  }, [defaultVenueId]);

  const onSave = useCallback(async () => {
    if (!coach?.id || !token) {
      Alert.alert('Error', 'Not signed in');
      return;
    }
    if (venues.length === 0) {
      Alert.alert('Venues', 'No linked courts. Add a partnership first.');
      return;
    }
    const availability: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      venueId: string;
      date: null;
      isBlocked: boolean;
    }[] = [];

    for (const { dow } of WEEK_DAYS) {
      for (const b of blocksByDay[dow] ?? []) {
        if (!b.venueId.trim()) {
          Alert.alert('Validation', `Pick a venue for every block (${WEEK_DAYS.find((d) => d.dow === dow)?.label}).`);
          return;
        }
        availability.push({
          dayOfWeek: dow,
          startTime: b.startTime.trim(),
          endTime: b.endTime.trim(),
          venueId: b.venueId.trim(),
          date: null,
          isBlocked: false,
        });
      }
    }

    setSaving(true);
    try {
      await saveCoachAvailability(coach.id, token, availability);
      Alert.alert('Saved', 'Weekly availability updated.');
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Network error');
    } finally {
      setSaving(false);
    }
  }, [blocksByDay, coach?.id, token, venues.length]);

  const showRatings =
    coach &&
    (coach.ratingOverall != null ||
      coach.ratingOnTime != null ||
      coach.ratingFriendly != null ||
      coach.ratingProfessional != null ||
      coach.ratingRecommend != null);

  if (!coach) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
        <EmptyState title="Sign in required" subtitle="Log in as a coach to edit availability." theme={t} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <SectionHeader title="Weekly availability" theme={t} />

        {showRatings ? (
          <View style={[styles.ratingCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
            <View style={styles.ratingHeader}>
              <Text style={[styles.ratingTitle, { color: t.textSec }]}>Coach quality</Text>
              <StatusChip status={`${coach.reviewCount} reviews`} theme={t} />
            </View>
            {coach.ratingOverall != null ? (
              <RatingBar label="Overall" value={coach.ratingOverall} theme={t} />
            ) : null}
          </View>
        ) : null}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={t.accent} />
          </View>
        ) : venues.length === 0 ? (
          <EmptyState
            title="No venues linked"
            subtitle="Link a court partnership before setting availability."
            theme={t}
          />
        ) : (
          WEEK_DAYS.map(({ label, dow }) => (
            <View key={dow} style={[styles.dayCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
              <Text style={[styles.dayTitle, { color: t.text }]}>{label}</Text>
              {(blocksByDay[dow] ?? []).map((block) => (
                <View key={block.id} style={[styles.block, { borderColor: t.border }]}>
                  <View style={styles.row}>
                    <View style={styles.timeCol}>
                      <Text style={[styles.miniLabel, { color: t.textMuted }]}>Start</Text>
                      <TextInput
                        value={block.startTime}
                        onChangeText={(v) => updateBlock(dow, block.id, { startTime: v })}
                        style={[styles.timeInput, { color: t.text, backgroundColor: t.bgInput, borderColor: t.border }]}
                        placeholder="09:00"
                        placeholderTextColor={t.textMuted}
                      />
                    </View>
                    <View style={styles.timeCol}>
                      <Text style={[styles.miniLabel, { color: t.textMuted }]}>End</Text>
                      <TextInput
                        value={block.endTime}
                        onChangeText={(v) => updateBlock(dow, block.id, { endTime: v })}
                        style={[styles.timeInput, { color: t.text, backgroundColor: t.bgInput, borderColor: t.border }]}
                        placeholder="12:00"
                        placeholderTextColor={t.textMuted}
                      />
                    </View>
                  </View>
                  <Text style={[styles.miniLabel, { color: t.textMuted }]}>Venue</Text>
                  <Pressable
                    onPress={() =>
                      setPicker((p) =>
                        p?.dow === dow && p.blockId === block.id ? null : { dow, blockId: block.id },
                      )
                    }
                    style={({ pressed }) => [
                      styles.venueBtn,
                      {
                        backgroundColor: t.bgInput,
                        borderColor: t.border,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.venueBtnText, { color: t.text }]} numberOfLines={1}>
                      {venueName(block.venueId)}
                    </Text>
                    <Text style={{ color: t.accent, fontSize: fontSize.sm, fontWeight: '700' }}>Choose</Text>
                  </Pressable>
                  {picker?.dow === dow && picker.blockId === block.id
                    ? venues.map((item) => (
                        <Pressable
                          key={item.venueId}
                          onPress={() => {
                            updateBlock(dow, block.id, { venueId: item.venueId });
                            setPicker(null);
                          }}
                          style={({ pressed }) => [
                            styles.venueRow,
                            {
                              backgroundColor: t.bgSurface,
                              opacity: pressed ? 0.85 : 1,
                            },
                          ]}
                        >
                          <Text style={[styles.venueRowText, { color: t.text }]}>{item.name}</Text>
                        </Pressable>
                      ))
                    : null}
                  <View style={styles.blockActions}>
                    <Pressable
                      onPress={() => addBlock(dow)}
                      style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                    >
                      <Text style={{ color: t.accent, fontWeight: '700', fontSize: fontSize.sm }}>+ Add block</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => removeBlock(dow, block.id)}
                      style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                    >
                      <Text style={{ color: t.red, fontWeight: '700', fontSize: fontSize.sm }}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}

        {venues.length > 0 ? (
          <Pressable
            onPress={onSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: t.accent, opacity: saving || pressed ? 0.88 : 1 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color={t.bg} />
            ) : (
              <Text style={[styles.saveBtnText, { color: t.bg }]}>Save availability</Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['5xl'],
    gap: spacing.md,
  },
  ratingCard: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  ratingTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayCard: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.md,
  },
  dayTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  block: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeCol: {
    flex: 1,
  },
  miniLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  timeInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
  },
  venueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  venueBtnText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  venueRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  venueRowText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  blockActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  saveBtn: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  centered: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
