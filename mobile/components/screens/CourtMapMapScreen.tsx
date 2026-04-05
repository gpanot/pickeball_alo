import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  FlatList,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  useWindowDimensions,
} from 'react-native';
import MapView, { Marker, UrlTile, Region, type MarkerPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import BookHomeTopBar from '@/components/search/BookHomeTopBar';
import MapsExploreSearch from '@/components/maps/MapsExploreSearch';
import ResultsSearchTopBar from '@/components/search/ResultsSearchTopBar';
import VenueCard from '@/components/venue/VenueCard';
import { LocateIcon } from '@/components/Icons';
import { formatPrice, mapPriceTierFromVnd, type MapPriceTier } from '@/lib/formatters';
import type { CourtMapMapScreenProps } from '@/components/screens/CourtMapMapScreen.props';
import type { VenueResult } from '@/lib/types';
import { ensureMapTileCacheDirectory, getMapTileCacheDirectory } from '@/lib/map-tile-cache';
import { CARTO_DARK_ALL_TILE_URL } from '@/lib/map-tiles';
import { mapDebug } from '@/lib/map-debug';

function mapPillPalette(tier: MapPriceTier): { bg: string; fg: string } {
  switch (tier) {
    case 0:
      return { bg: '#14b8a6', fg: '#042f2e' };
    case 1:
      return { bg: '#f59e0b', fg: '#422006' };
    default:
      return { bg: '#a855f7', fg: '#faf5ff' };
  }
}

const HCMC = { latitude: 10.79, longitude: 106.71 };

/** Match PWA Leaflet zoom: initial 12, user 15, venue focus 16, place 14 (`components/screens/MapScreen.tsx`). */
const ZOOM_LAT_DELTA: Record<12 | 14 | 15 | 16, number> = {
  12: 0.11,
  14: 0.028,
  15: 0.014,
  16: 0.007,
};

function regionAtZoom(lat: number, lng: number, z: 12 | 14 | 15 | 16): Region {
  const dLat = ZOOM_LAT_DELTA[z];
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const dLng = cosLat > 0.01 ? dLat / cosLat : dLat;
  return { latitude: lat, longitude: lng, latitudeDelta: dLat, longitudeDelta: dLng };
}

const USER_MARKER_ID = '__cm_user__';

/** Explore / geolocation venue fetch radius (center → edge). */
const INITIAL_NEAR_RADIUS_KM = 5;
/** Map framing when centering on the user (tighter than fetch radius; smaller = more zoomed in). */
const USER_MAP_VIEW_RADIUS_KM = 1.05;
const MAX_EXPLORE_RADIUS_KM = 120;

/** Haversine distance in km between two lat/lng points. */
function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)));
}

function radiusKmFromVisibleRegion(region: Region): number {
  const halfLatKm = (region.latitudeDelta / 2) * 111.32;
  const cos = Math.cos((region.latitude * Math.PI) / 180);
  const halfLngKm = ((region.longitudeDelta / 2) * 111.32) * Math.max(cos, 0.25);
  const visibleHalf = Math.max(halfLatKm, halfLngKm) * 1.15;
  if (visibleHalf <= INITIAL_NEAR_RADIUS_KM * 1.08) return INITIAL_NEAR_RADIUS_KM;
  return Math.min(
    MAX_EXPLORE_RADIUS_KM,
    Math.max(INITIAL_NEAR_RADIUS_KM, Math.ceil(visibleHalf)),
  );
}

/**
 * Single timer shared by all markers. On Android, markers need a brief `tracksViewChanges={true}`
 * window after any data change so Google Maps can bitmap the custom views.
 */
function useGlobalMarkerTrack(changeKey: string): boolean {
  const [track, setTrack] = useState(Platform.OS === 'android');
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    setTrack(true);
    const timer = setTimeout(() => setTrack(false), 600);
    return () => clearTimeout(timer);
  }, [changeKey]);
  return track;
}

