import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { spacing, fontSize, type ThemeTokens } from '@/mobile/lib/theme';

export interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
  theme: ThemeTokens;
}

export function SectionHeader({ title, action, onAction, theme }: SectionHeaderProps) {
  const showAction = Boolean(action && onAction);

  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
        {title}
      </Text>
      {showAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          <Text style={[styles.action, { color: theme.accent }]} numberOfLines={1}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  action: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
