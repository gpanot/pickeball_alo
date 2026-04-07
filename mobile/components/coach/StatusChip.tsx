import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, fontSize, borderRadius, type ThemeTokens } from '@/mobile/lib/theme';

export type StatusChipProps = {
  status: string;
  theme: ThemeTokens;
};

function backgroundForStatus(status: string, theme: ThemeTokens): string {
  const s = status.toLowerCase().trim();
  if (s === 'confirmed') return theme.green;
  if (s === 'pending') return theme.orange;
  if (s === 'cancelled' || s === 'canceled') return theme.red;
  if (s === 'completed') return theme.blue;
  if (s === 'verifying' || s === 'payment_submitted') return theme.orange;
  return theme.textMuted;
}

export function StatusChip({ status, theme }: StatusChipProps) {
  const bg = useMemo(() => backgroundForStatus(status, theme), [status, theme]);

  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: theme.text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});
