import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter, useSegments, type Href } from 'expo-router';
import * as Location from 'expo-location';
import {
  getVenueCatalogCount,
  searchVenues,
  getVenue,
  getBookings,
  cancelBooking,
} from '@/mobile/lib/api';
import { bookingSlotsToSelectedKeys } from '@/mobile/lib/booking-slot-keys';
import {
  getNextDays,
  toLocalDateKey,
  DURATIONS,
  START_HOUR_OPTIONS,
  durationIndexToHalfHourCount,
  pickSlotsForSearch,
} from '@/mobile/lib/formatters';
import type { VenueResult, BookingResult, SortMode, ResultsFlowPillContext } from '@/mobile/lib/types';
import { darkTheme } from '@/mobile/lib/theme';
import { useAsyncStorage } from '@/hooks/useAsyncStorage';
import { mapDebug } from '@/mobile/lib/map-debug';
import { syncVenues as syncVenueCache, getCachedVenue } from '@/mobile/lib/venue-cache';

function generateId(): string {
  return 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function useCourtMapInner() {
  const router = useRouter();
  const segments = useSegments();

  const [savedViaResultsFlow, setSavedViaResultsFlow] = useState(false);
  const [savedIds, setSavedIds] = useAsyncStorage<string[]>('cm_saved', []);
  const [userId, setUserId] = useAsyncStorage('cm_userId', '');
  const [userName, setUserName] = useAsyncStorage('cm_userName', '');
  const [userPhone, setUserPhone] = useAsyncStorage('cm_userPhone', '');
  const [userGender, setUserGender] = useAsyncStorage<string>('cm_userGender', '');
  const [isPlayerPhoneVerified, setIsPlayerPhoneVerified] = useAsyncStorage('cm_phoneVerified', false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(0);
  const [selectedTime, setSelectedTime] = useState(4);
  const [sortBy, setSortBy] = useState<SortMode>('distance');

  const [venues, setVenues] = useState<VenueResult[]>([]);
  const [exploreVenues, setExploreVenues] = useState<VenueResult[]>([]);
  const [catalogVenueCount, setCatalogVenueCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const searchPageSize = 30;
  const [searchTotalResults, setSearchTotalResults] = useState<VenueResult[]>([]);
  const [searchDisplayCount, setSearchDisplayCount] = useState(searchPageSize);
  const searchHasMore = searchDisplayCount < searchTotalResults.length;
  const [bookings, setBookings] = useState<BookingResult[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [detailVenue, setDetailVenue] = useState<VenueResult | null>(null);
  const [detailJumpToConfirm, setDetailJumpToConfirm] = useState(false);
  const [detailRefreshing, setDetailRefreshing] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [savedSearchOpen, setSavedSearchOpen] = useState(false);
  const [savedSearchApplying, setSavedSearchApplying] = useState(false);
  const [savedBookVenue, setSavedBookVenue] = useState<VenueResult | null>(null);
  /** When set, venue detail submit updates this booking instead of creating a new one. */
  const [bookingBeingEdited, setBookingBeingEdited] = useState<BookingResult | null>(null);

  const navigatingToVenueRef = useRef(false);

  /** Dedupe identical explore API calls (center + radius). */
  const lastExploreFetchKeyRef = useRef<string>('');

  /** User geolocation cached across tab switches (set once). */
  const [mapUserLoc, setMapUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const mapGeoInitDone = useRef(false);

  useEffect(() => {
    if (mapUserLoc) return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const last = await Location.getLastKnownPositionAsync();
        if (last) {
          setMapUserLoc({ lat: last.coords.latitude, lng: last.coords.longitude });
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setMapUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch { /* permission denied or unavailable */ }
    })();
  }, [mapUserLoc]);

  const t = darkTheme;
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  useEffect(() => {
    if (!userId) {
      void setUserId(generateId());
    }
  }, [userId, setUserId]);

  useEffect(() => {
    getVenueCatalogCount()
      .then(setCatalogVenueCount)
      .catch(() => setCatalogVenueCount(null));
  }, []);

  useEffect(() => {
    syncVenueCache().catch(() => {});
  }, []);

  const hideTabBarForBookStack =
    segments.includes('results') || segments.includes('results-map');
  /** Do not hide tab bar for the venue modal: hiding it shrinks the tab content and the map reflows/jumps. The modal covers the bar visually. */
  const hideTabBar =
    hideTabBarForBookStack || (segments.includes('saved') && savedViaResultsFlow);

  useEffect(() => {
    if (!segments.includes('saved')) {
      setSavedSearchOpen(false);
      setSavedBookVenue(null);
    }
  }, [segments]);

  const hydratedSavedRef = useRef(new Set<string>());
  useEffect(() => {
    if (!Array.isArray(savedIds) || savedIds.length === 0) return;
    const inList = new Set(venues.map((v) => v.id));
    const missing = savedIds.filter((id) => !inList.has(id) && !hydratedSavedRef.current.has(id));
    if (missing.length === 0) return;

    missing.forEach((id) => hydratedSavedRef.current.add(id));

    const dates = getNextDays(7);
    const dateStr =
      selectedDate < dates.length ? toLocalDateKey(dates[selectedDate]) : toLocalDateKey(new Date());

    let cancelled = false;
    void (async () => {
      const settled = await Promise.allSettled(missing.map((id) => getVenue(id, dateStr)));
      if (cancelled) return;

      const loaded: VenueResult[] = [];
      let failedCount = 0;
      for (const r of settled) {
        if (r.status === 'fulfilled') {
          loaded.push(r.value);
        } else {
          failedCount += 1;
        }
      }

      if (failedCount > 0) {
        // Keep IDs marked as hydrated to avoid repeated noisy retries for stale/removed venues.
        console.warn(`Skipped ${failedCount} saved venue(s) that could not be hydrated.`);
      }

      if (loaded.length === 0) return;
      setVenues((prev) => {
        const byId = new Map(prev.map((v) => [v.id, v]));
        let changed = false;
        for (const v of loaded) {
          if (!v?.id) continue;
          if (!byId.has(v.id)) {
            byId.set(v.id, v);
            changed = true;
          }
        }
        if (!changed) return prev;
        return Array.from(byId.values());
      });
    })();

    return () => { cancelled = true; };
  // only re-run when savedIds changes, not on every venues update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedIds, selectedDate]);

  const closeSavedBookSheet = useCallback(() => {
    setSavedSearchOpen(false);
    setSavedBookVenue(null);
  }, []);

  const openSavedBookSheet = useCallback((v: VenueResult) => {
    setSavedBookVenue(v);
    setSavedSearchOpen(true);
  }, []);

  const refetchVenues = useCallback(async () => {
    setLoading(true);
    setVenues([]);
    setSearchTotalResults([]);
    try {
      const dates = getNextDays(7);
      const dateStr =
        selectedDate < dates.length ? toLocalDateKey(dates[selectedDate]) : toLocalDateKey(new Date());
      const results = await searchVenues({
        query: searchQuery,
        date: dateStr,
        duration: DURATIONS[selectedDuration] ?? '1h',
        sort: sortBy,
        lat: 10.79,
        lng: 106.71,
        radius: 10,
      });
      setSearchTotalResults(results);
      setSearchDisplayCount(searchPageSize);
      setVenues(results.slice(0, searchPageSize));
    } catch (err) {
      // Keep the UI usable when backend search is temporarily unavailable.
      console.warn('Search venues failed; showing empty results.');
      setSearchTotalResults([]);
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedDate, selectedDuration, sortBy]);

  const loadMoreSearchResults = useCallback(() => {
    if (!searchHasMore) return;
    setSearchDisplayCount((prev) => {
      const next = prev + searchPageSize;
      setVenues(searchTotalResults.slice(0, next));
      return next;
    });
  }, [searchHasMore, searchTotalResults]);

  const fetchExploreMapVenues = useCallback(
    async (opts: { lat: number; lng: number; radiusKm: number; reason: string }) => {
      const r = Math.min(200, Math.max(1, Math.round(opts.radiusKm * 10) / 10));
      const key = `${opts.lat.toFixed(4)}|${opts.lng.toFixed(4)}|${r}`;
      if (lastExploreFetchKeyRef.current === key) {
        mapDebug('venues_fetch_skip_duplicate', { reason: opts.reason, key });
        return;
      }
      lastExploreFetchKeyRef.current = key;

      const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
      mapDebug('venues_fetch_start', {
        reason: opts.reason,
        lat: opts.lat,
        lng: opts.lng,
        radiusKm: r,
      });

      setLoading(true);
      try {
        const dateStr = toLocalDateKey(new Date());
        const results = await searchVenues({
          query: '',
          date: dateStr,
          duration: '1h',
          sort: 'distance',
          lat: opts.lat,
          lng: opts.lng,
          radius: r,
        });
        const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
        setVenues(results);
        setExploreVenues(results);
        mapDebug('venues_fetch_done', {
          reason: opts.reason,
          ms: Math.round(t1 - t0),
          count: results.length,
          radiusKm: r,
        });
      } catch (err) {
        mapDebug('venues_fetch_error', { reason: opts.reason, error: String(err) });
        console.warn('Explore map fetch failed; keeping app responsive.');
        setVenues([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /** @deprecated Prefer fetchExploreMapVenues with explicit center + radius. */
  const refetchExploreVenues = useCallback(async () => {
    await fetchExploreMapVenues({
      lat: 10.79,
      lng: 106.71,
      radiusKm: 5,
      reason: 'refetchExploreVenues-legacy',
    });
  }, [fetchExploreMapVenues]);

  const handleSearch = useCallback(async () => {
    router.push('/(tabs)/(book)/results');
    await refetchVenues();
  }, [refetchVenues, router]);

  const handleSort = useCallback((s: SortMode) => {
    setSortBy(s);
    setVenues((prev) => {
      const sorted = [...prev];
      if (s === 'price') sorted.sort((a, b) => (a.priceMin ?? Infinity) - (b.priceMin ?? Infinity));
      else if (s === 'rating') sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      else sorted.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
      return sorted;
    });
  }, []);

  const toggleSaved = useCallback(
    (id: string) => {
      void setSavedIds((prev: string[]) => {
        if (prev.includes(id)) return prev.filter((x: string) => x !== id);
        return [...prev, id];
      });
    },
    [setSavedIds],
  );

  const openDetail = useCallback(
    (
      v: VenueResult,
      opts?: { jumpToConfirm?: boolean; presetSlotsFromSearch?: boolean },
    ) => {
      if (navigatingToVenueRef.current) return;
      navigatingToVenueRef.current = true;
      setBookingBeingEdited(null);
      const useSearchPreset = opts?.presetSlotsFromSearch !== false;
      const hour = START_HOUR_OPTIONS[selectedTime]?.hour ?? 9;
      const n = durationIndexToHalfHourCount(selectedDuration);
      const preset = useSearchPreset ? pickSlotsForSearch(v, hour, n) : new Set<string>();

      // Use the passed venue (may be from search results). If it has no courts/slots,
      // try to fill from the local cache for an instant render while the full detail loads.
      let initial = v;
      if (!v.courts || v.courts.length === 0) {
        getCachedVenue(v.id)
          .then((cached) => {
            if (cached && cached.courts.length > 0) setDetailVenue(cached as VenueResult);
          })
          .catch(() => {});
      }
      setDetailVenue(initial);
      setSelectedSlots(preset);
      setDetailJumpToConfirm(Boolean(opts?.jumpToConfirm && preset.size > 0));
      queueMicrotask(() => {
        router.push(`/venue/${v.id}` as Href);
      });
    },
    [selectedTime, selectedDuration, router],
  );

  const resetVenueDetail = useCallback(() => {
    setDetailJumpToConfirm(false);
    setDetailVenue(null);
    setSelectedSlots(new Set());
    setBookingBeingEdited(null);
    navigatingToVenueRef.current = false;
  }, []);

  const persistPlayerProfileFromBooking = useCallback(
    (name: string, phone: string) => {
      const n = name.trim();
      const p = phone.trim();
      if (!n || !p) return;
      void setUserName(n);
      void setUserPhone(p);
    },
    [setUserName, setUserPhone],
  );

  const beginEditBooking = useCallback(
    async (booking: BookingResult) => {
      if (booking.status === 'paid' || booking.status === 'canceled') return;
      if (navigatingToVenueRef.current) return;
      const days = getNextDays(7);
      const idx = days.findIndex((d) => toLocalDateKey(d) === booking.date);
      if (idx < 0) {
        Alert.alert(
          "Can't edit in the app",
          'This booking is not on a date in the next 7 days. Contact the venue to change it, or cancel and book again.',
        );
        return;
      }
      navigatingToVenueRef.current = true;
      setBookingBeingEdited(booking);
      setSelectedDate(idx);
      setSelectedSlots(bookingSlotsToSelectedKeys(booking.slots));
      persistPlayerProfileFromBooking(booking.userName, booking.userPhone);
      setDetailJumpToConfirm(false);
      try {
        const v = await getVenue(booking.venueId, booking.date);
        setDetailVenue(v);
        queueMicrotask(() => router.push(`/venue/${booking.venueId}` as Href));
      } catch (err) {
        console.error('beginEditBooking', err);
        setBookingBeingEdited(null);
        setSelectedSlots(new Set());
        navigatingToVenueRef.current = false;
      }
    },
    [persistPlayerProfileFromBooking, router],
  );

  const closeDetail = useCallback(() => {
    resetVenueDetail();
    router.back();
  }, [router, resetVenueDetail]);

  const toggleSlot = useCallback((courtName: string, time: string) => {
    const key = `${courtName}|${time}`;
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const loadBookings = useCallback(async () => {
    if (!userId) return;
    setBookingsLoading(true);
    try {
      const result = await getBookings(userId);
      setBookings(result);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setBookingsLoading(false);
    }
  }, [userId]);

  const handleCancelBooking = useCallback(
    async (id: string) => {
      if (!userId) return;
      try {
        const updated = await cancelBooking(id, userId);
        setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
      } catch (err) {
        console.error('Failed to cancel booking:', err);
      }
    },
    [userId],
  );

  const handleSaveProfile = useCallback(
    (
      name: string,
      phone: string,
      id?: string,
      phoneVerified?: boolean,
      gender?: string | null,
    ) => {
      if (id?.trim()) {
        void setUserId(id.trim());
      }
      const normalizedPhone = phone.trim();
      const previousPhone = userPhone.trim();
      void setUserName(name);
      void setUserPhone(normalizedPhone);
      if (gender !== undefined) {
        const g = typeof gender === 'string' ? gender.toLowerCase().trim() : '';
        if (g === 'male' || g === 'female') {
          void setUserGender(g);
        } else if (gender === null || gender === '') {
          void setUserGender('');
        }
      }
      if (typeof phoneVerified === 'boolean') {
        void setIsPlayerPhoneVerified(phoneVerified);
      } else if (normalizedPhone !== previousPhone) {
        void setIsPlayerPhoneVerified(false);
      }
    },
    [setUserId, setUserName, setUserPhone, userPhone, setUserGender, setIsPlayerPhoneVerified],
  );

  const handleSavedBookConfirm = useCallback(async () => {
    const target = savedBookVenue;
    if (!target) return;
    setSavedSearchApplying(true);
    try {
      const days = getNextDays(7);
      const dateStr =
        selectedDate < days.length ? toLocalDateKey(days[selectedDate]) : toLocalDateKey(new Date());
      const fresh = await getVenue(target.id, dateStr);
      const hour = START_HOUR_OPTIONS[selectedTime]?.hour ?? 9;
      const n = durationIndexToHalfHourCount(selectedDuration);
      const preset = pickSlotsForSearch(fresh, hour, n);
      setDetailVenue(fresh);
      setSelectedSlots(preset);
      setDetailJumpToConfirm(false);
      closeSavedBookSheet();
      void refetchVenues();
      router.push(`/venue/${fresh.id}`);
    } catch (err) {
      console.error('Saved book flow failed:', err);
    } finally {
      setSavedSearchApplying(false);
    }
  }, [
    savedBookVenue,
    selectedDate,
    selectedTime,
    selectedDuration,
    refetchVenues,
    closeSavedBookSheet,
    router,
  ]);

  const handleDetailAvailabilityDateChange = useCallback(
    async (dateIndex: number) => {
      const id = detailVenue?.id;
      if (!id) return;
      setSelectedDate(dateIndex);
      const days = getNextDays(7);
      const dateStr =
        dateIndex < days.length ? toLocalDateKey(days[dateIndex]) : toLocalDateKey(new Date());
      setDetailRefreshing(true);
      try {
        const updated = await getVenue(id, dateStr);
        setDetailVenue(updated);
        setSelectedSlots(new Set());
      } catch (err) {
        console.error('Failed to load venue for date:', err);
      } finally {
        setDetailRefreshing(false);
      }
    },
    [detailVenue?.id],
  );

  const dates = getNextDays(7);
  const searchDate =
    selectedDate < dates.length ? toLocalDateKey(dates[selectedDate]) : toLocalDateKey(new Date());

  const goMapsTab = useCallback(() => {
    if (segments.includes('maps')) return;
    setSearchQuery('');
    setSelectedDate(0);
    setSelectedDuration(0);
    setSelectedTime(4);
    setSortBy('distance');
    lastExploreFetchKeyRef.current = '';
    router.replace('/(tabs)/maps');
    mapDebug('maps_tab_navigate', {
      note: 'Reset search state; map screen starts fresh from explore.',
    });
  }, [router, segments]);

  const goSavedTab = useCallback(() => {
    if (segments.includes('saved') && !savedViaResultsFlow) return;
    setSavedViaResultsFlow(false);
    router.replace('/(tabs)/saved');
  }, [router, segments, savedViaResultsFlow]);

  const goMyBookingsTab = useCallback(() => {
    if (segments.includes('(bookings)')) return;
    if (userId && bookings.length === 0) {
      setBookingsLoading(true);
      getBookings(userId)
        .then(setBookings)
        .catch(() => {})
        .finally(() => setBookingsLoading(false));
    }
    router.replace('/(tabs)/(bookings)');
  }, [userId, bookings.length, router, segments]);

  const openSavedFromResultsFlow = useCallback(() => {
    setSavedViaResultsFlow(true);
    router.push('/(tabs)/saved');
  }, [router]);

  const onResultsFlowPrimary = useCallback(() => {
    if (segments.includes('results-map')) {
      router.replace('/(tabs)/(book)/results');
    } else {
      router.push('/(tabs)/(book)/results-map');
    }
  }, [segments, router]);

  const resultsFlowContext: ResultsFlowPillContext = segments.includes('results-map')
    ? 'map'
    : segments.includes('saved') && savedViaResultsFlow
      ? 'saved'
      : 'results';

  const goBookTab = useCallback(() => {
    const onBookHome = segments.includes('(book)') && !segments.includes('results') && !segments.includes('results-map');
    if (onBookHome) return;
    router.replace('/(tabs)/(book)');
  }, [router, segments]);

  const backFromResults = useCallback(() => {
    setSavedViaResultsFlow(false);
    router.replace('/(tabs)/(book)');
  }, [router]);

  const backFromSavedOrBookings = useCallback(() => {
    goBookTab();
  }, [goBookTab]);

  const backFromSavedInResultsFlow = useCallback(() => {
    router.replace('/(tabs)/(book)/results');
  }, [router]);

  const backFromProfile = useCallback(() => {
    goBookTab();
  }, [goBookTab]);

  const logoutPlayer = useCallback(() => {
    // Reset local player identity/state for clean end-to-end testing.
    void setUserId(generateId());
    void setUserName('');
    void setUserPhone('');
    void setUserGender('');
    void setIsPlayerPhoneVerified(false);
    void setSavedIds([]);
    setBookings([]);
    setSelectedSlots(new Set());
    setBookingBeingEdited(null);
    setSavedViaResultsFlow(false);
    setSavedSearchOpen(false);
    setSavedBookVenue(null);
    router.replace('/onboarding');
  }, [router, setSavedIds, setUserId, setUserName, setUserPhone, setUserGender, setIsPlayerPhoneVerified]);

  return useMemo(() => ({
    t,
    segments,
    hideTabBar,
    savedViaResultsFlow,
    setSavedViaResultsFlow,
    savedIds: savedSet,
    toggleSaved,
    userId,
    userName,
    userPhone,
    userGender,
    isPlayerPhoneVerified,
    setIsPlayerPhoneVerified,
    searchQuery,
    setSearchQuery,
    selectedDate,
    setSelectedDate,
    selectedDuration,
    setSelectedDuration,
    selectedTime,
    setSelectedTime,
    sortBy,
    venues,
    setVenues,
    exploreVenues,
    catalogVenueCount,
    loading,
    bookings,
    bookingsLoading,
    detailVenue,
    setDetailVenue,
    detailJumpToConfirm,
    detailRefreshing,
    selectedSlots,
    savedSearchOpen,
    setSavedSearchOpen,
    savedSearchApplying,
    savedBookVenue,
    searchDate,
    closeSavedBookSheet,
    openSavedBookSheet,
    refetchVenues,
    loadMoreSearchResults,
    searchHasMore,
    searchTotalCount: searchTotalResults.length,
    refetchExploreVenues,
    fetchExploreMapVenues,
    handleSearch,
    handleSort,
    openDetail,
    bookingBeingEdited,
    beginEditBooking,
    closeDetail,
    resetVenueDetail,
    toggleSlot,
    loadBookings,
    handleCancelBooking,
    handleSaveProfile,
    persistPlayerProfileFromBooking,
    handleSavedBookConfirm,
    handleDetailAvailabilityDateChange,
    mapUserLoc,
    setMapUserLoc,
    mapGeoInitDone,
    goMapsTab,
    goSavedTab,
    goMyBookingsTab,
    openSavedFromResultsFlow,
    onResultsFlowPrimary,
    resultsFlowContext,
    logoutPlayer,
    goBookTab,
    backFromResults,
    backFromSavedOrBookings,
    backFromSavedInResultsFlow,
    backFromProfile,
  }), [
    t, segments, hideTabBar, savedViaResultsFlow,
    savedSet, toggleSaved, userId, userName, userPhone, userGender, isPlayerPhoneVerified, setIsPlayerPhoneVerified,
    searchQuery, selectedDate, selectedDuration, selectedTime, sortBy,
    venues, exploreVenues, catalogVenueCount, loading, bookings, bookingsLoading,
    detailVenue, detailJumpToConfirm, detailRefreshing, selectedSlots,
    savedSearchOpen, savedSearchApplying, savedBookVenue, searchDate,
    closeSavedBookSheet, openSavedBookSheet, refetchVenues,
    loadMoreSearchResults, searchHasMore, searchTotalResults.length,
    refetchExploreVenues, fetchExploreMapVenues, handleSearch, handleSort,
    openDetail, bookingBeingEdited, beginEditBooking, closeDetail, resetVenueDetail, toggleSlot, loadBookings,
    handleCancelBooking, handleSaveProfile, persistPlayerProfileFromBooking, handleSavedBookConfirm,
    handleDetailAvailabilityDateChange, mapUserLoc, mapGeoInitDone,
    goMapsTab, goSavedTab, goMyBookingsTab, openSavedFromResultsFlow,
    onResultsFlowPrimary, resultsFlowContext, logoutPlayer, goBookTab, backFromResults,
    backFromSavedOrBookings, backFromSavedInResultsFlow, backFromProfile,
  ]);
}

const CourtMapContext = createContext<ReturnType<typeof useCourtMapInner> | null>(null);

export function CourtMapProvider({ children }: { children: React.ReactNode }) {
  const value = useCourtMapInner();
  return <CourtMapContext.Provider value={value}>{children}</CourtMapContext.Provider>;
}

export function useCourtMap() {
  const ctx = useContext(CourtMapContext);
  if (!ctx) throw new Error('useCourtMap must be used within CourtMapProvider');
  return ctx;
}
