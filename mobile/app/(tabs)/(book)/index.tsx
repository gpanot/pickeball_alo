import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import BookScreenTopBar from '@/components/search/BookScreenTopBar';
import SearchFormFields from '@/components/search/SearchFormFields';
import PinnedVenuesRow from '@/components/search/PinnedVenuesRow';
import PinnedVenueAvailabilityPreview, {
  type QuickPinnedVenueSelection,
} from '@/components/search/PinnedVenueAvailabilityPreview';
import BookingConfirmation from '@/components/booking/BookingConfirmation';
import { SearchIcon } from '@/components/Icons';
import { useCourtMap } from '@/context/CourtMapContext';
import { cancelBooking, createBooking } from '@/mobile/lib/api';
import { DURATIONS, getNextDays } from '@/mobile/lib/formatters';
import type { BookingResult } from '@/mobile/lib/types';
import type { VenueResult } from '@/mobile/lib/types';

export default function SearchRoute() {
  const router = useRouter();
  const ctx = useCourtMap();
  const {
    t,
    venues,
    savedIds,
    searchQuery,
    setSearchQuery,
    selectedDate,
    setSelectedDate,
    selectedDuration,
    setSelectedDuration,
    selectedTime,
    setSelectedTime,
    handleSearch,
    searchDate,
    userId,
    userName,
    userPhone,
    goMyBookingsTab,
    savedHydrationLoading,
  } = ctx;

  const pinnedVenues = useMemo(
    () => venues.filter((v) => savedIds.has(v.id)),
    [venues, savedIds],
  );

  const [selectedPinnedId, setSelectedPinnedId] = useState<string | null>(null);
  const [quickSelection, setQuickSelection] = useState<QuickPinnedVenueSelection | null>(null);
  const [quickBookingSubmitting, setQuickBookingSubmitting] = useState(false);
  const [quickBookingDialog, setQuickBookingDialog] = useState<{
    booking: BookingResult;
    venue: VenueResult;
  } | null>(null);
  const [quickCancelSubmitting, setQuickCancelSubmitting] = useState(false);
  const [emptyPinnedAttentionTick, setEmptyPinnedAttentionTick] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const previewYRef = useRef(0);

  const onPickPinnedVenue = useCallback(
    (v: VenueResult) => {
      setSelectedPinnedId((prev) => {
        const next = prev === v.id ? null : v.id;
        if (next !== prev) setQuickSelection(null);
        return next;
      });
      setSearchQuery((prev) => (prev === v.name ? '' : v.name));
    },
    [setSearchQuery],
  );

  useEffect(() => {
    if (!selectedPinnedId) return;
    const stillVisible = pinnedVenues.some((v) => v.id === selectedPinnedId);
    if (!stillVisible) {
      setSelectedPinnedId(null);
      setQuickSelection(null);
    }
  }, [pinnedVenues, selectedPinnedId]);

  const scrollPreviewIntoView = useCallback(() => {
    scrollRef.current?.scrollTo({ y: Math.max(0, previewYRef.current - 10), animated: true });
  }, []);

  const selectedDateLabel = useMemo(() => {
    const d = getNextDays(7)[selectedDate];
    if (!d) return '';
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
    return `${weekday} ${d.getDate()}`;
  }, [selectedDate]);

  const formatK = useCallback((amount: number): string => {
    if (amount >= 1000) return `${Math.round(amount / 1000)}k`;
    return `${amount}`;
  }, []);

  const openMapView = useCallback(
    () => router.push('/(tabs)/(book)/map'),
    [router],
  );

  const onSearchPress = useCallback(async () => {
    if (pinnedVenues.length === 0) {
      setEmptyPinnedAttentionTick((n) => n + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    if (selectedPinnedId) {
      if (!quickSelection || quickBookingSubmitting) return;
      if (!userName.trim() || !userPhone.trim()) {
        Alert.alert(
          'Profile required',
          'Please add your name and phone in Profile before sending a booking request.',
        );
        return;
      }
      setQuickBookingSubmitting(true);
      try {
        const booking = await createBooking({
          venueId: quickSelection.venue.id,
          venueName: quickSelection.venue.name,
          venuePhone: quickSelection.venue.phone || undefined,
          venueAddress: quickSelection.venue.address,
          userId,
          userName: userName.trim(),
          userPhone: userPhone.trim(),
          date: searchDate,
          slots: quickSelection.slots,
          totalPrice: quickSelection.totalPrice,
        });
        setQuickBookingDialog({ booking, venue: quickSelection.venue });
      } catch (e) {
        Alert.alert(
          'Booking failed',
          e instanceof Error ? e.message : 'Could not send booking request',
        );
      } finally {
        setQuickBookingSubmitting(false);
      }
      return;
    }
    void handleSearch();
  }, [
    selectedPinnedId,
    quickSelection,
    quickBookingSubmitting,
    userName,
    userPhone,
    userId,
    searchDate,
    handleSearch,
    pinnedVenues.length,
  ]);

  const ctaLabel = useMemo(() => {
    if (!selectedPinnedId) return 'SEARCH COURTS';
    if (quickBookingSubmitting) return 'SENDING...';
    if (!quickSelection) return 'NO AVAILABLE SLOT';
    const dur = DURATIONS[selectedDuration] ?? '';
    return `Book - ${dur} - ${quickSelection.startLabel}  ${selectedDateLabel} - ${formatK(quickSelection.totalPrice)}`;
  }, [selectedPinnedId, quickBookingSubmitting, quickSelection, selectedDateLabel, formatK, selectedDuration]);

  const ctaDisabledVisual = pinnedVenues.length === 0 || (selectedPinnedId ? (!quickSelection || quickBookingSubmitting) : false);

  const requestCancelQuickBooking = useCallback(() => {
    if (!quickBookingDialog || quickCancelSubmitting) return;
    Alert.alert(
      'Cancel this booking?',
      'Are you sure you want to cancel this booking? This slot may not be available again.',
      [
        { text: 'Keep booking', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setQuickCancelSubmitting(true);
                await cancelBooking(quickBookingDialog.booking.id, userId);
                setQuickBookingDialog(null);
              } catch (e) {
                Alert.alert(
                  'Cancel failed',
                  e instanceof Error ? e.message : 'Could not cancel this booking',
                );
              } finally {
                setQuickCancelSubmitting(false);
              }
            })();
          },
        },
      ],
    );
  }, [quickBookingDialog, quickCancelSubmitting, userId]);

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <View style={[styles.topStack, { backgroundColor: t.bg }]}>
        <BookScreenTopBar t={t} />
      </View>
      <View style={[styles.gradTop, { backgroundColor: t.accentBg }]} />
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 108 }}
        keyboardShouldPersistTaps="handled"
      >
        <SearchFormFields
          t={t}
          searchQuery={searchQuery}
          selectedDate={selectedDate}
          selectedDuration={selectedDuration}
          selectedTime={selectedTime}
          onSearchQueryChange={setSearchQuery}
          onDateChange={setSelectedDate}
          onDurationChange={setSelectedDuration}
          onTimeChange={setSelectedTime}
          hideLocationSearch
          hideNearMe
        />
        <PinnedVenuesRow
          venues={pinnedVenues}
          isLoading={savedHydrationLoading}
          emptyAttentionTick={emptyPinnedAttentionTick}
          selectedId={selectedPinnedId}
          t={t}
          onPickVenue={onPickPinnedVenue}
          onOpenMap={openMapView}
        />
        {selectedPinnedId ? (
          <View
            onLayout={(e) => {
              previewYRef.current = e.nativeEvent.layout.y;
            }}
          >
            <PinnedVenueAvailabilityPreview
              venueId={selectedPinnedId}
              searchDate={searchDate}
              selectedTime={selectedTime}
              selectedDuration={selectedDuration}
              t={t}
              onSelectionChange={setQuickSelection}
              onReady={scrollPreviewIntoView}
            />
          </View>
        ) : null}
      </ScrollView>
      <View
        style={[
          styles.ctaWrap,
          {
            backgroundColor: t.bg,
          },
        ]}
      >
        <Pressable
          onPress={onSearchPress}
          disabled={quickBookingSubmitting}
          style={[
            styles.cta,
            { backgroundColor: ctaDisabledVisual ? t.textMuted : t.accent },
          ]}
        >
          {!selectedPinnedId && <SearchIcon color="#000" />}
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      </View>
      <Modal
        visible={quickBookingDialog != null}
        animationType="slide"
        onRequestClose={() => setQuickBookingDialog(null)}
      >
        <View style={[styles.modalRoot, { backgroundColor: t.bg }]}>
          <View style={[styles.modalBar, { borderBottomColor: t.border }]}>
            <Pressable
              onPress={requestCancelQuickBooking}
              disabled={quickCancelSubmitting}
              style={{ padding: 12, opacity: quickCancelSubmitting ? 0.6 : 1 }}
            >
              <Text style={{ color: t.red, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
            <Text style={{ flex: 1, textAlign: 'center', color: t.text, fontWeight: '800' }}>
              Booking request sent
            </Text>
            <View style={{ width: 56 }} />
          </View>
          {quickBookingDialog ? (
            <View style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12 }}>
              <BookingConfirmation
                booking={quickBookingDialog.booking}
                venue={quickBookingDialog.venue}
                userId={userId}
                t={t}
                onShowMyBooking={() => {
                  setQuickBookingDialog(null);
                  goMyBookingsTab();
                }}
              />
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  /** Keep venue/places dropdown above the ScrollView (sibling order paints later on top). */
  topStack: { zIndex: 20, elevation: 20 },
  gradTop: { height: 8, marginHorizontal: 20, opacity: 0.5, borderRadius: 4 },
  /** Pinned just above the tab bar; tab navigator already reserves bottom inset. */
  ctaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  ctaText: { color: '#000', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  modalRoot: { flex: 1 },
  modalBar: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
