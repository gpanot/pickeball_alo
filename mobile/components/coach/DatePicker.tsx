import React, { useMemo } from 'react';
import { Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { spacing, fontSize, borderRadius, type ThemeTokens } from '@/mobile/lib/theme';

export type DatePickerProps = {
  selectedDate: string | null;
  onSelect: (date: string) => void;
  minDate?: string;
  theme: ThemeTokens;
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map((n) => Number.parseInt(n, 10));
  return new Date(y, m - 1, d);
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function DatePicker({ selectedDate, onSelect, minDate, theme }: DatePickerProps) {
  const days = useMemo(() => {
    const today = startOfLocalDay(new Date());
    let start = today;
    if (minDate) {
      const min = startOfLocalDay(parseYmd(minDate));
      if (min.getTime() > today.getTime()) start = min;
    }
    return Array.from({ length: 14 }, (_, i) => addDays(start, i));
  }, [minDate]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {days.map((d) => {
        const ymd = toYmd(d);
        const selected = selectedDate === ymd;
        const dow = DAY_LABELS[d.getDay()];
        const num = d.getDate();

        return (
          <Pressable
            key={ymd}
            onPress={() => onSelect(ymd)}
            style={({ pressed }) => [
              styles.day,
              {
                borderColor: selected ? theme.accent : theme.border,
                backgroundColor: selected ? theme.accent : theme.bgCard,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.dow,
                { color: selected ? theme.bg : theme.textSec },
              ]}
            >
              {dow}
            </Text>
            <Text
              style={[
                styles.num,
                { color: selected ? theme.bg : theme.text },
                selected && styles.numSelected,
              ]}
            >
              {num}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  day: {
    minWidth: spacing['4xl'] + spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  dow: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  num: {
    fontSize: fontSize.lg,
    marginTop: spacing.xs,
  },
  numSelected: {
    fontWeight: '800',
  },
});