/**
 * Region whose visible span ≈ `radiusKm` from centre to edge.
 * `latitudeDelta` is the *full* span, so multiply by 2 (not 2.2).
 */
function regionForKm(lat: number, lng: number, radiusKm: number): Region {
  const dLat = (radiusKm * 2) / 111.32;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const dLng = cosLat > 0.01 ? (radiusKm * 2) / (111.32 * cosLat) : dLat;
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: Math.max(dLat, 0.005),
    longitudeDelta: Math.max(dLng, 0.005),
  };
}

const PriceMarker = React.memo(function PriceMarker({
  venue,
  selected,
  accent,
  zIndex,
  trackChanges,
}: {
  venue: VenueResult;
  selected: boolean;
  accent: string;
  zIndex: number;
  trackChanges: boolean;
}) {
  const allSlots = venue.courts.flatMap((c) => c.slots);
  const allBooked = allSlots.length > 0 && allSlots.every((s) => s.isBooked);
  const tier = mapPriceTierFromVnd(venue.priceMin);
  const pal = allBooked ? { bg: '#3f3f46', fg: '#e4e4e7' } : mapPillPalette(tier);
  const label = formatPrice(venue.priceMin);
  const pinBorder = '#000000';

  return (
    <Marker
      identifier={venue.id}
      coordinate={{ latitude: venue.lat, longitude: venue.lng }}
      anchor={{ x: 0.5, y: 1 }}
      zIndex={zIndex}
      tracksViewChanges={trackChanges}
    >
      <View
        collapsable={false}
        style={[
          styles.pinOuter,
          {
            backgroundColor: pal.bg,
            borderWidth: 2,
            borderColor: selected ? accent : pinBorder,
            shadowColor: '#000',
            shadowOpacity: selected ? 0.6 : 0.35,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: selected ? 8 : 4,
          },
        ]}
      >
        <View style={styles.pinInner}>
          <Text style={[styles.pinText, { color: pal.fg }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </View>
    </Marker>
  );
});

const MapUserMarker = React.memo(function MapUserMarker({ lat, lng, trackChanges }: { lat: number; lng: number; trackChanges: boolean }) {
  return (
    <Marker
      identifier={USER_MARKER_ID}
      coordinate={{ latitude: lat, longitude: lng }}
      anchor={{ x: 0.5, y: 1 }}
      zIndex={2500}
      tracksViewChanges={trackChanges}
    >
      <View collapsable={false} style={styles.youPinWrap}>
        <View style={styles.youPinHead}>
          <View style={styles.youPinDot} />
        </View>
        <View style={styles.youPinTail} />
      </View>
    </Marker>
  );
});

export default function CourtMapMapScreen({
  venues,
  savedIds,
  sortBy,
  selectedDate,
  selectedDuration,
  selectedTime,
  searchQuery,
  onBack,
  onSort,
  onToggleSaved,
  onOpenVenue,
  onSearchQueryChange,
  onDateChange,
  onDurationChange,
  onTimeChange,
  onRefetchSearch,
  t,
  userAreaRadiusKm,
  hasFlowPills = true,
  bookHomeTopBar = false,
  catalogVenueCount,
  userName = '',
  onOpenProfile,
  exploreMapFetch,
  initialUserLoc,
  onUserLocResolved,
  geoInitDone,
  onGeoInitDone,
}: CourtMapMapScreenProps) {
  const { width: windowWidth } = useWindowDimensions();
  /** Left-aligned carousel: first card starts near the left; fixed right “peek” shows the next card. */
  const CAROUSEL_LEADING = 14;
  const CAROUSEL_TRAILING_PEEK = 56;
  const carouselItemGap = 12;
  const carouselCardWidth = Math.max(
    260,
    Math.round(windowWidth - CAROUSEL_LEADING - CAROUSEL_TRAILING_PEEK),
  );
  const carouselSnapStride = carouselCardWidth + carouselItemGap;

  const mapRef = useRef<MapView>(null);
  const carouselListRef = useRef<FlatList<VenueResult>>(null);
  const exploreMapFetchRef = useRef(exploreMapFetch);
  exploreMapFetchRef.current = exploreMapFetch;
  const bookHomeTopBarRef = useRef(bookHomeTopBar);
  bookHomeTopBarRef.current = bookHomeTopBar;
  const mountedAtMs = useRef(typeof performance !== 'undefined' ? performance.now() : Date.now());
  const exploreViewportEnabledRef = useRef(false);
  const regionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressViewportFetchUntilRef = useRef(0);
  const sortedVenuesRef = useRef<VenueResult[]>([]);
  const scrollCarouselToIdRef = useRef<string | null>(null);

  const venuesRef = useRef(venues);
  venuesRef.current = venues;
  /** Maps tab: bottom carousel dismissed by tapping the map. */
  const [mapCarouselDismissed, setMapCarouselDismissed] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(initialUserLoc ?? null);
  const [geoWorking, setGeoWorking] = useState(false);
  const preferUserCenterRef = useRef(false);
  const venuesSigRef = useRef('');

  const sortOrigin = useMemo(
    () => userLoc ?? { lat: HCMC.latitude, lng: HCMC.longitude },
    [userLoc],
  );

  const sortedVenues = useMemo(() => {
    if (venues.length === 0) return [];
    return [...venues].sort(
      (a, b) => haversineKm(sortOrigin, { lat: a.lat, lng: a.lng }) - haversineKm(sortOrigin, { lat: b.lat, lng: b.lng }),
    );
  }, [venues, sortOrigin]);

  sortedVenuesRef.current = sortedVenues;

  const selectedVenue = useMemo(
    () => sortedVenues.find((v) => v.id === selectedVenueId) ?? null,
    [sortedVenues, selectedVenueId],
  );

  const showMapCarousel =
    bookHomeTopBar && sortedVenues.length > 0 && selectedVenueId != null && !mapCarouselDismissed;

  const markerChangeKey = `${venues.length}:${selectedVenueId ?? ''}:${userLoc?.lat ?? ''}`;
  const globalTrack = useGlobalMarkerTrack(markerChangeKey);

  const initialRegion: Region = initialUserLoc
    ? regionForKm(initialUserLoc.lat, initialUserLoc.lng, USER_MAP_VIEW_RADIUS_KM)
    : regionAtZoom(HCMC.latitude, HCMC.longitude, 12);

  const mapTileCachePath = useMemo(() => getMapTileCacheDirectory() ?? undefined, []);

  useEffect(() => {
    void ensureMapTileCacheDirectory();
  }, []);

  const onMarkerPress = useCallback((e: MarkerPressEvent) => {
    const id = e.nativeEvent.id;
    if (!id || id === USER_MARKER_ID) return;
    const v = venuesRef.current.find((x) => x.id === id);
    if (!v) return;
    if (bookHomeTopBar) setMapCarouselDismissed(false);
    scrollCarouselToIdRef.current = id;
    setSelectedVenueId(id);
  }, [bookHomeTopBar]);

  const dismissCard = useCallback(() => {
    if (bookHomeTopBar) {
      setMapCarouselDismissed(true);
      setSelectedVenueId(null);
    } else if (selectedVenueId) {
      setSelectedVenueId(null);
    }
  }, [bookHomeTopBar, selectedVenueId]);

  useEffect(() => {
    if (!bookHomeTopBar) return;
    if (sortedVenues.length === 0) {
      setSelectedVenueId(null);
      return;
    }
    if (mapCarouselDismissed) return;
    setSelectedVenueId((prev) => {
      if (prev && sortedVenues.some((v) => v.id === prev)) return prev;
      return sortedVenues[0].id;
    });
  }, [sortedVenues, bookHomeTopBar, mapCarouselDismissed]);

  useEffect(() => {
    if (!showMapCarousel) return;
    const id = scrollCarouselToIdRef.current;
    if (!id || id !== selectedVenueId) return;
    scrollCarouselToIdRef.current = null;
    const idx = sortedVenues.findIndex((v) => v.id === id);
    if (idx < 0 || !carouselListRef.current) return;
    carouselListRef.current.scrollToOffset({
      offset: idx * carouselSnapStride,
      animated: true,
    });
  }, [selectedVenueId, showMapCarousel, sortedVenues, carouselSnapStride]);

  const onCarouselMomentumScrollEnd = useCallback(
    (ev: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = ev.nativeEvent.contentOffset.x;
      const idx = Math.round(x / carouselSnapStride);
      const clamped = Math.max(0, Math.min(idx, sortedVenues.length - 1));
      const v = sortedVenues[clamped];
      if (v) setSelectedVenueId(v.id);
    },
    [sortedVenues, carouselSnapStride],
  );

  const fitVenues = useCallback(() => {
    if (venues.length === 0 || !mapRef.current) return;
    mapRef.current.fitToCoordinates(
      venues.map((v) => ({ latitude: v.lat, longitude: v.lng })),
      { edgePadding: { top: 80, right: 40, bottom: 120, left: 40 }, animated: true },
    );
  }, [venues]);

  const applyUserView = useCallback(
    (lat: number, lng: number) => {
      if (!mapRef.current) return;
      if (userAreaRadiusKm != null && userAreaRadiusKm > 0) {
        mapRef.current.animateToRegion(regionForKm(lat, lng, userAreaRadiusKm), 400);
      } else {
        mapRef.current.animateToRegion(regionForKm(lat, lng, USER_MAP_VIEW_RADIUS_KM), 350);
      }
    },
    [userAreaRadiusKm],
  );

  const applyUserViewRef = useRef(applyUserView);
  applyUserViewRef.current = applyUserView;
  const fitVenuesRef = useRef(fitVenues);
  fitVenuesRef.current = fitVenues;

  const recenterOnUser = useCallback(async () => {
    setGeoWorking(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const last = await Location.getLastKnownPositionAsync();
      const pos = last ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      preferUserCenterRef.current = true;
      setUserLoc({ lat, lng });
      onUserLocResolved?.({ lat, lng });
      if (bookHomeTopBar) {
        setMapCarouselDismissed(false);
        setSelectedVenueId(null);
      }
      applyUserView(lat, lng);
    } finally {
      setGeoWorking(false);
    }
  }, [applyUserView, onUserLocResolved, bookHomeTopBar]);

  useEffect(() => {
    if (geoInitDone) return;
    let cancelled = false;
    void (async () => {
      setGeoWorking(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) {
          preferUserCenterRef.current = false;
          if (bookHomeTopBarRef.current && exploreMapFetchRef.current) {
            exploreMapFetchRef.current({
              lat: HCMC.latitude,
              lng: HCMC.longitude,
              radiusKm: INITIAL_NEAR_RADIUS_KM,
              reason: 'geolocation-denied',
            });
          }
          fitVenuesRef.current();
          return;
        }
        const last = await Location.getLastKnownPositionAsync();
        const pos = last ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        preferUserCenterRef.current = true;
        setUserLoc({ lat, lng });
        onUserLocResolved?.({ lat, lng });
        applyUserViewRef.current(lat, lng);
        if (bookHomeTopBarRef.current && exploreMapFetchRef.current) {
          exploreMapFetchRef.current({
            lat,
            lng,
            radiusKm: INITIAL_NEAR_RADIUS_KM,
            reason: 'geolocation',
          });
        }
      } catch {
        preferUserCenterRef.current = false;
        if (bookHomeTopBarRef.current && exploreMapFetchRef.current) {
          exploreMapFetchRef.current({
            lat: HCMC.latitude,
            lng: HCMC.longitude,
            radiusKm: INITIAL_NEAR_RADIUS_KM,
            reason: 'geolocation-error',
          });
        }
        fitVenuesRef.current();
      } finally {
        if (!cancelled) {
          setGeoWorking(false);
          onGeoInitDone?.();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!bookHomeTopBar || !exploreMapFetch) return;
    const t = setTimeout(() => {
      exploreViewportEnabledRef.current = true;
      mapDebug('viewport_fetch_enabled', { afterMs: 1500 });
    }, 1500);
    return () => clearTimeout(t);
  }, [bookHomeTopBar, exploreMapFetch]);

  useEffect(
    () => () => {
      if (regionDebounceRef.current) clearTimeout(regionDebounceRef.current);
    },
    [],
  );

  const onMapReady = useCallback(() => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    mapDebug('map_view_ready', { ms: Math.round(now - mountedAtMs.current) });
  }, []);

  const onRegionChangeComplete = useCallback(
    (region: Region) => {
      if (!exploreMapFetch || !bookHomeTopBar || !exploreViewportEnabledRef.current) return;
      if (Date.now() < suppressViewportFetchUntilRef.current) return;
      if (regionDebounceRef.current) clearTimeout(regionDebounceRef.current);
      regionDebounceRef.current = setTimeout(() => {
        const radiusKm = radiusKmFromVisibleRegion(region);
        exploreMapFetch({
          lat: region.latitude,
          lng: region.longitude,
          radiusKm,
          reason: 'viewport',
        });
      }, 500);
    },
    [exploreMapFetch, bookHomeTopBar],
  );

  useEffect(() => {
    const sig = venues.map((v) => v.id).join('\0');
    if (sig === venuesSigRef.current) return;
    venuesSigRef.current = sig;
    if (venues.length > 0 && !preferUserCenterRef.current) {
      fitVenues();
    }
  }, [venues, fitVenues]);

  const cardBottom = 8;
  const locateBottom =
    showMapCarousel || (!bookHomeTopBar && selectedVenue != null)
      ? cardBottom + 192
      : hasFlowPills
        ? 118
        : 88;

  const focusVenueFromExplore = useCallback((v: VenueResult) => {
    preferUserCenterRef.current = false;
    setMapCarouselDismissed(false);
    scrollCarouselToIdRef.current = v.id;
    setSelectedVenueId(v.id);
    suppressViewportFetchUntilRef.current = Date.now() + 2800;
    mapRef.current?.animateToRegion(regionAtZoom(v.lat, v.lng, 16), 350);
  }, []);

  const focusPlaceFromExplore = useCallback((lat: number, lng: number) => {
    preferUserCenterRef.current = false;
    setMapCarouselDismissed(true);
    setSelectedVenueId(null);
    suppressViewportFetchUntilRef.current = Date.now() + 2800;
    mapRef.current?.animateToRegion(regionAtZoom(lat, lng, 14), 350);
  }, []);

  const markers = useMemo(
    () =>
      venues.map((v) => (
        <PriceMarker
          key={v.id}
          venue={v}
          selected={selectedVenue?.id === v.id}
          accent={t.accent}
          zIndex={selectedVenue?.id === v.id ? 1200 : 1000}
          trackChanges={globalTrack}
        />
      )),
    [venues, selectedVenue?.id, t.accent, globalTrack],
  );

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      {bookHomeTopBar ? (
        <>
          <BookHomeTopBar
            variant="map"
            catalogVenueCount={catalogVenueCount}
            userName={userName}
            onOpenProfile={onOpenProfile ?? (() => {})}
            t={t}
          />
          <MapsExploreSearch
            venues={venues}
            t={t}
            onPickVenue={focusVenueFromExplore}
            onPickPlace={focusPlaceFromExplore}
          />
        </>
      ) : (
        <ResultsSearchTopBar
          variant="map"
          venuesCount={venues.length}
          sortBy={sortBy}
          selectedDate={selectedDate}
          selectedDuration={selectedDuration}
          selectedTime={selectedTime}
          searchQuery={searchQuery}
          onBack={onBack}
          onSort={onSort}
          onSearchQueryChange={onSearchQueryChange}
          onDateChange={onDateChange}
          onDurationChange={onDurationChange}
          onTimeChange={onTimeChange}
          onRefetchSearch={onRefetchSearch}
          t={t}
        />
      )}
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          mapType={Platform.OS === 'android' ? 'none' : 'standard'}
          loadingBackgroundColor="#0e0e0e"
          moveOnMarkerPress={false}
          onMapReady={onMapReady}
          onRegionChangeComplete={bookHomeTopBar && exploreMapFetch ? onRegionChangeComplete : undefined}
          onMarkerPress={onMarkerPress}
          onPress={dismissCard}
          poiClickEnabled={false}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          <UrlTile
            urlTemplate={CARTO_DARK_ALL_TILE_URL}
            maximumZ={19}
            flipY={false}
            shouldReplaceMapContent={Platform.OS === 'ios'}
            {...(mapTileCachePath ? { tileCachePath: mapTileCachePath } : {})}
          />
          {markers}
          {userLoc ? <MapUserMarker lat={userLoc.lat} lng={userLoc.lng} trackChanges={globalTrack} /> : null}
        </MapView>

        <Pressable
          accessibilityLabel="Re-center map on your location"
          disabled={geoWorking}
          onPress={recenterOnUser}
          style={[
            styles.locateBtn,
            {
              bottom: locateBottom,
              borderColor: '#3f3f46',
              backgroundColor: '#262626',
            },
          ]}
        >
          {geoWorking ? <ActivityIndicator /> : <LocateIcon size={22} color="#f4f4f5" />}
        </Pressable>

        {showMapCarousel ? (
          <View style={[styles.cardOverlay, { bottom: cardBottom }]} pointerEvents="box-none">
            <FlatList
              ref={carouselListRef}
              data={sortedVenues}
              keyExtractor={(v) => v.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={carouselSnapStride}
              snapToAlignment="start"
              disableIntervalMomentum
              contentContainerStyle={{
                paddingLeft: CAROUSEL_LEADING,
                paddingRight: CAROUSEL_TRAILING_PEEK,
                paddingVertical: 4,
              }}
              ItemSeparatorComponent={() => <View style={{ width: carouselItemGap }} />}
              getItemLayout={(_, index) => ({
                length: carouselSnapStride,
                offset: carouselSnapStride * index,
                index,
              })}
              onMomentumScrollEnd={onCarouselMomentumScrollEnd}
              renderItem={({ item }) => (
                <View style={{ width: carouselCardWidth }}>
                  <VenueCard
                    venue={item}
                    compact
                    isSaved={savedIds.has(item.id)}
                    onToggleSaved={onToggleSaved}
                    onPress={() => onOpenVenue(item)}
                    t={t}
                  />
                </View>
              )}
            />
          </View>
        ) : !bookHomeTopBar && selectedVenue ? (
          <View style={[styles.cardOverlay, { bottom: cardBottom }]} pointerEvents="box-none">
            <View onStartShouldSetResponder={() => true}>
              <VenueCard
                venue={selectedVenue}
                compact
                isSaved={savedIds.has(selectedVenue.id)}
                onToggleSaved={onToggleSaved}
                onPress={() => onOpenVenue(selectedVenue)}
                t={t}
              />
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mapWrap: { flex: 1, position: 'relative' },
  pinOuter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderBottomLeftRadius: 4,
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinInner: { transform: [{ rotate: '45deg' }], width: 28, alignItems: 'center' },
  pinText: { fontWeight: '800', fontSize: 9, textAlign: 'center' },
  youPinWrap: { alignItems: 'center', width: 28 },
  youPinHead: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4285F4',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 6,
  },
  youPinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  youPinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#4285F4',
    marginTop: -1,
  },
  locateBtn: {
    position: 'absolute',
    right: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5100,
  },
  cardOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 5100,
  },
});
