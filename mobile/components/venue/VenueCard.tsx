import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { HeartIcon, StarIcon, PinIcon, CourtIcon } from '@/components/Icons';
import { formatPrice } from '@/lib/formatters';
import type { ThemeTokens } from '@/lib/theme';
import type { VenueResult } from '@/lib/types';

interface VenueCardProps {
  venue: VenueResult;
  compact?: boolean;
  isSaved: boolean;
  onToggleSaved: (id: string) => void;
  onPress: () => void;
  bookButtonLabel?: string;
  onBookPress?: () => void;
  bookPill?: boolean;
  onBookPillPress?: () => void;
  t: ThemeTokens;
}

function VenueCard({
  venue,
  compact,
  isSaved,
  onToggleSaved,
  onPress,
  bookButtonLabel,
  onBookPress,
  bookPill,
  onBookPillPress,
  t,
}: VenueCardProps) {
  const allSlots = venue.courts.flatMap((c) => c.slots);
  const allBooked = allSlots.length > 0 && allSlots.every((s) => s.isBooked);

  return (
    <Pressable
      onPress={onPress}
      unstable_pressDelay={0}
      style={[
        styles.card,
        { backgroundColor: t.bgCard, borderColor: t.border },
        compact ? {} : { marginBottom: 12 },
      ]}
    >
      <View style={[styles.hero, { height: compact ? 100 : 140 }]}>
        <Text style={{ fontSize: compact ? 32 : 44 }}>🏓</Text>
        <Pressable
          onPress={(e) => {
            e?.stopPropagation?.();
            onToggleSaved(venue.id);
          }}
          style={[styles.heartBtn, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
          hitSlop={8}
        >
          <HeartIcon fill={isSaved} color={isSaved ? t.red : '#fff'} />
        </Pressable>
        <View style={[styles.priceBadge, { backgroundColor: t.accent }]}>
          <Text style={styles.priceBadgeText}>{formatPrice(venue.priceMin)}/h</Text>
        </View>
        {allBooked && (
          <View style={[styles.bookedBadge, { backgroundColor: t.red }]}>
            <Text style={styles.bookedText}>Fully booked</Text>
          </View>
        )}
      </View>
      <View style={{ padding: compact ? 10 : 14, paddingHorizontal: compact ? 12 : 16 }}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={[styles.name, { color: t.text, fontSize: compact ? 14 : 16 }]}>
              {venue.name}
            </Text>
            <Text numberOfLines={1} style={[styles.addr, { color: t.textSec }]}>
              {venue.address}
            </Text>
          </View>
          <View>
            <View style={[styles.ratingBox, { backgroundColor: t.accentBg }]}>
              <StarIcon color={t.accent} />
              <Text style={[styles.rating, { color: t.text }]}>{venue.rating}</Text>
              <Text style={[styles.reviews, { color: t.textSec }]}>({venue.reviewCount})</Text>
            </View>
            {compact && venue.distance != null && (
              <View style={styles.compactDistance}>
                <PinIcon size={10} color={t.textSec} />
                <Text style={{ fontSize: 11, color: t.textSec }}>{venue.distance} km</Text>
              </View>
            )}
          </View>
        </View>
        {!compact && (
          <View style={styles.metaRow}>
            <View style={styles.metaLeft}>
              <View style={styles.metaItem}>
                <PinIcon size={12} color={t.textSec} />
                <Text style={[styles.metaText, { color: t.textSec }]}>{venue.distance ?? '—'} km</Text>
              </View>
              <View style={styles.metaItem}>
                <CourtIcon size={12} color={t.textSec} />
                <Text style={[styles.metaText, { color: t.textSec }]}>{venue.courts.length} courts</Text>
              </View>
            </View>
            {bookPill && onBookPillPress && (
              <Pressable
                onPress={(e) => {
                  e?.stopPropagation?.();
                  onBookPillPress();
                }}
                style={[styles.bookPill, { backgroundColor: t.accent }]}
              >
                <Text style={styles.bookPillText}>Book</Text>
              </Pressable>
            )}
          </View>
        )}
        {!compact && venue.tags.length > 0 && (
          <View style={styles.tags}>
            {venue.tags.slice(0, 4).map((tag) => (
              <View
                key={tag}
                style={[styles.tag, { backgroundColor: t.accentBg, borderColor: t.accentBgStrong }]}
              >
                <Text style={[styles.tagText, { color: t.accent }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
        {!compact && bookButtonLabel && onBookPress && (
          <Pressable
            onPress={(e) => {
              e?.stopPropagation?.();
              onBookPress();
            }}
            style={[styles.bookBtn, { backgroundColor: t.accent }]}
          >
            <Text style={styles.bookBtnText}>Book {bookButtonLabel}</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  priceBadgeText: { color: '#000', fontWeight: '700', fontSize: 13 },
  bookedBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  bookedText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  name: { fontWeight: '700' },
  addr: { fontSize: 12, marginTop: 3 },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  rating: { fontWeight: '700', fontSize: 13 },
  reviews: { fontSize: 11 },
  compactDistance: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4, justifyContent: 'flex-end' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    flexWrap: 'wrap',
    gap: 10,
  },
  metaLeft: { flexDirection: 'row', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
  bookPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  bookPillText: { color: '#000', fontWeight: '800', fontSize: 12, letterSpacing: 0.2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: { fontSize: 10, fontWeight: '600' },
  bookBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
});

export default memo(VenueCard);
