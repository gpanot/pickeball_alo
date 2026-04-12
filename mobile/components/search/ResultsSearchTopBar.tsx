import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { BackIcon, ListIcon, MapIcon } from '@/components/Icons';
import ScreenTopBar from '@/components/ui/ScreenTopBar';
import SearchCriteriaSheet from '@/components/search/SearchCriteriaSheet';
import { DURATIONS, getNextDays, formatDateLabel, getStartHourLabel } from '@/lib/formatters';
import type { ThemeTokens } from '@/lib/theme';
import type { SortMode } from '@/lib/types';

function miniChip(t: ThemeTokens, active: boolean) {
  return {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: active ? t.accentBgStrong : t.bgCard,
    borderWidth: 1,
    borderColor: active ? t.accent : t.border,
  } as const;
}

export interface ResultsSearchTopBarProps {
  venuesCount: number;
  sortBy: SortMode;
  selectedDate: number;
  selectedDuration: number;
  selectedTime: number;
  searchQuery: string;
  onBack: () => void;
  onSort: (s: SortMode) => void;
  onSearchQueryChange: (q: string) => void;
  onDateChange: (i: number) => void;
  onDurationChange: (i: number) => void;
  onTimeChange: (i: number) => void;
  onRefetchSearch: () => Promise<void>;
  t: ThemeTokens;
  variant?: 'list' | 'map';
  onToggleView?: () => void;
}

export default function ResultsSearchTopBar({
  venuesCount,
  sortBy,
  selectedDate,
  selectedDuration,
  selectedTime,
  searchQuery,
  onBack,
  onSort,
  onSearchQueryChange,
  onDateChange,
  onDurationChange,
  onTimeChange,
  onRefetchSearch,
  t,
  variant = 'list',
  onToggleView,
}: ResultsSearchTopBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  const dates = getNextDays(7);
  const dateLabel = selectedDate < dates.length ? formatDateLabel(dates[selectedDate]).date : '';

  const handleApply = useCallback(async () => {
    setApplying(true);
    try {
      await onRefetchSearch();
      setSheetOpen(false);
    } finally {
      setApplying(false);
    }
  }, [onRefetchSearch]);

  return (
    <>
      <ScreenTopBar t={t} zIndex={variant === 'map' ? 10 : undefined}>
        <View style={styles.topRow}>
          <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
            <BackIcon color={t.text} />
          </Pressable>
          <Pressable onPress={() => setSheetOpen(true)} style={styles.centerBtn}>
            <Text style={[styles.summary, { color: t.text }]}>
              {dateLabel} · {DURATIONS[selectedDuration]} · {getStartHourLabel(selectedTime)}
            </Text>
            <Text style={[styles.count, { color: t.textSec }]}>{venuesCount} courts found</Text>
          </Pressable>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
          {(
            [
              ['distance', 'Nearest'],
              ['price', 'Cheapest'],
              ['rating', 'Top rated'],
            ] as const
          ).map(([key, label]) => (
            <Pressable key={key} onPress={() => onSort(key)} style={miniChip(t, sortBy === key)}>
              <Text
                style={{
                  color: sortBy === key ? t.accent : t.textSec,
                  fontWeight: '600',
                  fontSize: 12,
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {onToggleView && (
          <View style={styles.viewToggleRow}>
            <Pressable
              onPress={variant === 'list' ? undefined : onToggleView}
              style={[
                styles.viewToggleBtn,
                {
                  backgroundColor: variant === 'list' ? 'transparent' : t.bgCard,
                  borderColor: variant === 'list' ? t.accent : t.border,
                },
              ]}
            >
              <ListIcon size={16} color={variant === 'list' ? t.accent : t.textSec} />
              <Text style={{ color: variant === 'list' ? t.accent : t.textSec, fontWeight: '700', fontSize: 14 }}>
                List
              </Text>
            </Pressable>
            <Pressable
              onPress={variant === 'map' ? undefined : onToggleView}
              style={[
                styles.viewToggleBtn,
                {
                  backgroundColor: variant === 'map' ? 'transparent' : t.bgCard,
                  borderColor: variant === 'map' ? t.accent : t.border,
                },
              ]}
            >
              <MapIcon size={16} color={variant === 'map' ? t.accent : t.textSec} />
              <Text style={{ color: variant === 'map' ? t.accent : t.textSec, fontWeight: '700', fontSize: 14 }}>
                Map
              </Text>
            </Pressable>
          </View>
        )}
      </ScreenTopBar>

      <SearchCriteriaSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onApply={handleApply}
        applying={applying}
        t={t}
        searchQuery={searchQuery}
        selectedDate={selectedDate}
        selectedDuration={selectedDuration}
        selectedTime={selectedTime}
        onSearchQueryChange={onSearchQueryChange}
        onDateChange={onDateChange}
        onDurationChange={onDurationChange}
        onTimeChange={onTimeChange}
      />
    </>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  backBtn: { width: 40, padding: 4 },
  centerBtn: { flex: 1, alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8 },
  summary: { fontSize: 15, fontWeight: '700' },
  count: { fontSize: 12, marginTop: 2 },
  sortRow: { flexDirection: 'row', gap: 8, paddingBottom: 2 },
  viewToggleRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  viewToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
});
