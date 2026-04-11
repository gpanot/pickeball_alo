import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { spacing, fontSize, borderRadius, type ThemeTokens } from '@/mobile/lib/theme';
import { formatVndFull } from '@/mobile/lib/formatters';

export interface CoachCardProps {
  name: string;
  photo?: string;
  specialties: string[];
  ratingOverall: number | null;
  reviewCount: number;
  hourlyRate: number;
  distanceKm?: number | null;
  onPress: () => void;
  theme: ThemeTokens;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export function CoachCard({
  name,
  photo,
  specialties,
  ratingOverall,
  reviewCount,
  hourlyRate,
  distanceKm,
  onPress,
  theme,
}: CoachCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showPhoto = Boolean(photo?.trim()) && !imageFailed;
  const initials = useMemo(() => initialsFromName(name), [name]);
  const chips = useMemo(() => specialties.slice(0, 2), [specialties]);

  const onImageError = useCallback(() => setImageFailed(true), []);

  const ratingLabel =
    ratingOverall != null ? ratingOverall.toFixed(1) : '—';
  const reviewsLabel = reviewCount > 0 ? ` (${reviewCount})` : '';

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
      <View style={styles.avatarWrap}>
        {showPhoto ? (
          <Image
            source={{ uri: photo!.trim() }}
            style={[styles.avatar, { backgroundColor: theme.bgSurface }]}
            onError={onImageError}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.accentBg }]}>
            <Text style={[styles.avatarInitials, { color: theme.accent }]}>{initials}</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.chipRow}>
          {chips.map((s) => (
            <View
              key={s}
              style={[styles.chip, { backgroundColor: theme.accentBg, borderColor: theme.border }]}
            >
              <Text style={[styles.chipText, { color: theme.textSec }]} numberOfLines={1}>
                {s}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: theme.textSec }]}>
            <Text style={{ color: theme.accent }}>★</Text> {ratingLabel}
            <Text style={{ color: theme.textMuted }}>{reviewsLabel}</Text>
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text style={[styles.rate, { color: theme.accent }]}>
            {formatVndFull(hourlyRate)}/hr
          </Text>
          {distanceKm != null && (
            <Text style={styles.distance}>
              {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 120,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  avatarWrap: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  chip: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    maxWidth: '48%',
  },
  chipText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  metaRow: {
    marginBottom: 2,
  },
  meta: {
    fontSize: fontSize.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rate: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  distance: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: '#999',
  },
});
