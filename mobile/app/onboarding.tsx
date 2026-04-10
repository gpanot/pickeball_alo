import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useCourtMap } from '@/context/CourtMapContext';
import OnboardingDots from '@/components/onboarding/OnboardingDots';
import SlideFind from '@/components/onboarding/SlideFind';
import SlideTrust from '@/components/onboarding/SlideTrust';
import SlideBook from '@/components/onboarding/SlideBook';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_SLIDES = 3;
const ROLE_SLIDE_INDEX = 3;

const SLIDE_INDICES = [0, 1, 2, 3] as const;

function paramIsRoleStart(raw: string | string[] | undefined): boolean {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === 'role';
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { start: startParam } = useLocalSearchParams<{ start?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { userName, userPhone } = useCourtMap();
  const listRef = useRef<FlatList<number>>(null);
  const startAtRole = paramIsRoleStart(startParam);
  const slideHeight = windowHeight - insets.top;
  const [currentIndex, setCurrentIndex] = useState(() =>
    paramIsRoleStart(startParam) ? ROLE_SLIDE_INDEX : 0,
  );

  useEffect(() => {
    if (userName?.trim() && userPhone?.trim()) {
      router.replace('/(tabs)/(book)');
    }
  }, [router, userName, userPhone]);

  const goToSlide = useCallback((index: number) => {
    listRef.current?.scrollToOffset({ offset: index * SCREEN_WIDTH, animated: true });
    setCurrentIndex(index);
  }, []);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setCurrentIndex(idx);
    },
    [],
  );

  const goNext = useCallback(
    () => goToSlide(Math.min(currentIndex + 1, ROLE_SLIDE_INDEX)),
    [currentIndex, goToSlide],
  );
  const goRoleSelect = useCallback(() => goToSlide(ROLE_SLIDE_INDEX), [goToSlide]);

  const bottomPadding = insets.bottom + 48;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <FlatList
        ref={listRef}
        data={[...SLIDE_INDICES]}
        keyExtractor={(item) => String(item)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        style={styles.scrollView}
        removeClippedSubviews={false}
        initialScrollIndex={startAtRole ? ROLE_SLIDE_INDEX : 0}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        initialNumToRender={4}
        renderItem={({ item }) => {
          switch (item) {
            case 0:
              return (
                <SlideFind
                  width={SCREEN_WIDTH}
                  height={slideHeight}
                  bottomPadding={bottomPadding}
                  onNext={goNext}
                />
              );
            case 1:
              return (
                <SlideTrust
                  width={SCREEN_WIDTH}
                  height={slideHeight}
                  bottomPadding={bottomPadding}
                  onNext={goNext}
                />
              );
            case 2:
              return (
                <SlideBook
                  width={SCREEN_WIDTH}
                  height={slideHeight}
                  bottomPadding={bottomPadding}
                  onComplete={goRoleSelect}
                />
              );
            default:
              return (
                <RoleSelectionSlide
                  width={SCREEN_WIDTH}
                  height={slideHeight}
                  topInset={0}
                  bottomInset={insets.bottom}
                  onPlayer={() => router.push('/player-auth')}
                  onCoach={() => router.push('/(coach-tabs)/login')}
                />
              );
          }
        }}
      />

      {/* Dots overlay – only for slides 0–2 */}
      {currentIndex < TOTAL_SLIDES && (
        <View style={[styles.dotsWrap, { bottom: insets.bottom + 16 }]}>
          <OnboardingDots currentSlide={currentIndex} totalSlides={TOTAL_SLIDES} />
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Role-selection slide (4th screen — no Continue button)            */
/* ------------------------------------------------------------------ */

interface RoleProps {
  width: number;
  height: number;
  topInset: number;
  bottomInset: number;
  onPlayer: () => void;
  onCoach: () => void;
}

function RoleSelectionSlide({ width, height, bottomInset, onPlayer, onCoach }: RoleProps) {
  return (
    <View style={[roleStyles.root, { width, height }]}>
      {/* Header */}
      <View style={roleStyles.header}>
        <Text style={roleStyles.tagline}>GET STARTED</Text>
        <Text style={roleStyles.headline}>Are you a player{'\n'}or a coach?</Text>
        <Text style={roleStyles.subtext}>
          This helps us personalize your experience. You can always change this later.
        </Text>
      </View>

      {/* Role cards */}
      <View style={roleStyles.cards}>
        {/* Player */}
        <Pressable
          onPress={onPlayer}
          style={({ pressed }) => [
            roleStyles.card,
            { borderColor: pressed ? '#b8f200' : '#2a2a2a', opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <View style={[roleStyles.iconCircle, { backgroundColor: 'rgba(184,242,0,0.1)' }]}>
            <Ionicons name="people" size={28} color="#b8f200" />
          </View>
          <View style={roleStyles.cardText}>
            <Text style={roleStyles.cardTitle}>Player</Text>
            <Text style={roleStyles.cardDesc}>
              Find verified coaches, book sessions, track your progress
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#555" />
        </Pressable>

        {/* Coach */}
        <Pressable
          onPress={onCoach}
          style={({ pressed }) => [
            roleStyles.card,
            { borderColor: pressed ? '#3498db' : '#2a2a2a', opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <View style={[roleStyles.iconCircle, { backgroundColor: 'rgba(52,152,219,0.1)' }]}>
            <Ionicons name="fitness" size={28} color="#3498db" />
          </View>
          <View style={roleStyles.cardText}>
            <Text style={roleStyles.cardTitle}>Coach</Text>
            <Text style={roleStyles.cardDesc}>
              Get discovered by players, manage bookings, grow your reputation
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#555" />
        </Pressable>
      </View>

      {/* Footer */}
      <View style={[roleStyles.footer, { paddingBottom: bottomInset + 24 }]}>
        <Text style={roleStyles.footerText}>1,976 venues across Vietnam</Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  scrollView: { flex: 1 },
  dotsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});

const roleStyles = StyleSheet.create({
  root: {
    backgroundColor: '#0a0a0a',
    justifyContent: 'space-between',
  },
  header: { paddingHorizontal: 24, paddingTop: 48, gap: 12 },
  tagline: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b8f200',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headline: { fontSize: 28, fontWeight: '800', color: '#f0f0f0', lineHeight: 36 },
  subtext: { fontSize: 13, color: '#888', lineHeight: 20 },

  cards: { paddingHorizontal: 24, gap: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    gap: 14,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#f0f0f0', marginBottom: 3 },
  cardDesc: { fontSize: 13, color: '#888', lineHeight: 18 },

  footer: { alignItems: 'center' },
  footerText: { fontSize: 11, color: '#555' },
});
