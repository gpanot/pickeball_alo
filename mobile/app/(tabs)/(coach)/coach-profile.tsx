import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCourtMap } from '@/context/CourtMapContext';
import { useCoachDiscovery } from '@/context/CoachDiscoveryContext';
import { useCredits } from '@/context/CreditContext';
import { getCoachReviews } from '@/mobile/lib/coach-api';
import { formatVndFull, formatPrice } from '@/lib/formatters';
import { RatingBar, SectionHeader } from '@/components/coach';
import { spacing, fontSize, borderRadius } from '@/mobile/lib/theme';
import type { CoachReviewResult } from '@/mobile/lib/coach-types';
import type { Href } from 'expo-router';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function SkeletonBlock({ width, height, style, theme }: {
  width: number | string;
  height: number;
  style?: object;
  theme: { bgCard: string; border: string };
}) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius: height / 2, backgroundColor: theme.border, opacity },
        style,
      ]}
    />
  );
}

function CoachProfileSkeleton({ theme }: { theme: any }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.backBtn}>
        <SkeletonBlock width={60} height={18} theme={theme} />
      </View>
      <View style={styles.heroSection}>
        <SkeletonBlock width={96} height={96} style={{ borderRadius: 48, marginBottom: spacing.md }} theme={theme} />
        <SkeletonBlock width={160} height={22} style={{ marginBottom: spacing.sm }} theme={theme} />
        <SkeletonBlock width={120} height={14} style={{ marginBottom: spacing.sm }} theme={theme} />
        <SkeletonBlock width={100} height={14} style={{ marginBottom: spacing.xs }} theme={theme} />
        <SkeletonBlock width={180} height={14} theme={theme} />
      </View>
      <View style={[styles.section, { borderTopColor: theme.border }]}>
        <SkeletonBlock width={80} height={16} style={{ marginBottom: spacing.md }} theme={theme} />
        <SkeletonBlock width={'100%'} height={12} style={{ marginBottom: spacing.sm }} theme={theme} />
        <SkeletonBlock width={'85%'} height={12} style={{ marginBottom: spacing.sm }} theme={theme} />
        <SkeletonBlock width={'60%'} height={12} theme={theme} />
      </View>
      <View style={[styles.section, { borderTopColor: theme.border }]}>
        <SkeletonBlock width={100} height={16} style={{ marginBottom: spacing.md }} theme={theme} />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <SkeletonBlock width={80} height={32} theme={theme} />
          <SkeletonBlock width={90} height={32} theme={theme} />
          <SkeletonBlock width={70} height={32} theme={theme} />
        </View>
      </View>
      <View style={[styles.section, { borderTopColor: theme.border }]}>
        <SkeletonBlock width={70} height={16} style={{ marginBottom: spacing.md }} theme={theme} />
        <SkeletonBlock width={'100%'} height={60} style={{ borderRadius: borderRadius.md }} theme={theme} />
      </View>
    </ScrollView>
  );
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

function nextAvailabilityLabel(
  availability: Array<{ dayOfWeek: number | null; date: string | null; startTime: string; isBlocked: boolean }>,
): string | null {
  const now = new Date();
  const nowYmd = now.toISOString().slice(0, 10);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let bestDate: Date | null = null;
  let bestTime = '';

  for (const slot of availability) {
    if (slot.isBlocked) continue;
    const [hStr, mStr] = slot.startTime.split(':');
    const slotMinutes = (parseInt(hStr ?? '0', 10) * 60) + parseInt(mStr ?? '0', 10);

    if (slot.date) {
      if (slot.date < nowYmd || (slot.date === nowYmd && slotMinutes <= nowMinutes)) continue;
      const d = new Date(`${slot.date}T00:00:00`);
      if (!bestDate || d.getTime() < bestDate.getTime() || (d.getTime() === bestDate.getTime() && slot.startTime < bestTime)) {
        bestDate = d;
        bestTime = slot.startTime;
      }
      continue;
    }

    if (slot.dayOfWeek == null) continue;
    for (let offset = 0; offset < 7; offset += 1) {
      const d = new Date(now);
      d.setDate(now.getDate() + offset);
      if (d.getDay() !== slot.dayOfWeek) continue;
      if (offset === 0 && slotMinutes <= nowMinutes) continue;
      d.setHours(0, 0, 0, 0);
      if (!bestDate || d.getTime() < bestDate.getTime() || (d.getTime() === bestDate.getTime() && slot.startTime < bestTime)) {
        bestDate = d;
        bestTime = slot.startTime;
      }
      break;
    }
  }

  if (!bestDate) return null;
  const dateLabel = bestDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return `${dateLabel} at ${bestTime}`;
}

