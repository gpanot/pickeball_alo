'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { enrichVenues } from '@/lib/enrichVenues';
import { esc } from '@/lib/escape';
import {
  filterAndSortVenues,
  type SortMode,
} from '@/lib/filterVenues';
import { LOC_DEFAULT_KM, DURATION_OPTIONS, PERIOD_LABELS, PERIOD_WINDOWS } from '@/lib/plannerConstants';
import type { PeriodKey } from '@/lib/plannerConstants';
import { makeMarkerIcon } from '@/lib/mapIcon';
import {
  formatSlotMin,
  getSlotsForPeriod,
  localYMD,
  syncSlotToValid,
} from '@/lib/timeSlots';
import { formatPrice, priceColor } from '@/lib/venuePrice';
import { venueCoversSlot } from '@/lib/hours';
import type { CourtRaw, Venue } from '@/lib/types';

function isMobileLayout(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 900px)').matches;
}

function centerMapOnUser(
  map: L.Map,
  lat: number,
  lng: number,
  radiusKm: number
) {
  const rM = radiusKm * 1000;
  const ring = L.circle([lat, lng], { radius: rM });
  map.fitBounds(ring.getBounds().pad(0.14));
  scheduleMapResize(map);
}

/** Leaflet invalidateSize touches the map container's classList; skip if map is torn down. */
function safeInvalidateSize(map: L.Map | null | undefined): void {
  if (!map) return;
  try {
    const el = map.getContainer?.();
    if (!el || !el.isConnected) return;
    map.invalidateSize(true);
  } catch {
    /* map or container already disposed */
  }
}

function scheduleMapResize(map: L.Map | null) {
  if (!map) return;
  requestAnimationFrame(() => safeInvalidateSize(map));
  setTimeout(() => safeInvalidateSize(map), 280);
}

function fitMapToAllVenuesIfNoUser(map: L.Map, venues: Venue[]) {
  const pts = venues.filter((v) => v.coords).map((v) => v.coords!);
  if (pts.length) {
    const bounds = L.latLngBounds(
      pts.map((c) => L.latLng(c[0], c[1]))
    );
    map.fitBounds(bounds, { padding: [30, 30] });
  }
  scheduleMapResize(map);
}

