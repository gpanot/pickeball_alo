import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, fontSize, borderRadius, type ThemeTokens } from '@/mobile/lib/theme';

export interface CreditBadgeProps {
  remaining: number;
  total: number;
  theme: ThemeTokens;
}

export function CreditBadge({ remaining, total, theme }: CreditBadgeProps) {
  const safeTotal = Math.max(0, total);
  const safeRemaining = Math.min(Math.max(0, remaining), safeTotal || Number.POSITIVE_INFINITY);
  const ratio = useMemo(() => {
    if (safeTotal <= 0) return 0;
    return Math.min(1, Math.max(0, safeRemaining / safeTotal));
  }, [safeRemaining, safeTotal]);

  return (
    <View style={[styles.wrap, { backgroundColor: theme.accentBg }]}>
      <Text style={[styles.label, { color: theme.text }]}>
        {safeRemaining}/{safeTotal} credits
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  track: {
    width: 40,
    height: 4,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
});
