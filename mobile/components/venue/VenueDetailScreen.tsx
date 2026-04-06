import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Linking, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { HeartIcon, ShareIcon, StarIcon, CourtIcon, PinIcon, DirectionsIcon } from '@/components/Icons';
import AvailabilityTab from '@/components/venue/AvailabilityTab';
import PricingTab from '@/components/venue/PricingTab';
import InfoTab from '@/components/venue/InfoTab';
import BookingForm from '@/components/booking/BookingForm';
import BookingConfirmation from '@/components/booking/BookingConfirmation';
import {
  earliestSelectedSlotTime,
  formatDateLabel,
  formatPrice,
  getNextDays,
  START_HOUR_OPTIONS,
} from '@/lib/formatters';
import type { ThemeTokens } from '@/lib/theme';
import type { VenueResult, BookingResult } from '@/lib/types';
import { getVenue, getAloboSlots } from '@/lib/api';

/** Visible map strip above the sheet: easy tap target, not tucked under status bar. */
const MAP_TAP_DISMISS_EXTRA = 56;

function AloboFreshnessBar({
  fetchedAt,
  refreshing,
  onRefresh,
  t,
}: {
  fetchedAt: string;
  refreshing: boolean;
  onRefresh: () => void;
  t: ThemeTokens;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const secsAgo = Math.max(0, Math.round((Date.now() - new Date(fetchedAt).getTime()) / 1000));
  const label = secsAgo < 60 ? `${secsAgo}s ago` : `${Math.floor(secsAgo / 60)}m ago`;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 6, gap: 6 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.green }} />
      <Text style={{ fontSize: 11, color: t.textMuted, flex: 1 }}>
        AloBo · {label}
      </Text>
      <Pressable onPress={onRefresh} disabled={refreshing} hitSlop={8}>
        {refreshing ? (
          <ActivityIndicator size="small" color={t.textMuted} />
        ) : (
          <Text style={{ fontSize: 11, fontWeight: '700', color: t.accent }}>Refresh</Text>
        )}
      </Pressable>
    </View>
  );
}

type SheetStep = 'detail' | 'booking' | 'confirmation';

