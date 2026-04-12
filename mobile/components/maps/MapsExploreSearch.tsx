import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Keyboard, type TextInput as TI } from 'react-native';
import { PinIcon } from '@/components/Icons';
import type { ThemeTokens } from '@/lib/theme';
import type { VenueResult } from '@/lib/types';
import { suggestMapPlaces } from '@/lib/map-places-suggest';

interface MapsExploreSearchProps {
  venues: VenueResult[];
  t: ThemeTokens;
  onPickVenue: (v: VenueResult) => void;
  onPickPlace: (lat: number, lng: number) => void;
  /** Keeps parent search state in sync while typing (e.g. Book tab + SEARCH COURTS). */
  onQueryChange?: (q: string) => void;
  /** Pill next to the search field (Book ↔ Map). */
  bookMapToggleLabel?: 'Map' | 'Book';
  onBookMapToggle?: () => void;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export default function MapsExploreSearch({
  venues,
  t,
  onPickVenue,
  onPickPlace,
  onQueryChange,
  bookMapToggleLabel,
  onBookMapToggle,
}: MapsExploreSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placeHits, setPlaceHits] = useState<Array<{ displayName: string; lat: number; lng: number }>>(
    [],
  );
  const inputRef = useRef<TI>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const venueHits = useMemo(() => {
    const n = normalize(query);
    if (n.length < 1) return [];
    return venues
      .filter((v) => normalize(v.name).includes(n) || normalize(v.address).includes(n))
      .slice(0, 8);
  }, [venues, query]);

  useEffect(() => {
    const n = query.trim();
    if (n.length < 2) {
      setPlaceHits([]);
      setPlacesLoading(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const id = ++requestIdRef.current;
      setPlacesLoading(true);
      void suggestMapPlaces(n).then((rows) => {
        if (requestIdRef.current !== id) return;
        setPlaceHits(rows);
        setPlacesLoading(false);
      });
    }, 320);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const showPanel = open && (venueHits.length > 0 || placeHits.length > 0 || placesLoading);

  const handleVenuePick = useCallback(
    (v: VenueResult) => {
      onPickVenue(v);
      setQuery(v.name);
      onQueryChange?.(v.name);
      setOpen(false);
      setPlaceHits([]);
      Keyboard.dismiss();
    },
    [onPickVenue, onQueryChange],
  );

  const handlePlacePick = useCallback(
    (lat: number, lng: number, label: string) => {
      onPickPlace(lat, lng);
      setQuery(label);
      onQueryChange?.(label);
      setOpen(false);
      setPlaceHits([]);
      Keyboard.dismiss();
    },
    [onPickPlace, onQueryChange],
  );

  const barBg = '#121212';

  const showToggle = Boolean(bookMapToggleLabel && onBookMapToggle);

  return (
    <View style={[styles.wrap, { backgroundColor: t.bg, borderBottomColor: t.border }]}>
      <View style={styles.searchRow}>
        <Pressable
          style={[styles.bar, { backgroundColor: barBg, borderColor: t.border }]}
          onPress={() => inputRef.current?.focus()}
        >
          <PinIcon color={t.accent} size={20} />
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: t.text }]}
            value={query}
            onChangeText={(q) => {
              setQuery(q);
              setOpen(true);
              onQueryChange?.(q);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search area or venue name..."
            placeholderTextColor={t.textMuted}
            autoCorrect={false}
          />
        </Pressable>
        {showToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={bookMapToggleLabel === 'Map' ? 'Open map' : 'Back to book'}
            onPress={onBookMapToggle}
            style={[styles.togglePill, { backgroundColor: t.accent }]}
          >
            <Text style={styles.togglePillText}>{bookMapToggleLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      {showPanel && (
        <View
          style={[
            styles.panel,
            { backgroundColor: t.bgCard, borderColor: t.border },
          ]}
        >
          {venueHits.length > 0 && (
            <>
              <Text style={[styles.section, { color: t.textMuted }]}>VENUES</Text>
              {venueHits.map((v) => (
                <Pressable
                  key={v.id}
                  onPress={() => handleVenuePick(v)}
                  style={[styles.row, { borderTopColor: t.border }]}
                >
                  <Text style={[styles.rowTitle, { color: t.text }]}>{v.name}</Text>
                  <Text style={[styles.rowSub, { color: t.textSec }]}>{v.address}</Text>
                </Pressable>
              ))}
            </>
          )}
          {(placesLoading || placeHits.length > 0) && (
            <>
              <Text style={[styles.section, { color: t.textMuted }]}>PLACES</Text>
              {placesLoading && placeHits.length === 0 && (
                <Text style={{ padding: 12, color: t.textSec }}>Searching…</Text>
              )}
              {placeHits.map((p, i) => (
                <Pressable
                  key={`${p.lat},${p.lng},${i}`}
                  onPress={() => handlePlacePick(p.lat, p.lng, p.displayName)}
                  style={[styles.row, { borderTopColor: t.border }]}
                >
                  <Text style={{ color: t.text, fontSize: 14 }}>{p.displayName}</Text>
                </Pressable>
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  togglePill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    justifyContent: 'center',
  },
  togglePillText: { color: '#000', fontWeight: '800', fontSize: 14, letterSpacing: 0.4 },
  input: { flex: 1, fontSize: 15, padding: 0 },
  panel: {
    marginTop: 8,
    maxHeight: 320,
    borderRadius: 12,
    borderWidth: 1,
  },
  section: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  row: { paddingVertical: 10, paddingHorizontal: 14, borderTopWidth: 1 },
  rowTitle: { fontWeight: '600', fontSize: 14 },
  rowSub: { fontSize: 12, marginTop: 2 },
});