const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export default function CoachProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { t, mapUserLoc } = useCourtMap();
  const { selectedCoach, loading, selectCoach, loadAvailability, selectedCoachAvailability } =
    useCoachDiscovery();
  const { getAvailableCredits } = useCredits();

  const [reviews, setReviews] = useState<CoachReviewResult[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (coachId) {
      setReviews([]);
      setReviewTotal(0);
      setImgFailed(false);
      selectCoach(coachId);
      loadAvailability(coachId);
      getCoachReviews(coachId, 5, 0)
        .then((r) => {
          setReviews(r.reviews);
          setReviewTotal(r.total);
        })
        .catch(() => {});
    }
  }, [coachId, selectCoach, loadAvailability]);

  const coach = selectedCoach;
  const credit = useMemo(
    () => (coach ? getAvailableCredits(coach.id) : undefined),
    [coach, getAvailableCredits],
  );

  const onBook = useCallback(() => {
    if (!coach) return;
    router.push({
      pathname: '/(tabs)/(coach)/session-booking',
      params: { coachId: coach.id },
    } as unknown as Href);
  }, [router, coach]);

  const onBuyCredits = useCallback(() => {
    if (!coach) return;
    router.push({
      pathname: '/(tabs)/(coach)/buy-credit-pack',
      params: { coachId: coach.id },
    } as unknown as Href);
  }, [router, coach]);

  const availabilityByDay = useMemo(() => {
    const rows = new Map<number, string[]>();
    for (const slot of selectedCoachAvailability) {
      if (slot.isBlocked || slot.dayOfWeek == null) continue;
      const slots = rows.get(slot.dayOfWeek) ?? [];
      slots.push(`${slot.startTime} - ${slot.endTime}`);
      rows.set(slot.dayOfWeek, slots);
    }

    return WEEKDAY_ORDER
      .filter((day) => rows.has(day))
      .map((day) => ({
        day,
        label: WEEKDAY_LABELS[day],
        slots: (rows.get(day) ?? []).sort(),
      }));
  }, [selectedCoachAvailability]);

  if (loading && !coach) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top']}>
        <CoachProfileSkeleton theme={t} />
      </SafeAreaView>
    );
  }

  if (!coach) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top']}>
        <Pressable onPress={router.back} style={styles.backBtn}>
          <Text style={[styles.backText, { color: t.accent }]}>← Back</Text>
        </Pressable>
        <View style={styles.loadingWrap}>
          <Text style={{ color: t.textSec }}>Coach not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (__DEV__) {
    console.log('[coach-profile] courts:', JSON.stringify(coach.courts?.map(c => ({
      venueName: c.venueName,
      venueLat: c.venueLat,
      venueLng: c.venueLng,
      venuePriceMin: c.venuePriceMin,
      venueCourtCount: c.venueCourtCount,
    }))));
    console.log('[coach-profile] mapUserLoc:', mapUserLoc);
  }

  const showPhoto = Boolean(coach.photo?.trim()) && !imgFailed;
  const initials = initialsFromName(coach.name);
  const isNewCoach = coach.reviewCount < 5;
  const nextAvailable = nextAvailabilityLabel(selectedCoachAvailability);
  const hasRatingData = (
    coach.ratingOverall != null ||
    coach.ratingOnTime != null ||
    coach.ratingFriendly != null ||
    coach.ratingProfessional != null ||
    coach.ratingRecommend != null ||
    reviewTotal > 0
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Back button */}
        <Pressable onPress={router.back} style={styles.backBtn}>
          <Text style={[styles.backText, { color: t.accent }]}>← Back</Text>
        </Pressable>

        {/* Hero section */}
        <View style={styles.heroSection}>
          {showPhoto ? (
            <Image
              source={{ uri: coach.photo!.trim() }}
              style={[styles.heroAvatar, { backgroundColor: t.bgSurface }]}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <View style={[styles.heroAvatar, styles.heroAvatarFallback, { backgroundColor: t.accentBg }]}>
              <Text style={[styles.heroInitials, { color: t.accent }]}>{initials}</Text>
            </View>
          )}
          <Text style={[styles.heroName, { color: t.text }]}>{coach.name}</Text>
          {isNewCoach && (
            <View style={[styles.newCoachBadge, { backgroundColor: t.accentBg, borderColor: t.accent }]}>
              <Text style={[styles.newCoachBadgeText, { color: t.accent }]}>New Coach</Text>
            </View>
          )}
          {coach.certifications.length > 0 && (
            <Text style={[styles.heroCert, { color: t.textSec }]}>
              {coach.certifications[0]}
            </Text>
          )}
          {coach.ratingOverall != null && (
            <View style={styles.heroRatingRow}>
              <Text style={[styles.heroStar, { color: t.accent }]}>★</Text>
              <Text style={[styles.heroRating, { color: t.text }]}>
                {coach.ratingOverall.toFixed(1)}
              </Text>
              <Text style={[styles.heroReviewCount, { color: t.textMuted }]}>
                ({coach.reviewCount} review{coach.reviewCount !== 1 ? 's' : ''})
              </Text>
            </View>
          )}
          {coach.experienceBand && (
            <Text style={[styles.heroMeta, { color: t.textSec }]}>
              Experience: {coach.experienceBand} years
            </Text>
          )}
        </View>

        {/* 4-dimension rating bars */}
        <View style={[styles.section, { borderTopColor: t.border }]}>
          <SectionHeader title="Ratings" theme={t} />
          {hasRatingData ? (
            <View style={styles.ratingBars}>
              <RatingBar label="On time" value={coach.ratingOnTime ?? 0} theme={t} />
              <RatingBar label="Friendly" value={coach.ratingFriendly ?? 0} theme={t} />
              <RatingBar label="Professional" value={coach.ratingProfessional ?? 0} theme={t} />
              <RatingBar label="Recommend" value={coach.ratingRecommend ?? 0} theme={t} />
            </View>
          ) : (
            <Text style={[styles.emptyStateText, { color: t.textMuted }]}>No ratings yet</Text>
          )}
        </View>

        {/* Bio */}
        {coach.bio && (
          <View style={[styles.section, { borderTopColor: t.border }]}>
            <Text style={[styles.bioText, { color: t.textSec }]}>{coach.bio}</Text>
          </View>
        )}

        {/* Specialties */}
        {coach.specialties.length > 0 && (
          <View style={[styles.section, { borderTopColor: t.border }]}>
            <Text style={[styles.metaListText, { color: t.textSec }]}>
              <Text style={[styles.metaListLabel, { color: t.text }]}>Specialties:</Text>{' '}
              {coach.specialties.join(', ')}
            </Text>
          </View>
        )}

        {coach.focusLevels.length > 0 && (
          <View style={[styles.section, { borderTopColor: t.border }]}>
            <Text style={[styles.metaListText, { color: t.textSec }]}>
              <Text style={[styles.metaListLabel, { color: t.text }]}>Focus levels:</Text>{' '}
              {coach.focusLevels.join(', ')}
            </Text>
          </View>
        )}

        {coach.languages.length > 0 && (
          <View style={[styles.section, { borderTopColor: t.border }]}>
            <Text style={[styles.metaListText, { color: t.textSec }]}>
              <Text style={[styles.metaListLabel, { color: t.text }]}>Languages:</Text>{' '}
              {coach.languages.join(', ')}
            </Text>
          </View>
        )}

        {/* Courts */}
        {(coach.courts?.length ?? 0) > 0 && (
          <View style={[styles.section, { borderTopColor: t.border }]}>
            <SectionHeader title="Courts" theme={t} />
            {coach.courts!.map((cl) => {
              const dist = mapUserLoc && cl.venueLat && cl.venueLng
                ? haversineKm(mapUserLoc.lat, mapUserLoc.lng, cl.venueLat, cl.venueLng)
                : null;
              const pricePart = cl.venuePriceMin ? formatPrice(cl.venuePriceMin) : null;
              const distPart = dist != null ? `${dist.toFixed(1)}km` : null;
              const badge = [pricePart, distPart].filter(Boolean).join(' / ');
              return (
                <View key={cl.id} style={styles.courtRow}>
                  <Text style={[styles.courtPin, { color: t.accent }]}>📍</Text>
                  <Text style={[styles.courtName, { color: t.text }]} numberOfLines={1}>{cl.venueName}</Text>
                  {badge ? (
                    <Text style={[styles.courtBadge, { color: t.textSec }]}>{badge}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        {/* Pricing */}
        <View style={[styles.section, { borderTopColor: t.border }]}>
          <SectionHeader title="Pricing" theme={t} />
          <View style={[styles.priceCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: t.textSec }]}>1-on-1</Text>
              <Text style={[styles.priceValue, { color: t.text }]}>
                {formatVndFull(coach.hourlyRate1on1)} / hr
              </Text>
            </View>
            {coach.hourlyRateGroup != null && (
              <View style={[styles.priceRow, styles.priceRowBorder, { borderTopColor: t.border }]}>
                <Text style={[styles.priceLabel, { color: t.textSec }]}>Group</Text>
                <Text style={[styles.priceValue, { color: t.text }]}>
                  {formatVndFull(coach.hourlyRateGroup)} / person
                </Text>
              </View>
            )}
          </View>
          {coach.groupSizes.length > 0 && (
            <Text style={[styles.availText, { color: t.textSec }]}>
              Group sizes: {coach.groupSizes.join(', ')}
            </Text>
          )}

          {/* Credit Packs */}
          {(coach.creditPacks?.length ?? 0) > 0 && (
            <View style={styles.creditPackSection}>
              <Text style={[styles.creditPackTitle, { color: t.text }]}>Credit Packs</Text>
              {coach.creditPacks!.map((cp) => (
                <View
                  key={cp.id}
                  style={[styles.creditPackRow, { backgroundColor: t.bgCard, borderColor: t.border }]}
                >
                  <View style={styles.creditPackLeft}>
                    <Text style={[styles.creditPackName, { color: t.text }]}>{cp.name}</Text>
                    <Text style={[styles.creditPackSessions, { color: t.textSec }]}>
                      {cp.creditCount} session{cp.creditCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={styles.creditPackRight}>
                    <Text style={[styles.creditPackPrice, { color: t.accent }]}>
                      {formatVndFull(cp.price)}
                    </Text>
                    {cp.discountPercent != null && cp.discountPercent > 0 && (
                      <View style={[styles.discountBadge, { backgroundColor: t.green }]}>
                        <Text style={[styles.discountText, { color: t.bg }]}>
                          -{cp.discountPercent}%
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Availability */}
        <View style={[styles.section, { borderTopColor: t.border }]}>
          <SectionHeader title="Availability" theme={t} />
          <Text style={[styles.availText, { color: t.textSec }]}>
            Next available: {nextAvailable ?? 'Not available yet'}
          </Text>
          {availabilityByDay.length > 0 ? (
            <View style={[styles.availabilityTable, { borderColor: t.border, backgroundColor: t.bgCard }]}>
              {availabilityByDay.map((row, index) => (
                <View
                  key={row.day}
                  style={[
                    styles.availabilityRow,
                    index > 0 && { borderTopWidth: 1, borderTopColor: t.border },
                  ]}
                >
                  <Text style={[styles.availabilityDay, { color: t.text }]}>{row.label}</Text>
                  <Text style={[styles.availabilitySlots, { color: t.textSec }]}>
                    {row.slots.join(', ')}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyStateText, { color: t.textMuted }]}>No weekly availability shared yet</Text>
          )}
        </View>

        {/* Reviews */}
        {reviewTotal > 0 && (
          <View style={[styles.section, { borderTopColor: t.border }]}>
            <SectionHeader title="Reviews" theme={t} />
            {reviews.map((r) => (
              <View
                key={r.id}
                style={[styles.reviewCard, { backgroundColor: t.bgCard, borderColor: t.border }]}
              >
                <View style={styles.reviewHeader}>
                  <Text style={[styles.reviewStars, { color: t.accent }]}>
                    {'★'.repeat(Math.round(r.ratingOverall))}
                    {'☆'.repeat(5 - Math.round(r.ratingOverall))}
                  </Text>
                  <Text style={[styles.reviewOverall, { color: t.textSec }]}>
                    {r.ratingOverall.toFixed(1)}
                  </Text>
                </View>
                {r.comment && (
                  <Text style={[styles.reviewComment, { color: t.text }]}>{r.comment}</Text>
                )}
                <Text style={[styles.reviewAuthor, { color: t.textMuted }]}>
                  — {r.userName}, {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Credit status */}
        {credit && (
          <View style={[styles.creditNotice, { backgroundColor: t.accentBg }]}>
            <Text style={[styles.creditNoticeText, { color: t.accent }]}>
              You have {credit.remainingCredits} credit{credit.remainingCredits !== 1 ? 's' : ''} with this coach
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky bottom bar */}
      <View
        style={[
          styles.stickyBar,
          {
            backgroundColor: t.bg,
            borderTopColor: t.border,
            paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.md,
          },
        ]}
      >
        {(coach.creditPacks?.length ?? 0) > 0 && (
          <Pressable
            onPress={onBuyCredits}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { borderColor: t.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.secondaryBtnText, { color: t.accent }]}>Buy Credits</Text>
          </Pressable>
        )}
        <Pressable
          onPress={onBook}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: t.accent, opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <Text style={[styles.primaryBtnText, { color: t.bg }]}>Book a Session</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: spacing.lg },
  backBtn: {
    paddingVertical: spacing.md,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  heroSection: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  heroAvatar: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  heroAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInitials: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
  },
  heroName: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  newCoachBadge: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  newCoachBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  heroCert: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  heroRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  heroStar: {
    fontSize: fontSize.lg,
  },
  heroRating: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  heroReviewCount: {
    fontSize: fontSize.sm,
  },
  heroMeta: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  section: {
    borderTopWidth: 1,
    paddingVertical: spacing.lg,
  },
  ratingBars: {
    marginTop: spacing.md,
  },
  bioText: {
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  metaListText: {
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.45,
    marginTop: spacing.xs,
  },
  metaListLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  courtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  courtPin: {
    fontSize: fontSize.md,
  },
  courtName: {
    fontSize: fontSize.md,
    flex: 1,
  },
  courtBadge: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  priceCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  priceRowBorder: {
    borderTopWidth: 1,
  },
  priceLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  priceValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  creditPackSection: {
    marginTop: spacing.lg,
  },
  creditPackTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  creditPackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  creditPackLeft: { flex: 1 },
  creditPackName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  creditPackSessions: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  creditPackRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  creditPackPrice: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  discountBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  discountText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  availText: {
    fontSize: fontSize.md,
    marginTop: spacing.sm,
  },
  availabilityTable: {
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  availabilityDay: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    width: 84,
  },
  availabilitySlots: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.45,
  },
  emptyStateText: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  reviewCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reviewStars: {
    fontSize: fontSize.sm,
    letterSpacing: 2,
  },
  reviewOverall: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  reviewComment: {
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.45,
    marginTop: spacing.sm,
  },
  reviewAuthor: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  creditNotice: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  creditNoticeText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  primaryBtn: {
    flex: 1.5,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
});
