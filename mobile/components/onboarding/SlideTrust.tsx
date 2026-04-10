import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  width: number;
  height: number;
  bottomPadding: number;
  onNext: () => void;
}

const COACH_PHOTO =
  'https://images.unsplash.com/photo-1660463528633-aaa173d83fe4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaWNrbGViYWxsJTIwY29hY2glMjBhc2lhbiUyMHBvcnRyYWl0JTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc3NTYwNjE5OHww&ixlib=rb-4.1.0&q=80&w=1080';

const RATINGS = [
  { label: 'On time', value: 4.6 },
  { label: 'Friendly', value: 4.8 },
  { label: 'Professional', value: 4.4 },
  { label: 'Recommend', value: 5.0 },
];

export default function SlideTrust({ width, height, bottomPadding, onNext }: Props) {
  return (
    <View style={[styles.root, { width, height }]}>
      {/* Top: Coach Profile Card */}
      <View style={styles.top}>
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            {/* Coach header */}
            <View style={styles.coachHeader}>
              <View style={styles.avatar}>
                <Image source={{ uri: COACH_PHOTO }} style={styles.avatarImg} resizeMode="cover" />
              </View>
              <View style={styles.coachInfo}>
                <Text style={styles.coachName}>Coach Nguyen Van A</Text>
                <Text style={styles.coachMeta}>IPTPA Level 2 · 47 sessions completed</Text>
              </View>
            </View>

            {/* Rating bars */}
            <View style={styles.ratingsBlock}>
              {RATINGS.map((r, i) => (
                <View key={i} style={styles.ratingRow}>
                  <View style={styles.ratingLabelRow}>
                    <Text style={styles.ratingLabel}>{r.label}</Text>
                    <Text style={styles.ratingValue}>{r.value.toFixed(1)}</Text>
                  </View>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${(r.value / 5) * 100}%` }]} />
                  </View>
                </View>
              ))}
            </View>

            {/* Verified badge */}
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#b8f200" />
              <Text style={styles.verifiedText}>Verified · 3+ sessions confirmed</Text>
            </View>
          </View>

          {/* Trust indicators */}
          <View style={styles.trustNotes}>
            <View style={styles.trustRow}>
              <Ionicons name="lock-closed" size={13} color="#b8f200" />
              <Text style={styles.trustText}>Reviews unlock only after 3 real completed sessions.</Text>
            </View>
            <Text style={[styles.trustText, { marginLeft: 19 }]}>No fake stars possible.</Text>
          </View>
        </View>
      </View>

      {/* Bottom: Content */}
      <View style={[styles.bottom, { paddingBottom: bottomPadding }]}>
        <View style={styles.textBlock}>
          <Text style={styles.tagline}>TRUST</Text>
          <Text style={styles.headline}>Ratings you can actually trust.</Text>
          <Text style={styles.subtext}>
            Every review comes from a player who completed at least 3 sessions. No fake stars. No bought reviews. Just honest feedback.
          </Text>
        </View>

        <View style={styles.ctaBlock}>
          <Pressable onPress={onNext} style={({ pressed }) => [styles.ctaBtn, { opacity: pressed ? 0.88 : 1 }]}>
            <Text style={styles.ctaBtnText}>Next</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#0a0a0a' },
  top: { flex: 55, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 24 },
  cardContainer: { gap: 14 },
  card: {
    backgroundColor: '#161616',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 16,
  },
  coachHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  avatar: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', backgroundColor: '#222' },
  avatarImg: { width: '100%', height: '100%' },
  coachInfo: { flex: 1 },
  coachName: { fontSize: 15, fontWeight: '700', color: '#f0f0f0' },
  coachMeta: { fontSize: 11, color: '#888', marginTop: 3 },

  ratingsBlock: { gap: 10, marginBottom: 14 },
  ratingRow: { gap: 5 },
  ratingLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  ratingValue: { fontSize: 13, fontWeight: '800', color: '#b8f200' },
  barBg: { height: 5, backgroundColor: '#222', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#b8f200', borderRadius: 3 },

  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(184,242,0,0.1)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(184,242,0,0.2)',
  },
  verifiedText: { fontSize: 11, color: '#b8f200', fontWeight: '700' },

  trustNotes: { gap: 4, paddingHorizontal: 8 },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustText: { fontSize: 11, color: '#555' },

  bottom: { flex: 45, justifyContent: 'space-between', paddingHorizontal: 24 },
  textBlock: { gap: 12 },
  tagline: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b8f200',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headline: { fontSize: 22, fontWeight: '800', color: '#f0f0f0', lineHeight: 28 },
  subtext: { fontSize: 13, color: '#888', lineHeight: 20 },

  ctaBlock: { paddingTop: 12 },
  ctaBtn: {
    height: 52,
    backgroundColor: '#b8f200',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
});
