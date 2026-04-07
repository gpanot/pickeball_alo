import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, fontSize, borderRadius, type ThemeTokens } from '@/mobile/lib/theme';

export interface RatingBarProps {
  label: string;
  value: number;
  maxValue?: number;
  theme: ThemeTokens;
}

export function RatingBar({ label, value, maxValue = 5, theme }: RatingBarProps) {
  const max = Math.max(1e-6, maxValue);
  const ratio = useMemo(() => Math.min(1, Math.max(0, value / max)), [value, max]);

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.text }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={[styles.track, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${ratio * 100}%`,
              backgroundColor: theme.accent,
            },
          ]}
        />
      </View>
      <Text style={[styles.value, { color: theme.textSec }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  label: {
    flex: 0,
    minWidth: 88,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  value: {
    minWidth: 28,
    textAlign: 'right',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