function CompactAvailabilityDateStrip({
  selectedDateIndex,
  loading,
  onSelect,
  t,
}: {
  selectedDateIndex: number;
  loading: boolean;
  onSelect: (i: number) => void;
  t: ThemeTokens;
}) {
  const dates = getNextDays(7);
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
      <Text style={[styles.dateLabel, { color: t.textMuted }]}>Date</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {dates.map((d, i) => {
          const { day, date } = formatDateLabel(d);
          const active = i === selectedDateIndex;
          return (
            <Pressable
              key={i}
              disabled={loading}
              onPress={() => onSelect(i)}
              style={[
                styles.dateChip,
                {
                  backgroundColor: active ? t.accent : t.bgCard,
                  borderColor: active ? t.accent : t.border,
                  opacity: loading ? 0.55 : 1,
                },
              ]}
            >
              <Text style={{ fontSize: 9, fontWeight: '600', color: active ? '#000' : t.text, opacity: 0.65 }}>
                {day}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#000' : t.text }}>{date}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface VenueDetailScreenProps {
  venueId: string;
  initialVenue: VenueResult | null;
  visible: boolean;
  initialJumpToBooking: boolean;
  selectedSlots: Set<string>;
  isSaved: boolean;
  searchDate: string;
  selectedDateIndex: number;
  onAvailabilityDateChange: (dateIndex: number) => void;
  detailDateLoading?: boolean;
  selectedTimeIndex: number;
  userId: string;
  userName: string;
  userPhone: string;
  /** After a successful booking create/update, persist name & phone locally for next time. */
  onPersistPlayerProfile?: (name: string, phone: string) => void;
  onClose: () => void;
  onToggleSlot: (courtName: string, time: string) => void;
  onToggleSaved: (id: string) => void;
  onBookingComplete: () => void;
  onViewBookings: () => void;
  onVenueLoaded?: (v: VenueResult) => void;
  /** When set, confirm step PATCHes this booking instead of POST new. */
  editBookingId?: string | null;
  t: ThemeTokens;
}

export default function VenueDetailScreen({
  venueId,
  initialVenue,
  visible,
  initialJumpToBooking,
  selectedSlots,
  isSaved,
  searchDate,
  selectedDateIndex,
  onAvailabilityDateChange,
  detailDateLoading = false,
  selectedTimeIndex,
  userId,
  userName,
  userPhone,
  onPersistPlayerProfile,
  onClose,
  onToggleSlot,
  onToggleSaved,
  onBookingComplete,
  onViewBookings,
  onVenueLoaded,
  editBookingId = null,
  t,
}: VenueDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const [venue, setVenue] = useState<VenueResult | null>(initialVenue);
  const [loadingVenue, setLoadingVenue] = useState(!initialVenue);
  const [detailTab, setDetailTab] = useState<'avail' | 'pricing' | 'info'>('avail');
  const pricingTables = Array.isArray(venue?.pricingTables) ? venue!.pricingTables! : [];
  const [step, setStep] = useState<SheetStep>('detail');
  const [completedBooking, setCompletedBooking] = useState<BookingResult | null>(null);
  const [availabilityScrollAnchor, setAvailabilityScrollAnchor] = useState<string | null>(null);
  const lastSheetOpenKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialVenue && initialVenue.id === venueId) {
      setVenue(initialVenue);
      setLoadingVenue(false);
    }
  }, [initialVenue, venueId]);

  const fetchingRef = useRef(false);
  useEffect(() => {
    if (!visible || !venueId) return;
    // List/search payloads omit `payments`; we must load `/api/venues/[id]` for payment UI.
    const hasFullDetail =
      venue && venue.id === venueId && venue.payments !== undefined;
    if (hasFullDetail) return;
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    let cancelled = false;
    setLoadingVenue(true);
    void getVenue(venueId, searchDate)
      .then((v) => {
        if (cancelled) return;
        setVenue(v);
        onVenueLoaded?.(v);
        setLoadingVenue(false);
        fetchingRef.current = false;
      })
      .catch(() => {
        if (!cancelled) {
          setLoadingVenue(false);
          fetchingRef.current = false;
        }
      });
    return () => {
      cancelled = true;
      fetchingRef.current = false;
    };
  }, [visible, venueId, searchDate, venue, onVenueLoaded]);

  // ── AloBo slot overlay ─────────────────────────────────────────────
  const [aloboBookedKeys, setAloboBookedKeys] = useState<Set<string>>(new Set());
  const [aloboFetchedAt, setAloboFetchedAt] = useState<string | null>(null);
  const [aloboSupported, setAloboSupported] = useState(false);
  const [aloboRefreshing, setAloboRefreshing] = useState(false);

  const fetchAlobo = useCallback(
    async (vid: string, date: string) => {
      setAloboRefreshing(true);
      try {
        const result = await getAloboSlots(vid, date);
        setAloboSupported(result.supported);
        if (result.supported && result.bookedKeys) {
          setAloboBookedKeys(new Set(result.bookedKeys));
          setAloboFetchedAt(result.fetchedAt ?? new Date().toISOString());
        } else {
          setAloboBookedKeys(new Set());
          setAloboFetchedAt(null);
        }
      } catch {
        setAloboBookedKeys(new Set());
        setAloboFetchedAt(null);
      } finally {
        setAloboRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!visible || !venueId || !searchDate) return;
    void fetchAlobo(venueId, searchDate);
  }, [visible, venueId, searchDate, fetchAlobo]);

  useEffect(() => {
    if (!visible) {
      lastSheetOpenKeyRef.current = null;
      return;
    }
    const openKey = venueId;
    const isNewOpen = lastSheetOpenKeyRef.current !== openKey;
    if (!isNewOpen) return;
    lastSheetOpenKeyRef.current = openKey;
    if (initialJumpToBooking && selectedSlots.size > 0) {
      setStep('booking');
    } else {
      setStep('detail');
    }
  }, [visible, venueId, initialJumpToBooking, selectedSlots.size]);

  useEffect(() => {
    if (!visible) {
      setAvailabilityScrollAnchor(null);
      return;
    }
    const names = venue?.courts.map((c) => c.name) ?? [];
    if (names.length === 0) return;
    setAvailabilityScrollAnchor(earliestSelectedSlotTime(selectedSlots, names));
  }, [visible, venue?.id, venue?.courts, selectedSlots]);

  const selArr = useMemo(() => {
    if (!venue) return [];
    return [...selectedSlots].map((k) => {
      const pipe = k.indexOf('|');
      const courtName = pipe >= 0 ? k.slice(0, pipe) : '';
      const time = pipe >= 0 ? k.slice(pipe + 1) : '';
      const court = venue.courts.find((c) => c.name === courtName);
      const slot = court?.slots.find((s) => s.time === time);
      return { courtName, time, price: slot?.price || 0 };
    });
  }, [selectedSlots, venue]);

  const totalPrice = selArr.reduce((s, x) => s + x.price, 0);

  const searchHourScrollAnchor = useMemo(() => {
    const h = START_HOUR_OPTIONS[selectedTimeIndex]?.hour ?? 9;
    return `${String(h).padStart(2, '0')}:00`;
  }, [selectedTimeIndex]);

  const handleBookingSuccess = (booking: BookingResult) => {
    setCompletedBooking(booking);
    setStep('confirmation');
    onBookingComplete();
  };

  const handleClose = useCallback(() => {
    setStep('detail');
    setDetailTab('avail');
    setCompletedBooking(null);
    onClose();
  }, [onClose]);

  const { height: windowHeight } = useWindowDimensions();
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = 0;
    }
  }, [visible, venueId]);

  const sheetSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const dismissSheetAnimated = useCallback(() => {
    translateY.value = withTiming(
      windowHeight + 48,
      { duration: 260, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(handleClose)();
      },
    );
  }, [handleClose, windowHeight]);

  const mapDismissStripHeight = useMemo(
    () => Math.max(insets.top + MAP_TAP_DISMISS_EXTRA, 96),
    [insets.top],
  );

  const sheetPan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(8)
        .failOffsetX([-44, 44])
        .onUpdate((e) => {
          const y = e.translationY;
          translateY.value = y > 0 ? y : y * 0.22;
        })
        .onEnd((e) => {
          const threshold = Math.min(150, windowHeight * 0.2);
          const dismiss = translateY.value > threshold || e.velocityY > 520;
          if (dismiss) {
            translateY.value = withTiming(
              windowHeight + 48,
              { duration: 240, easing: Easing.in(Easing.cubic) },
              (finished) => {
                if (finished) runOnJS(handleClose)();
              },
            );
          } else {
            translateY.value = withSpring(0, { damping: 22, stiffness: 320 });
          }
        }),
    [handleClose, windowHeight],
  );

  /** Tap the grab bar (no drag) to dismiss, same as the map strip above. */
  const sheetHandleTap = useMemo(
    () =>
      Gesture.Tap()
        .maxDistance(14)
        .onEnd((_e, success) => {
          if (success) runOnJS(dismissSheetAnimated)();
        }),
    [dismissSheetAnimated],
  );

  const sheetHandleGesture = useMemo(
    () => Gesture.Simultaneous(sheetPan, sheetHandleTap),
    [sheetPan, sheetHandleTap],
  );

  if (!visible) return null;

  return (
    <View style={styles.modalRoot}>
      <Pressable
        style={[styles.mapDismissStrip, { height: mapDismissStripHeight }]}
        onPress={dismissSheetAnimated}
        accessibilityRole="button"
        accessibilityLabel="Close venue details"
      />
      <Animated.View style={[styles.sheetShell, sheetSlideStyle]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: t.sheetBg,
              paddingBottom: Math.max(16, insets.bottom),
              flex: 1,
            },
          ]}
        >
        <GestureDetector gesture={sheetHandleGesture}>
          <View
            style={styles.handleWrap}
            accessibilityRole="button"
            accessibilityLabel="Close venue details"
          >
            <View style={[styles.handle, { backgroundColor: t.textMuted }]} />
          </View>
        </GestureDetector>

        {loadingVenue || !venue ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator color={t.accent} />
          </View>
        ) : (
          <>
            {step === 'booking' && venue ? (
              <BookingForm
                venue={venue}
                selectedSlots={selArr}
                totalPrice={totalPrice}
                searchDate={searchDate}
                userId={userId}
                defaultName={userName}
                defaultPhone={userPhone}
                editBookingId={editBookingId}
                onPersistPlayerProfile={onPersistPlayerProfile}
                onBack={() => setStep('detail')}
                onSuccess={handleBookingSuccess}
                t={t}
              />
            ) : step === 'confirmation' && completedBooking && venue ? (
              <View style={{ flex: 1, minHeight: 0 }}>
                <BookingConfirmation booking={completedBooking} venue={venue} userId={userId} t={t} />
              </View>
            ) : (
            <ScrollView
              style={{ flex: 1 }}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {step === 'detail' && (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
                    {[0, 1, 2, 3].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.photo,
                          {
                            minWidth: i === 0 ? 200 : 130,
                            height: 130,
                            backgroundColor: t.bgSurface,
                            borderColor: t.border,
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 36 }}>{['🏓', '🏸', '🎾', '🏆'][i]}</Text>
                      </View>
                    ))}
                  </ScrollView>

                  <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 21, fontWeight: '800', color: t.text }}>{venue.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <PinIcon color={t.textSec} />
                          <Text style={{ fontSize: 13, color: t.textSec, flex: 1 }}>{venue.address}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, marginLeft: 12 }}>
                        <Pressable
                          onPress={() => onToggleSaved(venue.id)}
                          style={[styles.iconBtn, { backgroundColor: t.bgCard, borderColor: t.border }]}
                        >
                          <HeartIcon fill={isSaved} color={isSaved ? t.red : t.textSec} />
                        </Pressable>
                        <Pressable style={[styles.iconBtn, { backgroundColor: t.bgCard, borderColor: t.border }]}>
                          <ShareIcon color={t.textSec} />
                        </Pressable>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                      <View style={[styles.pill, { backgroundColor: t.accentBg }]}>
                        <StarIcon color={t.accent} />
                        <Text style={{ fontWeight: '700', fontSize: 14, color: t.text }}>{venue.rating}</Text>
                        <Text style={{ fontSize: 12, color: t.textSec }}>({venue.reviewCount})</Text>
                      </View>
                      <View style={[styles.pill, { backgroundColor: t.bgCard, borderColor: t.border, borderWidth: 1 }]}>
                        <CourtIcon color={t.textSec} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: t.text }}>
                          {venue.courts.length} courts
                        </Text>
                      </View>
                      {venue.distance != null ? (
                        <View style={[styles.pill, { backgroundColor: t.bgCard, borderColor: t.border, borderWidth: 1 }]}>
                          <PinIcon color={t.textSec} />
                          <Text style={{ fontSize: 13, fontWeight: '600', color: t.text }}>{venue.distance} km</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                      <Text style={{ fontSize: 24, fontWeight: '800', color: t.accent }}>{formatPrice(venue.priceMin)}</Text>
                      <Text style={{ fontSize: 14, color: t.textSec }}>
                        to {formatPrice(venue.priceMax)}/hour
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.tabs, { borderBottomColor: t.border, backgroundColor: t.sheetBg }]}>
                    {(
                      [
                        { key: 'avail' as const, label: 'Availability' },
                        { key: 'pricing' as const, label: 'Pricing' },
                        { key: 'info' as const, label: 'Info' },
                      ]
                    ).map((tab) => (
                      <Pressable key={tab.key} onPress={() => setDetailTab(tab.key)} style={{ flex: 1, paddingVertical: 12 }}>
                        <Text
                          style={{
                            textAlign: 'center',
                            fontSize: 13,
                            fontWeight: '700',
                            color: detailTab === tab.key ? t.accent : t.textSec,
                            borderBottomWidth: 2,
                            borderBottomColor: detailTab === tab.key ? t.accent : 'transparent',
                            paddingBottom: 10,
                          }}
                        >
                          {tab.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={{ paddingBottom: 8 }}>
                    {detailTab === 'avail' && (
                      <>
                        <CompactAvailabilityDateStrip
                          selectedDateIndex={selectedDateIndex}
                          loading={detailDateLoading}
                          onSelect={onAvailabilityDateChange}
                          t={t}
                        />
                        {aloboSupported && aloboFetchedAt && (
                          <AloboFreshnessBar
                            fetchedAt={aloboFetchedAt}
                            refreshing={aloboRefreshing}
                            onRefresh={() => void fetchAlobo(venueId, searchDate)}
                            t={t}
                          />
                        )}
                        <AvailabilityTab
                          courts={venue.courts}
                          selectedSlots={selectedSlots}
                          aloboBookedKeys={aloboBookedKeys}
                          scrollAnchorTime={availabilityScrollAnchor ?? searchHourScrollAnchor}
                          prioritizeSelectedCourts={editBookingId != null}
                          onToggleSlot={onToggleSlot}
                          t={t}
                        />
                      </>
                    )}
                    {detailTab === 'pricing' && (
                      <PricingTab
                        pricingTables={pricingTables}
                        hasMemberPricing={venue.hasMemberPricing}
                        venuePhone={venue.phone}
                        t={t}
                      />
                    )}
                    {detailTab === 'info' && <InfoTab venue={venue} t={t} />}
                  </View>
                </>
              )}
            </ScrollView>
            )}

            {step === 'detail' && venue && (
              <View style={[styles.footer, { borderTopColor: t.border, backgroundColor: t.sheetBg }]}>
                <Pressable
                  onPress={() =>
                    void Linking.openURL(
                      `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`,
                    )
                  }
                  style={[styles.dirBtn, { backgroundColor: t.bgCard, borderColor: t.border }]}
                >
                  <DirectionsIcon color={t.accent} />
                </Pressable>
                <Pressable
                  onPress={() => selArr.length > 0 && setStep('booking')}
                  style={[
                    styles.bookCta,
                    {
                      backgroundColor: selArr.length > 0 ? t.accent : t.textMuted,
                    },
                  ]}
                >
                  <Text style={{ color: selArr.length > 0 ? '#000' : '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.3, textAlign: 'center' }}>
                    {selArr.length === 0 && 'SELECT COURT & TIME'}
                    {selArr.length === 1 &&
                      `BOOK ${selArr[0].courtName} at ${selArr[0].time} · ${
                        selArr[0].price >= 1000 ? Math.round(selArr[0].price / 1000) + 'k' : selArr[0].price + 'k'
                      }`}
                    {selArr.length > 1 &&
                      `BOOK ${selArr.length} SLOTS · ${
                        totalPrice >= 1000 ? Math.round(totalPrice / 1000) + 'k' : totalPrice + 'k'
                      }`}
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, backgroundColor: 'transparent' },
  mapDismissStrip: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  sheetShell: {
    flex: 1,
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  handle: { width: 40, height: 4, borderRadius: 2, opacity: 0.4 },
  photo: {
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  dirBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookCta: { flex: 1, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 14 },
  dateLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
  dateChip: {
    minWidth: 56,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
});
