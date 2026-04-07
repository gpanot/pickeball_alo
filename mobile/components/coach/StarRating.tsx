import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { spacing, fontSize, type ThemeTokens } from '@/mobile/lib/theme';

export interface StarRatingProps {
  value: number;
  onChange: (v: number) => void;
  size?: number;
  theme: ThemeTokens;
}

const STAR_COUNT = 5;

export function StarRating({ value, onChange, size, theme }: StarRatingProps) {
  const starSize = size ?? fontSize.xl;

  const pick = useCallback(
    (v: number) => () => {
      onChange(v);
    },
    [onChange],
  );

  return (
    <View style={styles.row}>
      {Array.from({ length: STAR_COUNT }, (_, i) => {
        const starIndex = i + 1;
        const filled = starIndex <= value;
        return (
          <Pressable
            key={starIndex}
            onPress={pick(starIndex)}
            hitSlop={6}
            style={({ pressed }) => [styles.starBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text
              style={[
                styles.star,
                {
                  fontSize: starSize,
                  lineHeight: starSize + 4,
                  color: filled ? theme.accent : theme.textMuted,
                },
              ]}
            >
              {filled ? '★' : '☆'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  starBtn: {
    padding: spacing.xs,
  },
  star: {
    textAlign: 'center',
  },
});
