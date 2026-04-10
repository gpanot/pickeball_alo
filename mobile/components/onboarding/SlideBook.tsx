import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HeroImageGradient from './HeroImageGradient';

interface Props {
  width: number;
  height: number;
  bottomPadding: number;
  onComplete: () => void;
}

const HERO_URI =
  'https://images.unsplash.com/photo-1737229471661-78a6a16f33bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaWNrbGViYWxsJTIwY29hY2glMjBhY3Rpb24lMjB0ZWFjaGluZyUyMGFzaWFufGVufDF8fHx8MTc3NTYwNjE5OHww&ixlib=rb-4.1.0&q=80&w=1080';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_SLOTS: string[][] = [
  ['Booked', 'Booked', 'Booked'],
  ['Booked', '6pm', 'Booked'],
  ['Booked', 'Booked', 'Booked'],
  ['Booked', 'Booked', 'Booked'],
  ['Booked', 'Booked', 'Booked'],
  ['Booked', 'Booked', '4pm'],
  ['Booked', 'Booked', 'Booked'],
];

export default function SlideBook({ width, height, bottomPadding, onComplete }: Props) {
  return (
    <View style={[styles.root, { width, height }]}>
      {/* Top: Hero Photo + Calendar */}
      <View style={styles.top}>
        <Image source={{ uri: HERO_URI }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <HeroImageGradient
          stops={[
            { offset: 0.15, opacity: 0 },
            { offset: 0.4, opacity: 0.4 },
            { offset: 0.85, opacity: 0.95 },
          ]}
        />

        {/* Coach chip */}
        <View style={styles.coachChip}>
          <Ionicons name="star" size={14} color="#b8f200" />
          <Text style={styles.coachChipText}>4.8 Coach Minh</Text>
        </View>

        {/* Calendar card */}
        <View style={styles.calendarWrap}>
          <View style={styles.calendarCard}>
            <Text style={styles.calendarLabel}>This week</Text>

            <View style={styles.calendarGrid}>
              {WEEK_DAYS.map((day, di) => (
                <View key={di} style={styles.dayCol}>
                  <Text style={styles.dayLabel}>{day}</Text>
                  {TIME_SLOTS[di].map((slot, si) => {
                    const available = slot !== 'Booked';
                    return (
                      <View
                        key={si}
                        style={[
                          styles.slot,
                          available ? styles.slotAvailable : styles.slotBooked,
                        ]}
                      >
                        <Text
                          style={[styles.slotText, available ? styles.slotTextAvail : styles.slotTextBooked]}
                          numberOfLines={1}
                        >
                          {slot}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Urgency pill */}
            <View style={styles.urgencyPill}>
              <Ionicons name="time-outline" size={13} color="#b8f200" />
              <Text style={styles.urgencyText}>2 slots left this week with Coach Minh</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom: Content */}
      <View style={[styles.bottom, { paddingBottom: bottomPadding }]}>
        <View style={styles.textBlock}>
          <Text style={styles.tagline}>BOOK NOW</Text>
          <Text style={styles.headline}>The best coaches fill up fast.</Text>
          <Text style={styles.subtext}>
            Stop waiting for a reply that might not come. See real availability, book instantly, get confirmed in seconds.
          </Text>
        </View>

        <View style={styles.ctaBlock}>
          <Pressable onPress={onComplete} style={({ pressed }) => [styles.ctaBtn, { opacity: pressed ? 0.88 : 1 }]}>
            <Text style={styles.ctaBtnText}>Get started</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#0a0a0a' },
  top: { flex: 55, position: 'relative', overflow: 'hidden' },

  coachChip: {
    position: 'absolute',
    top: 20,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10,10,10,0.75)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  coachChipText: { fontSize: 13, color: '#f0f0f0', fontWeight: '700' },

  calendarWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  calendarCard: {
    backgroundColor: '#161616',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 14,
  },
  calendarLabel: { fontSize: 12, color: '#888', marginBottom: 10 },

  calendarGrid: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  dayCol: { flex: 1, gap: 4, alignItems: 'center' },
  dayLabel: { fontSize: 9, color: '#666', fontWeight: '600', marginBottom: 2 },
  slot: { borderRadius: 4, paddingVertical: 5, width: '100%', alignItems: 'center' },
  slotAvailable: { backgroundColor: '#b8f200' },
  slotBooked: { backgroundColor: '#222' },
  slotText: { fontSize: 8, fontWeight: '700' },
  slotTextAvail: { color: '#000' },
  slotTextBooked: { color: '#555' },

  urgencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(184,242,0,0.1)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(184,242,0,0.2)',
  },
  urgencyText: { fontSize: 11, color: '#b8f200', fontWeight: '700' },

  bottom: { flex: 45, justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 24 },
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
