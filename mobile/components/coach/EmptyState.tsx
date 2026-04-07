import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { spacing, fontSize, borderRadius, type ThemeTokens } from '@/mobile/lib/theme';

export type EmptyStateProps = {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  theme: ThemeTokens;
};

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  theme,
}: EmptyStateProps) {
  const showAction = Boolean(actionLabel && onAction);

  return (
    <View style={styles.wrap}>
      <View style={styles.inner}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.textSec }]}>{subtitle}</Text>
        ) : null}
        {showAction ? (
          <Pressable
            onPress={onAction}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: theme.accent,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <Text style={[styles.ctaText, { color: theme.bg }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  inner: {
    alignItems: 'center',
    maxWidth: 320,
  },
  icon: {
    fontSize: fontSize['3xl'] * 1.4,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.45,
  },
  cta: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['2xl'],
    borderRadius: borderRadius.lg,
  },
  ctaText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
