import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HeroImageGradient from './HeroImageGradient';

interface Props {
  width: number;
  height: number;
  bottomPadding: number;
  onNext: () => void;
}

const SLIDE_HERO = require('../../assets/images/onboarding-slide-find.png');

/** Match `styles.top` / `styles.bottom` flex weights so hero height = 100% of the top band. */
const TOP_FLEX = 55;
const BOTTOM_FLEX = 45;

const resolvedHero = Image.resolveAssetSource(SLIDE_HERO);
const HERO_ASPECT =
  resolvedHero && resolvedHero.width > 0 ? resolvedHero.width / resolvedHero.height : 16 / 9;

export default function SlideFind({ width, height, bottomPadding, onNext }: Props) {
  const heroPanelHeight = (height * TOP_FLEX) / (TOP_FLEX + BOTTOM_FLEX);
  const heroImageWidth = heroPanelHeight * HERO_ASPECT;
  const heroImageLeft = (width - heroImageWidth) / 2;

  return (
    <View style={[styles.root, { width, height }]}>
      {/* Top: Photo + Chat Overlay — image height = 100% of panel; width from aspect ratio, centered */}
      <View style={styles.top}>
        <Image
          source={SLIDE_HERO}
          style={[styles.heroImage, { left: heroImageLeft, width: heroImageWidth, height: heroPanelHeight }]}
          resizeMode="cover"
        />
        <HeroImageGradient
          stops={[
            { offset: 0.3, opacity: 0 },
            { offset: 0.6, opacity: 0.4 },
            { offset: 1, opacity: 0.9 },
          ]}
        />

        {/* Chat overlay card */}
        <View style={styles.chatWrap}>
          <View style={styles.chatCard}>
            <View style={styles.chatHeader}>
              <Ionicons name="people" size={14} color="#888" />
              <Text style={styles.chatHeaderText}>Pickleball Players</Text>
            </View>

            <View style={styles.chatMessages}>
              <View style={styles.msgRow}>
                <View style={styles.msgBubble}>
                  <Text style={styles.msgText}>Anyone know a good coach near here?</Text>
                </View>
              </View>

              <View style={styles.timestampRow}>
                <Ionicons name="time-outline" size={11} color="#555" />
                <Text style={styles.timestampText}>3 hours ago · No replies yet</Text>
              </View>

              <View style={styles.msgRow}>
                <View style={styles.msgBubble}>
                  <Text style={styles.msgText}>Really need a coach...</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom: Content */}
      <View style={[styles.bottom, { paddingBottom: bottomPadding }]}>
        <View style={styles.textBlock}>
          <Text style={styles.tagline}>COURTMAP</Text>
          <Text style={styles.headline}>{'Find your coach.\nNo group chats required.'}</Text>
          <Text style={styles.subtext}>
            Stop asking around. Every verified pickleball coach near you — with real ratings from real players.
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
  top: { flex: TOP_FLEX, position: 'relative', overflow: 'hidden' },
  heroImage: { position: 'absolute', top: 0 },
  chatWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  chatCard: {
    backgroundColor: 'rgba(22,22,22,0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  chatHeaderText: { fontSize: 13, color: '#f0f0f0' },
  chatMessages: { gap: 10 },
  msgRow: { alignItems: 'flex-end' },
  msgBubble: {
    backgroundColor: '#2D5016',
    borderRadius: 18,
    borderTopRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '85%',
  },
  msgText: { fontSize: 13, color: '#E5FFB8', lineHeight: 18 },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  timestampText: { fontSize: 11, color: '#555' },

  bottom: { flex: BOTTOM_FLEX, justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 24 },
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
