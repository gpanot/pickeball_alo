import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '@/mobile/lib/theme';
import { darkTheme as t } from '@/mobile/lib/theme';
import { useCoachAuth } from '@/context/CoachAuthContext';
import { EmptyState } from '@/components/coach';
import {
  getCoachAvailability,
  saveCoachAvailability,
} from '@/mobile/lib/coach-api';
import type { CoachAvailabilityResult } from '@/mobile/lib/coach-types';

const WEEK_DAYS: { label: string; shortLabel: string; dow: number }[] = [
  { label: 'Monday', shortLabel: 'Mon', dow: 1 },
  { label: 'Tuesday', shortLabel: 'Tue', dow: 2 },
  { label: 'Wednesday', shortLabel: 'Wed', dow: 3 },
  { label: 'Thursday', shortLabel: 'Thu', dow: 4 },
  { label: 'Friday', shortLabel: 'Fri', dow: 5 },
  { label: 'Saturday', shortLabel: 'Sat', dow: 6 },
  { label: 'Sunday', shortLabel: 'Sun', dow: 0 },
];

const TIME_OPTIONS: string[] = [];
for (let h = 5; h <= 23; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 23) TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`);
}

type TimeBlock = { id: string; startTime: string; endTime: string };
type HolidayPeriod = { id: string; startDate: string; endDate: string };

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyBlock(): TimeBlock {
  return { id: randomId(), startTime: '09:00', endTime: '12:00' };
}

function datesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const d = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  if (isNaN(d.getTime()) || isNaN(e.getTime()) || d > e) return dates;
  const maxDays = 365;
  let count = 0;
  while (d <= e && count < maxDays) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 1);
    count++;
  }
  return dates;
}

function collapseBlockedDates(rows: CoachAvailabilityResult[]): HolidayPeriod[] {
  const blocked = rows
    .filter((r) => r.isBlocked && r.date)
    .map((r) => r.date!)
    .sort();
  if (blocked.length === 0) return [];
  const periods: HolidayPeriod[] = [];
  let start = blocked[0];
  let prev = blocked[0];
  for (let i = 1; i < blocked.length; i++) {
    const cur = blocked[i];
    const prevDate = new Date(prev + 'T00:00:00');
    prevDate.setDate(prevDate.getDate() + 1);
    const nextExpected =
      prevDate.getFullYear() +
      '-' +
      String(prevDate.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(prevDate.getDate()).padStart(2, '0');
    if (cur === nextExpected) {
      prev = cur;
    } else {
      periods.push({ id: randomId(), startDate: start, endDate: prev });
      start = cur;
      prev = cur;
    }
  }
  periods.push({ id: randomId(), startDate: start, endDate: prev });
  return periods;
}

function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CoachAvailabilityEditorScreen() {
  const router = useRouter();
  const { coach, token } = useCoachAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabledDays, setEnabledDays] = useState<Record<number, boolean>>({});
  const [blocksByDay, setBlocksByDay] = useState<Record<number, TimeBlock[]>>({});
  const [holidays, setHolidays] = useState<HolidayPeriod[]>([]);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{
    dow: number;
    blockId: string;
    field: 'startTime' | 'endTime';
  } | null>(null);

  const loadAvailability = useCallback(async (): Promise<CoachAvailabilityResult[]> => {
    if (!coach?.id) return [];
    return getCoachAvailability(coach.id).catch(() => []);
  }, [coach?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!coach?.id) { setLoading(false); return; }
      setLoading(true);
      try {
        const rows = await loadAvailability();
        if (cancelled) return;

        const fromApi: Record<number, TimeBlock[]> = {};
        const enabled: Record<number, boolean> = {};

        for (const row of rows) {
          if (row.isBlocked || row.date != null) continue;
          if (row.dayOfWeek == null) continue;
          const dow = row.dayOfWeek;
          if (!fromApi[dow]) fromApi[dow] = [];
          fromApi[dow].push({
            id: row.id || randomId(),
            startTime: row.startTime,
            endTime: row.endTime,
          });
          enabled[dow] = true;
        }

        for (const { dow } of WEEK_DAYS) {
          if (!fromApi[dow]?.length) fromApi[dow] = [emptyBlock()];
          if (enabled[dow] === undefined) enabled[dow] = true;
        }

        setBlocksByDay(fromApi);
        setEnabledDays(enabled);
        setHolidays(collapseBlockedDates(rows));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [coach?.id, loadAvailability]);

  const toggleDay = useCallback((dow: number) => {
    setEnabledDays((prev) => ({ ...prev, [dow]: !prev[dow] }));
  }, []);

  const updateBlock = useCallback((dow: number, blockId: string, patch: Partial<TimeBlock>) => {
    setBlocksByDay((prev) => ({
      ...prev,
      [dow]: (prev[dow] ?? []).map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
    }));
  }, []);

  const addBlock = useCallback((dow: number) => {
    setBlocksByDay((prev) => ({
      ...prev,
      [dow]: [...(prev[dow] ?? []), emptyBlock()],
    }));
  }, []);

  const removeBlock = useCallback((dow: number, blockId: string) => {
    setBlocksByDay((prev) => {
      const list = (prev[dow] ?? []).filter((b) => b.id !== blockId);
      return { ...prev, [dow]: list.length > 0 ? list : [emptyBlock()] };
    });
  }, []);

  const openPicker = useCallback(
    (dow: number, blockId: string, field: 'startTime' | 'endTime') => {
      setPickerTarget({ dow, blockId, field });
      setPickerVisible(true);
    },
    [],
  );

  const onPickTime = useCallback(
    (time: string) => {
      if (pickerTarget) {
        updateBlock(pickerTarget.dow, pickerTarget.blockId, { [pickerTarget.field]: time });
      }
      setPickerVisible(false);
      setPickerTarget(null);
    },
    [pickerTarget, updateBlock],
  );

  const addHoliday = useCallback(() => {
    const today = todayYMD();
    setHolidays((prev) => [...prev, { id: randomId(), startDate: today, endDate: today }]);
  }, []);

  const updateHoliday = useCallback((id: string, patch: Partial<HolidayPeriod>) => {
    setHolidays((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }, []);

  const removeHoliday = useCallback((id: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const onSave = useCallback(async () => {
    if (!coach?.id || !token) {
      Alert.alert('Error', 'Not signed in');
      return;
    }

    const availability: {
      dayOfWeek: number | null;
      startTime: string;
      endTime: string;
      venueId: null;
      date: string | null;
      isBlocked: boolean;
    }[] = [];

    for (const { dow } of WEEK_DAYS) {
      if (!enabledDays[dow]) continue;
      for (const b of blocksByDay[dow] ?? []) {
        availability.push({
          dayOfWeek: dow,
          startTime: b.startTime.trim(),
          endTime: b.endTime.trim(),
          venueId: null,
          date: null,
          isBlocked: false,
        });
      }
    }

    for (const h of holidays) {
      const dates = datesBetween(h.startDate, h.endDate);
      if (dates.length === 0) continue;
      for (const d of dates) {
        availability.push({
          dayOfWeek: null,
          startTime: '00:00',
          endTime: '23:59',
          venueId: null,
          date: d,
          isBlocked: true,
        });
      }
    }

    setSaving(true);
    try {
      await saveCoachAvailability(coach.id, token, availability);
      Alert.alert('Saved', 'Availability updated.');
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Network error');
    } finally {
      setSaving(false);
    }
  }, [blocksByDay, coach?.id, enabledDays, holidays, token]);

  const pickerCurrentValue = pickerTarget
    ? (blocksByDay[pickerTarget.dow] ?? []).find((b) => b.id === pickerTarget.blockId)?.[pickerTarget.field] ?? ''
    : '';

  if (!coach) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
        <EmptyState title="Sign in required" subtitle="Log in as a coach to edit availability." theme={t} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={t.accent} />
          <Text style={[styles.backText, { color: t.accent }]}>Back</Text>
        </Pressable>
        <Text style={[styles.topTitle, { color: t.text }]}>Weekly Availability</Text>
        <Pressable
          onPress={onSave}
          disabled={saving || loading}
          hitSlop={12}
          style={({ pressed }) => [
            styles.saveTopBtn,
            { backgroundColor: t.accent, opacity: saving || pressed ? 0.7 : 1 },
          ]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={t.bg} />
          ) : (
            <Text style={[styles.saveTopText, { color: t.bg }]}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.subtitle, { color: t.textSec }]}>
          Applies across all your preferred courts.
        </Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={t.accent} />
          </View>
        ) : (
          <>
            {/* Weekly schedule */}
            <View style={[styles.weekCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
              {WEEK_DAYS.map(({ shortLabel, dow }, dayIdx) => {
                const on = enabledDays[dow] !== false;
                const blocks = blocksByDay[dow] ?? [];
                return (
                  <View
                    key={dow}
                    style={[
                      styles.daySection,
                      dayIdx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border },
                    ]}
                  >
                    {blocks.map((block, blockIdx) => (
                      <View
                        key={block.id}
                        style={[styles.slotRow, !on && styles.slotRowDisabled]}
                      >
                        {blockIdx === 0 ? (
                          <>
                            <Text style={[styles.dayLabel, { color: on ? t.text : t.textMuted }]}>
                              {shortLabel}
                            </Text>
                            <Switch
                              value={on}
                              onValueChange={() => toggleDay(dow)}
                              trackColor={{ false: '#333', true: t.accentBgStrong }}
                              thumbColor={on ? t.accent : '#666'}
                              style={styles.toggle}
                            />
                          </>
                        ) : (
                          <View style={{ width: 36 + 42 }} />
                        )}

                        {on ? (
                          <>
                            <Pressable
                              onPress={() => openPicker(dow, block.id, 'startTime')}
                              style={[styles.timePill, { backgroundColor: t.bgInput, borderColor: t.border }]}
                            >
                              <Text style={[styles.timePillText, { color: t.text }]}>
                                {block.startTime}
                              </Text>
                            </Pressable>
                            <Text style={[styles.dash, { color: t.textMuted }]}>–</Text>
                            <Pressable
                              onPress={() => openPicker(dow, block.id, 'endTime')}
                              style={[styles.timePill, { backgroundColor: t.bgInput, borderColor: t.border }]}
                            >
                              <Text style={[styles.timePillText, { color: t.text }]}>
                                {block.endTime}
                              </Text>
                            </Pressable>
                            <Pressable onPress={() => addBlock(dow)} hitSlop={8} style={styles.iconBtn}>
                              <Ionicons name="add-circle-outline" size={18} color={t.accent} />
                            </Pressable>
                            {blocks.length > 1 && (
                              <Pressable onPress={() => removeBlock(dow, block.id)} hitSlop={8} style={styles.iconBtn}>
                                <Ionicons name="close-circle-outline" size={18} color={t.red} />
                              </Pressable>
                            )}
                          </>
                        ) : (
                          <Text style={[styles.offLabel, { color: t.textMuted }]}>Off</Text>
                        )}
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>

            {/* Holidays */}
            <View style={styles.holidayHeader}>
              <Text style={[styles.sectionTitle, { color: t.text }]}>Holiday periods</Text>
              <Pressable
                onPress={addHoliday}
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Text style={{ color: t.accent, fontWeight: '700', fontSize: fontSize.sm }}>+ Add</Text>
              </Pressable>
            </View>
            <Text style={[styles.holidaySub, { color: t.textMuted }]}>
              Block specific date ranges (vacations, public holidays).
            </Text>

            {holidays.length === 0 ? (
              <Text style={[styles.noHoliday, { color: t.textMuted }]}>No holidays set.</Text>
            ) : (
              <View style={[styles.weekCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                {holidays.map((h, idx) => (
                  <View
                    key={h.id}
                    style={[
                      styles.holidayRow,
                      idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border },
                    ]}
                  >
                    <TextInput
                      value={h.startDate}
                      onChangeText={(v) => updateHoliday(h.id, { startDate: v })}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={t.textMuted}
                      style={[styles.dateInput, { color: t.text, backgroundColor: t.bgInput, borderColor: t.border }]}
                      maxLength={10}
                      keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                    />
                    <Text style={[styles.dash, { color: t.textMuted }]}>→</Text>
                    <TextInput
                      value={h.endDate}
                      onChangeText={(v) => updateHoliday(h.id, { endDate: v })}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={t.textMuted}
                      style={[styles.dateInput, { color: t.text, backgroundColor: t.bgInput, borderColor: t.border }]}
                      maxLength={10}
                      keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                    />
                    <Pressable onPress={() => removeHoliday(h.id)} hitSlop={10} style={styles.iconBtn}>
                      <Ionicons name="close-circle" size={20} color={t.red} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Time picker modal */}
      <Modal visible={pickerVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setPickerVisible(false)}>
          <View />
        </Pressable>
        <View style={[styles.pickerSheet, { backgroundColor: t.bgCard }]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: t.text }]}>
              Select {pickerTarget?.field === 'startTime' ? 'start' : 'end'} time
            </Text>
            <Pressable onPress={() => setPickerVisible(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color={t.textSec} />
            </Pressable>
          </View>
          <FlatList
            data={TIME_OPTIONS}
            keyExtractor={(item) => item}
            style={styles.pickerList}
            initialScrollIndex={Math.max(
              0,
              TIME_OPTIONS.findIndex((t) => t === pickerCurrentValue),
            )}
            getItemLayout={(_, index) => ({ length: 48, offset: 48 * index, index })}
            renderItem={({ item }) => {
              const selected = item === pickerCurrentValue;
              return (
                <Pressable
                  onPress={() => onPickTime(item)}
                  style={[
                    styles.pickerItem,
                    selected && { backgroundColor: t.accentBgStrong },
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      { color: selected ? t.accent : t.text },
                      selected && { fontWeight: '800' },
                    ]}
                  >
                    {item}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={18} color={t.accent} />}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 70,
  },
  backText: { fontSize: fontSize.md, fontWeight: '600' },
  topTitle: { fontSize: fontSize.md, fontWeight: '700', flex: 1, textAlign: 'center' },
  saveTopBtn: {
    minWidth: 60,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveTopText: { fontSize: fontSize.sm, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing['5xl'] },
  subtitle: { fontSize: fontSize.xs, marginBottom: spacing.sm },
  weekCard: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  daySection: { paddingVertical: 4, paddingHorizontal: spacing.sm },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    gap: 4,
  },
  slotRowDisabled: { opacity: 0.6 },
  dayLabel: { width: 36, fontSize: fontSize.sm, fontWeight: '700' },
  toggle: { transform: [{ scale: 0.7 }], marginRight: -2 },
  timePill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 58,
    alignItems: 'center',
  },
  timePillText: { fontSize: fontSize.sm, fontWeight: '600' },
  dash: { fontSize: fontSize.sm, fontWeight: '600', marginHorizontal: 2 },
  offLabel: { fontSize: fontSize.sm, fontStyle: 'italic' },
  iconBtn: { padding: 2 },
  centered: { minHeight: 120, alignItems: 'center', justifyContent: 'center' },

  holidayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: 2,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700' },
  holidaySub: { fontSize: fontSize.xs, marginBottom: spacing.sm },
  noHoliday: { fontSize: fontSize.xs, marginBottom: spacing.sm },
  holidayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: 6,
  },
  dateInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    paddingBottom: 30,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pickerTitle: { fontSize: fontSize.md, fontWeight: '700' },
  pickerList: { paddingHorizontal: spacing.sm },
  pickerItem: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  pickerItemText: { fontSize: fontSize.lg, fontWeight: '600' },
});
