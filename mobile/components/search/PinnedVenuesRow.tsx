import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { PinIcon } from '@/components/Icons';
import type { ThemeTokens } from '@/lib/theme';
import type { VenueResult } from '@/mobile/lib/types';

interface PinnedVenuesRowProps {
  venues: VenueResult[];
  /** Currently selected venue id (highlighted card). */
  selectedId: string | null;
  t: ThemeTokens;
  onPickVenue: (v: VenueResult) => void;
  /** Tapping the empty placeholder or the "+ Add venue" card. */
  onOpenMap: () => void;
}

function shortDistrict(address: string): string | null {
  const m = address.match(/(?:Q(?:uận)?\.?\s*|District\s*)(\d+|[A-ZĐ][a-zàáảãạăắằẳẵặâấầẩẫậ]+)/i);
  return m ? `Q${m[1]}` : null;
}

const CARD_W = 170;

const PinnedCard = memo(function PinnedCard({
  venue,
  selected,
  t,
  onPress,
}: {
  venue: VenueResult;
  selected: boolean;
  t: ThemeTokens;
  onPress: () => void;
}) {
  const dist =
    venue.distance != null
      ? venue.distance < 1
        ? `${Math.round(venue.distance * 1000)}m`
        : `${venue.distance.toFixed(1)} km`
      : null;
  const district = shortDistrict(venue.address);
  const sub = [dist, district].filter(Boolean).join(' · ') || venue.address.slice(0, 30);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: selected ? t.accentBgStrong : t.bgCard,
          borderColor: selected ? t.accent : t.border,
          borderWidth: selected ? 2 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.cardIcon,
          {
            backgroundColor: selected ? t.accent : t.accentBg,
            borderColor: selected ? t.accent : t.border,
          },
        ]}
      >
        <PinIcon size={16} color={selected ? '#000' : t.accent} />
      </View>
      <Text style={[styles.cardName, { color: selected ? t.accent : t.text }]} numberOfLines={1}>
        {venue.name}
      </Text>
      <Text style={[styles.cardSub, { color: t.textSec }]} numberOfLines={1}>
        {sub}
      </Text>
    </Pressable>
  );
});

function PinnedVenuesRow({ venues, selectedId, t, onPickVenue, onOpenMap }: PinnedVenuesRowProps) {
  const handlePress = useCallback(
    (v: VenueResult) => () => onPickVenue(v),
    [onPickVenue],
  );

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: t.textMuted }]}>Pinned venues</Text>

      {venues.length === 0 ? (
        <Pressable
          onPress={onOpenMap}
          style={[styles.emptyCard, { borderColor: t.border }]}
        >
          <PinIcon size={18} color={t.textMuted} />
          <Text style={[styles.emptyText, { color: t.textMuted }]}>
            Pin your favorite venues for faster booking
          </Text>
        </Pressable>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {venues.map((v) => (
            <PinnedCard
              key={v.id}
              venue={v}
              selected={v.id === selectedId}
              t={t}
              onPress={handlePress(v)}
            />
          ))}
          <Pressable
            onPress={onOpenMap}
            style={[styles.addCard, { borderColor: t.border }]}
          >
            <Text style={[styles.addPlus, { color: t.textMuted }]}>+</Text>
            <Text style={[styles.addLabel, { color: t.textMuted }]}>Add venue</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

export default memo(PinnedVenuesRow);

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  scrollContent: { gap: 10, paddingRight: 4 },
  card: {
    width: CARD_W,
    borderRadius: 14,
    padding: 14,
    justifyContent: 'flex-end',
    minHeight: 100,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  cardSub: { fontSize: 11 },
  addCard: {
    width: CARD_W,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    gap: 4,
  },
  addPlus: { fontSize: 24, fontWeight: '300' },
  addLabel: { fontSize: 12, fontWeight: '600' },
  emptyCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 13, flex: 1 },
});
