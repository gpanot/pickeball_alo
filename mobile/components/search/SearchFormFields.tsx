import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { PinIcon, CloseIcon, LocateIcon } from '@/components/Icons';
import { formatDateLabel, getNextDays, DURATIONS, START_HOUR_OPTIONS } from '@/lib/formatters';
import type { ThemeTokens } from '@/lib/theme';

function SectionLabel({ label, t }: { label: string; t: ThemeTokens }) {
  return (
    <Text style={[styles.sectionLabel, { color: t.textMuted }]}>{label}</Text>
  );
}

export interface SearchFormFieldsProps {
  searchQuery: string;
  selectedDate: number;
  selectedDuration: number;
  selectedTime: number;
  onSearchQueryChange: (q: string) => void;
  onDateChange: (i: number) => void;
  onDurationChange: (i: number) => void;
  onTimeChange: (i: number) => void;
  t: ThemeTokens;
  /** When the location field is rendered elsewhere (e.g. MapsExploreSearch on Book home). */
  hideLocationSearch?: boolean;
}

export default function SearchFormFields({
  searchQuery,
  selectedDate,
  selectedDuration,
  selectedTime,
  onSearchQueryChange,
  onDateChange,
  onDurationChange,
  onTimeChange,
  t,
  hideLocationSearch = false,
}: SearchFormFieldsProps) {
  const dates = getNextDays(7);
  const timeScrollRef = useRef<ScrollView>(null);
  const timeBtnPositions = useRef<Record<number, number>>({});

  useEffect(() => {
    const x = timeBtnPositions.current[selectedTime];
    if (x != null) {
      timeScrollRef.current?.scrollTo({ x: Math.max(0, x - 40), animated: true });
    }
  }, [selectedTime]);

  const chip = (active: boolean) => ({
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: active ? t.accent : t.bgCard,
    borderWidth: active ? 0 : 1,
    borderColor: t.border,
  });

  return (
    <View>
      {!hideLocationSearch && (
        <View
          style={[
            styles.searchBox,
            { backgroundColor: t.bgCard, borderColor: t.border },
          ]}
        >
          <PinIcon color={t.accent} />
          <TextInput
            style={[styles.input, { color: t.text }]}
            placeholder="Search area or venue name..."
            placeholderTextColor={t.textMuted}
            value={searchQuery}
            onChangeText={onSearchQueryChange}
          />
          {!!searchQuery && (
            <Pressable onPress={() => onSearchQueryChange('')} hitSlop={8}>
              <CloseIcon color={t.textMuted} />
            </Pressable>
          )}
        </View>
      )}

      <SectionLabel label="When" t={t} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowGap}>
        {dates.map((d, i) => {
          const { day, date } = formatDateLabel(d);
          const active = i === selectedDate;
          return (
            <Pressable
              key={i}
              onPress={() => onDateChange(i)}
              style={[chip(active), styles.dateChip]}
            >
              <Text style={[styles.daySub, { color: active ? '#000' : t.text, opacity: 0.7 }]}>{day}</Text>
              <Text style={[styles.dateMain, { color: active ? '#000' : t.text }]}>{date}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionLabel label="Duration" t={t} />
      <View style={[styles.rowWrap, styles.mb20]}>
        {DURATIONS.map((d, i) => {
          const active = i === selectedDuration;
          return (
            <Pressable key={d} onPress={() => onDurationChange(i)} style={chip(active)}>
              <Text style={{ color: active ? '#000' : t.text, fontWeight: '700', fontSize: 14 }}>{d}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel label="Start time" t={t} />
      <ScrollView
        ref={timeScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.rowGap, styles.mb20]}
      >
        {START_HOUR_OPTIONS.map((opt, i) => {
          const active = i === selectedTime;
          return (
            <Pressable
              key={`${opt.hour}-${i}`}
              onLayout={(e) => {
                timeBtnPositions.current[i] = e.nativeEvent.layout.x;
              }}
              onPress={() => onTimeChange(i)}
              style={chip(active)}
            >
              <Text style={{ color: active ? '#000' : t.text, fontWeight: '700', fontSize: 14 }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View
        style={[
          styles.nearRow,
          { backgroundColor: t.bgCard, borderColor: t.border },
        ]}
      >
        <View style={styles.nearLeft}>
          <LocateIcon color={t.accent} />
          <View>
            <Text style={[styles.nearTitle, { color: t.text }]}>Near me</Text>
            <Text style={[styles.nearSub, { color: t.textSec }]}>Within 10 km radius</Text>
          </View>
        </View>
        <View style={[styles.toggle, { backgroundColor: t.accent }]}>
          <View style={styles.toggleKnob} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  input: { flex: 1, fontSize: 15, padding: 0 },
  rowGap: { flexDirection: 'row', gap: 8, paddingBottom: 4, marginBottom: 20 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mb20: { marginBottom: 20 },
  dateChip: { minWidth: 70, paddingHorizontal: 14, alignItems: 'center' },
  daySub: { fontSize: 11 },
  dateMain: { fontSize: 14, fontWeight: '700' },
  nearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    marginBottom: 8,
  },
  nearLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nearTitle: { fontSize: 14, fontWeight: '600' },
  nearSub: { fontSize: 12 },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    paddingHorizontal: 3,
    alignItems: 'flex-end',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
});
