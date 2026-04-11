import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { spacing, fontSize, borderRadius, type ThemeTokens } from '@/mobile/lib/theme';
import { formatDateFriendly } from '@/lib/formatters';

export interface SessionCardProps {
  coachName: string;
  venueName: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionType: '1on1' | 'group';
  status: string;
  onPress: () => void;
  theme: ThemeTokens;
}

function formatStatus(status: string): string {
  if (!status) return '';
  return status
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function SessionCard({
  coachName,
  venueName,
  date,
  startTime,
  endTime,
  sessionType,
  status,
  onPress,
  theme,
}: SessionCardProps) {
  const typeLabel = sessionType === '1on1' ? '1:1' : 'Group';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.bgCard,
          borderColor: theme.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.leftCol}>
          <Text style={[styles.dateLine, { color: theme.text }]} numberOfLines={1}>
            {formatDateFriendly(date)}
          </Text>
          <Text style={[styles.timeLine, { color: theme.textSec }]} numberOfLines={1}>
            {startTime} – {endTime}
          </Text>
          <View style={[styles.typePill, { backgroundColor: theme.accentBg, borderColor: theme.border }]}>
            <Text style={[styles.typePillText, { color: theme.textSec }]}>{typeLabel}</Text>
          </View>
        </View>
        <View style={[styles.statusChip, { backgroundColor: theme.accentBgStrong }]}>
          <Text style={[styles.statusText, { color: theme.accent }]} numberOfLines={2}>
            {formatStatus(status)}
          </Text>
        </View>
      </View>
      <Text style={[styles.coach, { color: theme.text }]} numberOfLines={1}>
        {coachName}
      </Text>
      <Text style={[styles.venue, { color: theme.textSec }]} numberOfLines={1}>
        {venueName}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  leftCol: {
    flex: 1,
    minWidth: 0,
  },
  typePill: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  typePillText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  statusChip: {
    maxWidth: '42%',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textAlign: 'right',
  },
  dateLine: {
    fontSize: fontSize.md,
    fontWeight: '700',
    marginBottom: 2,
  },
  timeLine: {
    fontSize: fontSize.sm,
  },
  coach: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  venue: {
    fontSize: fontSize.sm,
  },
});