export default function CourtMapShell() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<number, L.Marker>>({});
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const [mobileView, setMobileView] = useState<'map' | 'list' | 'book'>('map');
  const [detailOpen, setDetailOpen] = useState(false);

  const [allVenues, setAllVenues] = useState<Venue[]>([]);
  const [courtsDataReady, setCourtsDataReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [dateISO, setDateISO] = useState(() => localYMD(new Date()));
  const [durationMin, setDurationMin] = useState(90);
  const [period, setPeriod] = useState<PeriodKey>('morning');
  const [slotStartMin, setSlotStartMin] = useState<number | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [sortMode, setSortMode] = useState<SortMode>('cheap_nearby');
  const [strictHours, setStrictHours] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [geoStatus, setGeoStatus] = useState('');
  const [showGeoClear, setShowGeoClear] = useState(false);

  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [detailVenue, setDetailVenue] = useState<Venue | null>(null);

  const slots = useMemo(
    () => getSlotsForPeriod(period, durationMin),
    [period, durationMin]
  );

  useEffect(() => {
    const next = syncSlotToValid(period, durationMin, slotStartMin);
    if (next !== slotStartMin) setSlotStartMin(next);
  }, [period, durationMin, slotStartMin]);

  const filteredVenues = useMemo(() => {
    if (!courtsDataReady) return [];
    return filterAndSortVenues(allVenues, {
      query: searchQuery,
      sortMode,
      strictHours,
      userLat,
      userLng,
      radiusKm,
      slotStartMin: slotStartMin ?? 0,
      durationMin,
    });
  }, [
    allVenues,
    courtsDataReady,
    searchQuery,
    sortMode,
    strictHours,
    userLat,
    userLng,
    radiusKm,
    slotStartMin,
    durationMin,
  ]);

  const sortHintVisible =
    sortMode === 'cheap_nearby' && (userLat == null || userLng == null);

  const showSearchActions = searchQuery.trim().length > 0;

  useEffect(() => {
    fetch('/courts.json', { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data: CourtRaw | CourtRaw[]) => {
        const arr = Array.isArray(data) ? data : [data];
        setAllVenues(enrichVenues(arr));
        setCourtsDataReady(true);
        setLoadError(false);
      })
      .catch(() => {
        setLoadError(true);
        setCourtsDataReady(true);
      });
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([10.776, 106.7], 12);
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; CartoDB',
        maxZoom: 19,
      }
    ).addTo(map);
    mapRef.current = map;
    setMapReady(true);
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      userMarkerRef.current = null;
      setMapReady(false);
    };
  }, []);

  const setUserOnMap = useCallback((lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;
    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
    userMarkerRef.current = L.circleMarker([lat, lng], {
      radius: 9,
      color: '#C8F135',
      weight: 2,
      fillColor: '#C8F135',
      fillOpacity: 0.35,
    }).addTo(map);
  }, []);

  const applyLocationFromCoords = useCallback(
    (lat: number, lng: number, setDefaultRadius?: boolean) => {
      const km = setDefaultRadius ? LOC_DEFAULT_KM : radiusKm;
      setUserLat(lat);
      setUserLng(lng);
      if (setDefaultRadius) setRadiusKm(LOC_DEFAULT_KM);
      setUserOnMap(lat, lng);
      const map = mapRef.current;
      if (map) centerMapOnUser(map, lat, lng, km);
      setShowGeoClear(true);
    },
    [setUserOnMap, radiusKm]
  );

  const geoRestoreDoneRef = useRef(false);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
  }, []);

  const selectVenue = useCallback((id: number) => {
    const venue = allVenues.find((v) => v.id === id);
    if (!venue) return;
    setActiveCardId(id);
    const map = mapRef.current;
    if (venue.coords && markersRef.current[id] && map) {
      map.panTo(venue.coords);
      markersRef.current[id].openPopup();
    }
    setDetailVenue(venue);
    setDetailOpen(true);
  }, [allVenues]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    Object.values(markersRef.current).forEach((m) => map.removeLayer(m));
    markersRef.current = {};

    filteredVenues.forEach((v) => {
      if (!v.coords) return;
      const color = priceColor(v.minPrice);
      const marker = L.marker(v.coords, {
        icon: makeMarkerIcon(color),
      }).addTo(map);
      marker.bindPopup(`
      <div style="font-family:monospace;font-size:12px;min-width:180px">
        <b>${esc(v.name || 'Venue')}</b><br>
        <span style="color:#999;font-size:10px">${esc(v.address || '')}</span><br>
        ${v.minPrice ? `<span style="color:${color};font-weight:bold">From ${formatPrice(v.minPrice)}/hr</span>` : ''}
        ${(v.promotions || []).length ? `<br><span style="color:#FF5B1F;font-size:10px">${esc((v.promotions || [])[0])}</span>` : ''}
        <br><a href="${esc(v.url || '#')}" target="_blank" style="color:#C8F135;font-size:10px">Book now</a>
      </div>
    `);
      marker.on('click', () => selectVenue(v.id));
      markersRef.current[v.id] = marker;
    });
  }, [filteredVenues, mapReady, selectVenue]);

  useEffect(() => {
    if (!courtsDataReady || allVenues.length === 0 || geoRestoreDoneRef.current)
      return;
    geoRestoreDoneRef.current = true;
    const t = setTimeout(() => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        const map = mapRef.current;
        if (map) fitMapToAllVenuesIfNoUser(map, allVenues);
        return;
      }
      const opts = {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 300000,
      } as const;
      const ok = (pos: GeolocationPosition) => {
        applyLocationFromCoords(pos.coords.latitude, pos.coords.longitude, true);
        setGeoStatus(`Near me · ${LOC_DEFAULT_KM} km`);
        setShowGeoClear(true);
        scheduleMapResize(mapRef.current);
      };
      const fail = () => {
        const map = mapRef.current;
        if (map) fitMapToAllVenuesIfNoUser(map, allVenues);
      };
      if (navigator.permissions?.query) {
        navigator.permissions
          .query({ name: 'geolocation' })
          .then((p) => {
            if (p.state === 'denied') fail();
            else navigator.geolocation.getCurrentPosition(ok, fail, opts);
          })
          .catch(() =>
            navigator.geolocation.getCurrentPosition(ok, fail, opts)
          );
      } else {
        navigator.geolocation.getCurrentPosition(ok, fail, opts);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [courtsDataReady, allVenues, applyLocationFromCoords]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onResize = () => scheduleMapResize(map);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', () =>
      setTimeout(() => scheduleMapResize(map), 400)
    );
    return () => window.removeEventListener('resize', onResize);
  }, [mapReady]);

  useEffect(() => {
    if (mapRef.current) scheduleMapResize(mapRef.current);
  }, [mobileView, mapReady]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const requestGeolocation = (setDefaultRadius?: boolean) => {
    if (!navigator.geolocation) {
      setGeoStatus('Geolocation not supported');
      return;
    }
    setGeoStatus('Locating…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          localStorage.setItem('courtmap-geo-used', '1');
        } catch {
          /* ignore */
        }
        applyLocationFromCoords(
          pos.coords.latitude,
          pos.coords.longitude,
          !!setDefaultRadius
        );
        setGeoStatus(`Near me · ${setDefaultRadius ? LOC_DEFAULT_KM : radiusKm} km`);
        setShowGeoClear(true);
        scheduleMapResize(mapRef.current);
      },
      () => setGeoStatus('Location denied or unavailable'),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: setDefaultRadius ? 0 : 60000,
      }
    );
  };

  const clearUserLocation = () => {
    setUserLat(null);
    setUserLng(null);
    const map = mapRef.current;
    if (userMarkerRef.current && map) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
    setGeoStatus('');
    setShowGeoClear(false);
    if (map) fitMapToAllVenuesIfNoUser(map, allVenues);
  };

  const switchMobileTab = (view: 'map' | 'list' | 'book') => {
    if (!isMobileLayout()) return;
    if (view === 'list') {
      /* map search already synced via shared state */
    }
    setMobileView(view);
    if (view === 'map') scheduleMapResize(mapRef.current);
  };

  const onSortChange = (v: SortMode) => {
    setSortMode(v);
  };

  const dateButtons = useMemo(() => {
    const out: { iso: string; label: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const iso = localYMD(d);
      const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
      const md = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      out.push({ iso, label: `${dayName} ${md}` });
    }
    return out;
  }, [today]);

  useEffect(() => {
    if (activeCardId == null) return;
    document
      .getElementById(`card-${activeCardId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeCardId]);

  const detailHtml = useMemo(() => {
    if (!detailVenue) return '';
    const venue = detailVenue;
    const metaParts: string[] = [];
    if (venue.hours) metaParts.push(`🕐 ${venue.hours}`);
    if (venue.phone) metaParts.push(`📞 ${venue.phone}`);
    if (venue.rating != null)
      metaParts.push(`⭐ ${venue.rating} (${venue.ratingCount ?? ''})`);
    if (venue.hasVoucher) metaParts.push('🎟️ Voucher');
    const metaHtml = metaParts.length
      ? `<div style="font-size:10px;color:var(--muted);margin-bottom:10px">${metaParts.join(' &nbsp;·&nbsp; ')}</div>`
      : '';

    let tablesHtml = '';
    if (venue.pricing_tables?.length) {
      venue.pricing_tables.forEach((table, idx) => {
        if (!table?.length) return;
        const tableName =
          (venue.pricing_table_names && venue.pricing_table_names[idx]) || '';
        const headers = table[0];
        const rows = table.slice(1);
        tablesHtml += `
        ${tableName ? `<div style="font-size:11px;font-weight:700;color:var(--acid);margin:8px 0 4px;font-family:'Syne',sans-serif">${esc(tableName)}</div>` : ''}
        <table class="pricing-table">
          <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>`;
      });
    } else if (venue.flat_prices?.length) {
      tablesHtml = venue.flat_prices
        .map((p) => `<div style="font-size:11px;color:#aaa;margin-bottom:4px">${esc(p)}</div>`)
        .join('');
    } else {
      tablesHtml =
        '<div style="font-size:11px;color:#555">No pricing data extracted. Click BOOK to view on site.</div>';
    }

    const promos = (venue.promotions || [])
      .map(
        (p) =>
          `<div style="font-size:10px;color:var(--orange);margin-top:4px">🎁 ${esc(p)}</div>`
      )
      .join('');

    const planHint =
      dateISO != null && slotStartMin != null
        ? `<div style="font-size:10px;color:var(--acid);margin-bottom:8px;opacity:0.9">Plan: ${esc(dateISO)} · start ${formatSlotMin(slotStartMin)} · ${durationMin} min (static data — confirm on site)</div>`
        : '';

    return `
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;gap:12px">
      <div style="min-width:0">
        <div class="detail-title">${esc(venue.name || 'Venue')}</div>
        <div class="detail-addr">${esc(venue.address || 'Address not found')}</div>
      </div>
      <a href="${esc(venue.url || '#')}" target="_blank" rel="noopener" style="
        background:var(--acid);color:var(--dark);padding:10px 18px;
        font-family:monospace;font-size:11px;font-weight:700;text-decoration:none;
        flex-shrink:0;border-radius:999px;white-space:nowrap;touch-action:manipulation
      ">BOOK</a>
    </div>
    ${planHint}
    ${metaHtml}
    ${tablesHtml}
    ${promos}
  `;
  }, [detailVenue, dateISO, slotStartMin, durationMin]);

  useEffect(() => {
    if (detailOpen && mapRef.current) scheduleMapResize(mapRef.current);
  }, [detailOpen, detailHtml]);

  const rootClass = `courtmap-root view-${mobileView}${detailOpen && isMobileLayout() ? ' detail-open' : ''}`;

  const sortOptions = (
    <>
      <option value="name">A-Z</option>
      <option value="price_asc">Price low</option>
      <option value="price_desc">Price high</option>
      <option value="distance_asc">Nearest</option>
      <option value="cheap_nearby">Cheapest nearby</option>
    </>
  );

  return (
    <div className={rootClass}>
      <header className="site-header">
        <div className="header-top-row">
          <div className="header-brand">
            <div className="logo">
              COURT<span>MAP</span>
            </div>
            <div className="header-tagline">Pickleball courts · Vietnam</div>
          </div>
          <div className="header-stats">
            <div>
              VENUES{' '}
              <span className="stat-val">{allVenues.length}</span>
            </div>
            <div>
              SHOWN{' '}
              <span className="stat-val">{filteredVenues.length}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="main">
        <div className="map-area">
          <div id="map" ref={mapContainerRef} />
          <div
            className="map-top-stack"
            id="mapTopStack"
            aria-label="Search and sort on map"
          >
            <div className="map-explore-bar">
              <label className="sr-only" htmlFor="searchInputMap">
                Search venues
              </label>
              <input
                type="search"
                id="searchInputMap"
                placeholder="Search name or area…"
                autoComplete="off"
                enterKeyHint="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="map-sort-bar" id="mapSortBar" aria-label="Map filters">
              <div
                id="sortHintMap"
                className={`sort-hint${sortHintVisible ? ' is-visible' : ''}`}
              >
                Enable location to sort by distance.
              </div>
              <select
                id="sortSelectMap"
                className="sort-select"
                aria-label="Sort venues"
                value={sortMode}
                onChange={(e) => onSortChange(e.target.value as SortMode)}
              >
                {sortOptions}
              </select>
            </div>
          </div>
          <button
            type="button"
            className="locate-fab"
            id="locateFab"
            aria-label="Center map on my location"
            title="My location"
            onClick={() => requestGeolocation(userLat == null)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"
              />
            </svg>
          </button>
          <div
            className="detail-backdrop"
            id="detailBackdrop"
            aria-hidden="true"
            onClick={closeDetail}
          />
          <div
            className={`detail-panel${detailOpen ? ' open' : ''}`}
            id="detailPanel"
          >
            <div className="detail-panel-top">
              <button
                type="button"
                className="detail-close"
                id="detailClose"
                aria-label="Close details"
                onClick={closeDetail}
              >
                &times;
              </button>
            </div>
            <div
              className="detail-panel-body"
              id="detailPanelBody"
              dangerouslySetInnerHTML={
                detailVenue ? { __html: detailHtml } : undefined
              }
            />
          </div>
        </div>

        <div className="sidebar">
          <div className="sheet-handle-wrap" aria-hidden="true">
            <div className="sheet-handle" />
          </div>
          <p className="book-tab-intro">
            Pick date, duration, time, and location — then use{' '}
            <strong>List</strong> or <strong>Map</strong> to see courts that
            match.
          </p>
          <div className="planner" id="planner">
            <div className="planner-section">
              <div className="planner-label">When</div>
              <div className="chip-row scroll-x" role="list">
                {dateButtons.map(({ iso, label }) => (
                  <button
                    key={iso}
                    type="button"
                    className={`chip${iso === dateISO ? ' active' : ''}`}
                    data-date={iso}
                    title={iso}
                    onClick={() => setDateISO(iso)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="planner-section">
              <div className="planner-label">How long</div>
              <div className="chip-row" id="durationChips">
                {DURATION_OPTIONS.map((o) => (
                  <button
                    key={o.min}
                    type="button"
                    className={`chip${o.min === durationMin ? ' active' : ''}`}
                    onClick={() => setDurationMin(o.min)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="planner-section">
              <div className="planner-label">Time of day</div>
              <div className="chip-row wrap" id="periodChips">
                {(Object.keys(PERIOD_WINDOWS) as PeriodKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`chip${key === period ? ' active' : ''}`}
                    onClick={() => setPeriod(key)}
                  >
                    {PERIOD_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>
            <div className="planner-section">
              <div className="planner-label">Start time</div>
              <div className="chip-row" id="slotChips">
                {!slots.length ? (
                  <span
                    style={{
                      fontSize: 9,
                      color: 'var(--muted)',
                    }}
                  >
                    No slot fits this duration in this window.
                  </span>
                ) : (
                  slots.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`chip${m === slotStartMin ? ' active' : ''}`}
                      onClick={() => setSlotStartMin(m)}
                    >
                      {formatSlotMin(m)}
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="planner-section">
              <div className="planner-label">Near me</div>
              <button
                type="button"
                className="geo-btn"
                id="geoBtn"
                onClick={() => requestGeolocation(userLat == null)}
              >
                Use my location
              </button>
              {showGeoClear ? (
                <span
                  className="geo-clear"
                  id="geoClear"
                  role="button"
                  tabIndex={0}
                  onClick={clearUserLocation}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ')
                      clearUserLocation();
                  }}
                >
                  Clear location
                </span>
              ) : null}
              <div className="geo-status" id="geoStatus">
                {geoStatus}
              </div>
              <label className="range-label">
                Radius <span id="radiusLabel">{radiusKm}</span> km
              </label>
              <input
                type="range"
                id="radiusSlider"
                min={1}
                max={10}
                value={radiusKm}
                step={1}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setRadiusKm(v);
                  if (userLat != null && userLng != null && mapRef.current) {
                    centerMapOnUser(mapRef.current, userLat, userLng, v);
                  }
                }}
              />
            </div>
            <label className="toggle-row">
              <input
                type="checkbox"
                id="strictHours"
                checked={strictHours}
                onChange={(e) => setStrictHours(e.target.checked)}
              />
              <span>Only venues open at this time</span>
            </label>
          </div>

          <div className="search-bar">
            <input
              type="search"
              id="searchInput"
              placeholder="Search name or area…"
              autoComplete="off"
              enterKeyHint="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              id="sortSelect"
              className="sort-select sort-select-desktop"
              aria-label="Sort venues"
              value={sortMode}
              onChange={(e) => onSortChange(e.target.value as SortMode)}
            >
              <option value="name">A-Z</option>
              <option value="price_asc">Price low</option>
              <option value="price_desc">Price high</option>
              <option value="distance_asc">Nearest</option>
              <option value="cheap_nearby">Cheapest nearby</option>
            </select>
          </div>
          <div
            id="sortHintDesktop"
            className={`sort-hint sort-hint-desktop${sortHintVisible ? ' is-visible' : ''}`}
          >
            Enable location to sort by distance.
          </div>
          <div className="list-controls-bar" id="listControlsBar">
            <div
              id="sortHintList"
              className={`sort-hint${sortHintVisible ? ' is-visible' : ''}`}
            >
              Enable location to sort by distance.
            </div>
            <select
              id="sortSelectList"
              className="sort-select"
              aria-label="Sort venues"
              value={sortMode}
              onChange={(e) => onSortChange(e.target.value as SortMode)}
            >
              {sortOptions}
            </select>
            <div
              className="search-actions"
              id="searchActionsRow"
              style={{ display: showSearchActions ? 'flex' : 'none' }}
            >
              <button
                type="button"
                className="text-btn"
                id="editSearchBtn"
                onClick={() => switchMobileTab('book')}
              >
                Edit booking
              </button>
              <button
                type="button"
                className="text-btn muted"
                id="clearSearchBtn"
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </button>
            </div>
          </div>
          <div className="venue-list" id="venueList" aria-live="polite">
            {loadError ? (
              <div className="empty-state">
                <div className="empty-icon">⚠️</div>
                <div>
                  Data unavailable. Check connection or redeploy with
                  courts.json.
                </div>
              </div>
            ) : !filteredVenues.length ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <div>No venues match</div>
              </div>
            ) : (
              filteredVenues.map((v) => {
                const hoursFit = venueCoversSlot(
                  v,
                  slotStartMin ?? 0,
                  durationMin
                );
                const dim = hoursFit === false;
                const cardClass =
                  dim ? 'venue-card hours-dim' : 'venue-card';
                const hasUser = userLat != null && userLng != null;
                return (
                  <div
                    key={v.id}
                    className={`${cardClass}${activeCardId === v.id ? ' active' : ''}`}
                    id={`card-${v.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectVenue(v.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ')
                        selectVenue(v.id);
                    }}
                  >
                    <a
                      className="venue-link"
                      href={v.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      BOOK
                    </a>
                    <div className="venue-name">{v.name || 'Unnamed Venue'}</div>
                    <div className="venue-address">
                      {v.address || 'Address unknown'}
                    </div>
                    <div className="price-badges">
                      {v.minPrice ? (
                        <span className="badge badge-price">
                          from {formatPrice(v.minPrice)}
                        </span>
                      ) : null}
                      {hasUser && v._distanceKm != null ? (
                        <span className="badge badge-dist">
                          {v._distanceKm.toFixed(1)} km
                        </span>
                      ) : null}
                      {hoursFit === false ? (
                        <span className="badge badge-warn">
                          outside listed hours
                        </span>
                      ) : null}
                      {(v.promotions || []).length ? (
                        <span className="badge badge-promo">PROMO</span>
                      ) : null}
                      {!v.coords ? (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            color: '#555',
                            border: '1px solid #333',
                          }}
                        >
                          no GPS
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <nav className="mobile-tabbar" aria-label="Switch view">
          <button
            type="button"
            className={`mobile-tab${mobileView === 'map' ? ' active' : ''}`}
            id="tabMap"
            data-view="map"
            onClick={() => switchMobileTab('map')}
          >
            <span className="mobile-tab-inner">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              <span className="mobile-tab-label">Map</span>
            </span>
          </button>
          <button
            type="button"
            className={`mobile-tab${mobileView === 'book' ? ' active' : ''}`}
            id="tabBook"
            data-view="book"
            onClick={() => switchMobileTab('book')}
          >
            <span className="mobile-tab-inner">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <span className="mobile-tab-label">Book</span>
            </span>
          </button>
          <button
            type="button"
            className={`mobile-tab${mobileView === 'list' ? ' active' : ''}`}
            id="tabList"
            data-view="list"
            onClick={() => switchMobileTab('list')}
          >
            <span className="mobile-tab-inner">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M4 6h16M4 12h16M4 18h10" />
              </svg>
              <span className="mobile-tab-label">List</span>
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
}
