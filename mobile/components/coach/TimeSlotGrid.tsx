import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { spacing, fontSize, borderRadius, type ThemeTokens } from '@/mobile/lib/theme';
import { formatVndFull } from '@/mobile/lib/formatters';

export type TimeSlot = {
  time: string;
  available: boolean;
  price?: number;
};

export type TimeSlotGridProps = {
  slots: TimeSlot[];
  selectedTime: string | null;
  onSelect: (time: string) => void;
  theme: ThemeTokens;
};

export function TimeSlotGrid({ slots, selectedTime, onSelect, theme }: TimeSlotGridProps) {
  return (
    <View style={[styles.grid, { gap: spacing.sm, marginHorizontal: -spacing.xs }]}>
      {slots.map((slot) => {
        const selected = selectedTime === slot.time && slot.available;
        const disabled = !slot.available;

        return (
          <View key={slot.time} style={styles.cell}>
            <Pressable
              disabled={disabled}
              onPress={() => onSelect(slot.time)}
              style={({ pressed }) => [
                styles.slot,
                {
                  borderColor: selected ? theme.accent : theme.border,
                  backgroundColor: selected ? theme.accent : theme.bgCard,
                  opacity: disabled ? 0.38 : pressed && slot.available ? 0.92 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.timeLabel,
                  { color: selected ? theme.bg : disabled ? theme.textMuted : theme.text },
                ]}
              >
                {slot.time}
              </Text>
              {slot.price != null && slot.available ? (
                <Text
                  style={[
                    styles.priceLabel,
                    { color: selected ? theme.bg : theme.textSec },
                  ]}
                  numberOfLines={1}
                >
                  {formatVndFull(slot.price)}
                </Text>
              ) : null}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '33.333%',
    paddingHorizontal: spacing.xs,
  },
  slot: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    minHeight: spacing['3xl'] + spacing.lg,
    justifyContent: 'center',
  },
  timeLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  priceLabel: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
});
