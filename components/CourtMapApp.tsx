'use client';

import React, { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SearchScreen from '@/components/screens/SearchScreen';
import ResultsScreen from '@/components/screens/ResultsScreen';
import SavedScreen from '@/components/screens/SavedScreen';
import MyBookingsScreen from '@/components/screens/MyBookingsScreen';
import ProfileScreen from '@/components/screens/ProfileScreen';
import VenueDetail from '@/components/venue/VenueDetail';
import ThemeToggle from '@/components/ui/ThemeToggle';
import BottomNav from '@/components/ui/BottomNav';
import ResultsFlowPills from '@/components/ui/ResultsFlowPills';
import SearchCriteriaSheet from '@/components/search/SearchCriteriaSheet';
import { darkTheme, lightTheme } from '@/lib/theme';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { searchVenues, getVenue, getBookings, cancelBooking, getVenueCatalogCount } from '@/lib/api';
import {
  getNextDays,
  toLocalDateKey,
  DURATIONS,
  START_HOUR_OPTIONS,
  durationIndexToHalfHourCount,
  pickSlotsForSearch,
} from '@/lib/formatters';
import type { VenueResult, BookingResult, Screen, SortMode } from '@/lib/types';

const MapScreenLazy = dynamic(() => import('@/components/screens/MapScreen'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
      🗺️ Loading map...
    </div>
  ),
});

function generateId(): string {
  return 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function CourtMapApp() {
  const [dark, setDark] = useLocalStorage('cm_dark', true);
  const [screen, setScreen] = useState<Screen>('search');
  const [savedViaResultsFlow, setSavedViaResultsFlow] = useState(false);
  const [savedIds, setSavedIds] = useLocalStorage<string[]>('cm_saved', []);
  const [userId, setUserId] = useLocalStorage('cm_userId', '');
  const [userName, setUserName] = useLocalStorage('cm_userName', '');
  const [userPhone, setUserPhone] = useLocalStorage('cm_userPhone', '');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(0);
  const [selectedTime, setSelectedTime] = useState(4);
  const [sortBy, setSortBy] = useState<SortMode>('distance');

  const [venues, setVenues] = useState<VenueResult[]>([]);
  const [catalogVenueCount, setCatalogVenueCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<BookingResult[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [detailVenue, setDetailVenue] = useState<VenueResult | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailJumpToConfirm, setDetailJumpToConfirm] = useState(false);
  const [detailRefreshing, setDetailRefreshing] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [savedSearchOpen, setSavedSearchOpen] = useState(false);
  const [savedSearchApplying, setSavedSearchApplying] = useState(false);
  /** Venue whose Book pill opened the sheet (drives “Book for …” → detail). */
  const [savedBookVenue, setSavedBookVenue] = useState<VenueResult | null>(null);

  const t = dark ? darkTheme : lightTheme;
  const savedSet = new Set(savedIds);

  useEffect(() => {
    if (!userId) {
      setUserId(generateId());
    }
  }, [userId, setUserId]);

  useEffect(() => {
    getVenueCatalogCount()
      .then(setCatalogVenueCount)
      .catch(() => setCatalogVenueCount(null));
  }, []);

  useEffect(() => {
    if (screen !== 'saved') {
      setSavedSearchOpen(false);
      setSavedBookVenue(null);
    }
  }, [screen]);

  /** Keep saved hearts visible after refresh: IDs live in localStorage but `venues` starts empty until a search. */
  useEffect(() => {
    if (!Array.isArray(savedIds) || savedIds.length === 0) return;
    const inList = new Set(venues.map((v) => v.id));
    const missing = savedIds.filter((id) => !inList.has(id));
    if (missing.length === 0) return;

    const dates = getNextDays(7);
    const dateStr =
      selectedDate < dates.length ? toLocalDateKey(dates[selectedDate]) : toLocalDateKey(new Date());

    let cancelled = false;
    void (async () => {
      try {
        const loaded = await Promise.all(missing.map((id) => getVenue(id, dateStr)));
        if (cancelled) return;
        setVenues((prev) => {
          const byId = new Map(prev.map((v) => [v.id, v]));
          let changed = false;
          for (const v of loaded) {
            if (!v?.id) continue;
            const prevV = byId.get(v.id);
            if (prevV !== v) {
              byId.set(v.id, v);
              changed = true;
            }
          }
          if (!changed) return prev;
          return Array.from(byId.values());
        });
      } catch (err) {
        console.error('Failed to hydrate saved courts:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [savedIds, venues, selectedDate]);

  const closeSavedBookSheet = useCallback(() => {
    setSavedSearchOpen(false);
    setSavedBookVenue(null);
  }, []);

  const openSavedBookSheet = useCallback((v: VenueResult) => {
    setSavedBookVenue(v);
    setSavedSearchOpen(true);
  }, []);

  const goBookTab = useCallback(() => {
    setScreen((prev) => {
      if (prev === 'maps') return 'search';
      return venues.length > 0 ? 'results' : 'search';
    });
  }, [venues.length]);

  const goSavedTab = useCallback(() => {
    setSavedViaResultsFlow(false);
    setScreen('saved');
  }, []);

  const goMyBookingsTab = useCallback(() => {
    if (userId) {
      setBookingsLoading(true);
      getBookings(userId)
        .then(setBookings)
        .catch(() => {})
        .finally(() => setBookingsLoading(false));
    }
    setScreen('bookings');
  }, [userId]);

  const openSavedFromResultsFlow = useCallback(() => {
    setSavedViaResultsFlow(true);
    setScreen('saved');
  }, []);

  const refetchVenues = useCallback(async () => {
    setLoading(true);
    try {
      const dates = getNextDays(7);
      const dateStr = selectedDate < dates.length ? toLocalDateKey(dates[selectedDate]) : toLocalDateKey(new Date());
      const results = await searchVenues({
        query: searchQuery,
        date: dateStr,
        duration: DURATIONS[selectedDuration] ?? '1h',
        sort: sortBy,
        lat: 10.79,
        lng: 106.71,
        radius: 10,
      });
      setVenues(results);
    } catch (err) {
      console.error('Search failed:', err);
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedDate, selectedDuration, sortBy]);

  /** Full catalog for Maps tab (no text query, worldwide radius). Slots use today’s date. */
  const refetchExploreVenues = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = toLocalDateKey(new Date());
      const results = await searchVenues({
        query: '',
        date: dateStr,
        duration: '1h',
        sort: 'distance',
        lat: 10.79,
        lng: 106.71,
        radius: 20_000,
      });
      setVenues(results);
    } catch (err) {
      console.error('Explore map load failed:', err);
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const goMapsTab = useCallback(() => {
    setScreen('maps');
    void refetchExploreVenues();
  }, [refetchExploreVenues]);

  const handleSearch = useCallback(async () => {
    setScreen('results');
    await refetchVenues();
  }, [refetchVenues]);

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

  const toggleSaved = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedIds((prev: string[]) => {
      if (prev.includes(id)) return prev.filter((x: string) => x !== id);
      return [...prev, id];
    });
  }, [setSavedIds]);

  const openDetail = useCallback(
    (v: VenueResult, opts?: { jumpToConfirm?: boolean }) => {
      const hour = START_HOUR_OPTIONS[selectedTime]?.hour ?? 9;
      const n = durationIndexToHalfHourCount(selectedDuration);
      const preset = pickSlotsForSearch(v, hour, n);
      setDetailVenue(v);
      setSelectedSlots(preset);
      setDetailJumpToConfirm(Boolean(opts?.jumpToConfirm && preset.size > 0));
      setTimeout(() => setDetailVisible(true), 10);
    },
    [selectedTime, selectedDuration],
  );

  const closeDetail = useCallback(() => {
    setDetailVisible(false);
    setDetailJumpToConfirm(false);
    setTimeout(() => setDetailVenue(null), 300);
  }, []);

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

  const handleNavigate = useCallback((s: Screen) => {
    if (s === 'bookings') loadBookings();
    if (s === 'saved') setSavedViaResultsFlow(false);
    setScreen(s);
  }, [loadBookings]);

  const handleSaveProfile = useCallback((name: string, phone: string) => {
    setUserName(name);
    setUserPhone(phone);
  }, [setUserName, setUserPhone]);

  const backFromSavedOrBookings = useCallback(() => {
    goBookTab();
  }, [goBookTab]);

  const backFromProfile = useCallback(() => {
    goBookTab();
  }, [goBookTab]);

  const backFromResults = useCallback(() => {
    setSavedViaResultsFlow(false);
    setScreen('search');
  }, []);

  const backFromSavedInResultsFlow = useCallback(() => {
    setScreen('results');
  }, []);

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
      setTimeout(() => setDetailVisible(true), 10);
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
  const searchDate = selectedDate < dates.length ? toLocalDateKey(dates[selectedDate]) : toLocalDateKey(new Date());

  const showFloatingTheme = screen !== 'search' && screen !== 'profile';

  const showBottomNav =
    !detailVisible &&
    (screen === 'search' ||
      screen === 'maps' ||
      screen === 'bookings' ||
      screen === 'profile' ||
      (screen === 'saved' && !savedViaResultsFlow));

  const showResultsFlowPills =
    !detailVisible &&
    (screen === 'results' || screen === 'map' || (screen === 'saved' && savedViaResultsFlow));

  const resultsFlowContext =
    screen === 'map' ? 'map' : screen === 'saved' ? 'saved' : 'results';

  const onResultsFlowPrimary = useCallback(() => {
    if (screen === 'map') setScreen('results');
    else setScreen('map');
  }, [screen]);

  return (
    <div style={{
      width: '100%', maxWidth: 430, margin: '0 auto', height: '100vh',
      background: t.bg, color: t.text,
      fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
      position: 'relative', overflow: 'hidden',
      transition: 'background 0.3s,color 0.3s',
    }}>
      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:0;height:0}
        input::placeholder{color:${t.textMuted}}
        textarea::placeholder{color:${t.textMuted}}
      `}</style>

      {showFloatingTheme && (
        <ThemeToggle dark={dark} onToggle={() => setDark(!dark)} t={t} />
      )}

      <div
        style={{
          height: '100%',
          overflowY: screen === 'map' || screen === 'maps' ? 'hidden' : 'auto',
          overflowX: 'hidden',
        }}
      >
        {screen === 'search' && (
          <SearchScreen
            searchQuery={searchQuery}
            selectedDate={selectedDate}
            selectedDuration={selectedDuration}
            selectedTime={selectedTime}
            userName={userName}
            catalogVenueCount={catalogVenueCount}
            onSearchQueryChange={setSearchQuery}
            onDateChange={setSelectedDate}
            onDurationChange={setSelectedDuration}
            onTimeChange={setSelectedTime}
            onSearch={handleSearch}
            onOpenProfile={() => setScreen('profile')}
            t={t}
          />
        )}
        {screen === 'results' && (
          <ResultsScreen
            venues={venues}
            savedIds={savedSet}
            sortBy={sortBy}
            selectedDate={selectedDate}
            selectedDuration={selectedDuration}
            selectedTime={selectedTime}
            searchQuery={searchQuery}
            loading={loading}
            onBack={backFromResults}
            onSort={handleSort}
            onToggleSaved={toggleSaved}
            onOpenVenue={(v) => openDetail(v)}
            onQuickBookVenue={(v) => openDetail(v, { jumpToConfirm: true })}
            onSearchQueryChange={setSearchQuery}
            onDateChange={setSelectedDate}
            onDurationChange={setSelectedDuration}
            onTimeChange={setSelectedTime}
            onRefetchSearch={refetchVenues}
            t={t}
          />
        )}
        {(screen === 'map' || screen === 'maps') && (
          <MapScreenLazy
            venues={venues}
            savedIds={savedSet}
            dark={dark}
            sortBy={sortBy}
            selectedDate={selectedDate}
            selectedDuration={selectedDuration}
            selectedTime={selectedTime}
            searchQuery={searchQuery}
            onBack={backFromResults}
            onSort={handleSort}
            onToggleSaved={toggleSaved}
            onOpenVenue={openDetail}
            onSearchQueryChange={setSearchQuery}
            onDateChange={setSelectedDate}
            onDurationChange={setSelectedDuration}
            onTimeChange={setSelectedTime}
            onRefetchSearch={refetchVenues}
            t={t}
            userAreaRadiusKm={screen === 'maps' ? 5 : undefined}
            hasFlowPills={screen === 'map'}
            bookHomeTopBar={screen === 'maps'}
            catalogVenueCount={catalogVenueCount}
            userName={userName}
            onOpenProfile={() => setScreen('profile')}
          />
        )}
        {screen === 'saved' && (
          <SavedScreen
            venues={venues}
            savedIds={savedSet}
            onBack={savedViaResultsFlow ? backFromSavedInResultsFlow : backFromSavedOrBookings}
            onToggleSaved={toggleSaved}
            onOpenVenue={openDetail}
            onOpenBookSearch={openSavedBookSheet}
            bottomInsetForPills={savedViaResultsFlow}
            t={t}
          />
        )}
        {screen === 'bookings' && (
          <MyBookingsScreen
            bookings={bookings}
            loading={bookingsLoading}
            userId={userId}
            onBack={backFromSavedOrBookings}
            onCancel={handleCancelBooking}
            onRefreshBookings={loadBookings}
            t={t}
          />
        )}
        {screen === 'profile' && (
          <ProfileScreen
            dark={dark}
            userName={userName}
            userPhone={userPhone}
            onBack={backFromProfile}
            onSave={handleSaveProfile}
            onToggleDark={() => setDark(!dark)}
            onNavigate={handleNavigate}
            t={t}
          />
        )}
      </div>

      {showBottomNav && (
        <BottomNav
          screen={screen}
          onBook={goBookTab}
          onMaps={goMapsTab}
          onSaved={goSavedTab}
          onMyBookings={goMyBookingsTab}
          savedCount={savedSet.size}
          t={t}
        />
      )}

      {showResultsFlowPills && (
        <ResultsFlowPills
          context={resultsFlowContext}
          savedCount={savedSet.size}
          onPrimary={onResultsFlowPrimary}
          onSaved={openSavedFromResultsFlow}
          t={t}
        />
      )}

      {screen === 'saved' && (
        <SearchCriteriaSheet
          open={savedSearchOpen}
          onClose={closeSavedBookSheet}
          onApply={handleSavedBookConfirm}
          applying={savedSearchApplying}
          t={t}
          bookAtVenueName={savedBookVenue?.name ?? null}
          searchQuery={searchQuery}
          selectedDate={selectedDate}
          selectedDuration={selectedDuration}
          selectedTime={selectedTime}
          onSearchQueryChange={setSearchQuery}
          onDateChange={setSelectedDate}
          onDurationChange={setSelectedDuration}
          onTimeChange={setSelectedTime}
        />
      )}

      {detailVenue && (
        <VenueDetail
          venue={detailVenue}
          visible={detailVisible}
          initialJumpToBooking={detailJumpToConfirm}
          selectedSlots={selectedSlots}
          isSaved={savedSet.has(detailVenue.id)}
          searchDate={searchDate}
          selectedDateIndex={selectedDate}
          onAvailabilityDateChange={handleDetailAvailabilityDateChange}
          detailDateLoading={detailRefreshing}
          selectedTimeIndex={selectedTime}
          userId={userId}
          userName={userName}
          userPhone={userPhone}
          onClose={closeDetail}
          onToggleSlot={toggleSlot}
          onToggleSaved={toggleSaved}
          onBookingComplete={() => {
            if (userName || userPhone) {
              // Profile already saved
            }
          }}
          onViewBookings={() => {
            closeDetail();
            goMyBookingsTab();
          }}
          t={t}
        />
      )}
    </div>
  );
}
