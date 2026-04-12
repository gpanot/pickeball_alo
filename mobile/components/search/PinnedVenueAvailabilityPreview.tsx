import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { getAloboSlots, getVenue } from '@/mobile/lib/api';
import { DURATIONS, START_HOUR_OPTIONS, durationIndexToHalfHourCount, formatPrice } from '@/mobile/lib/formatters';
import type { ThemeTokens } from '@/mobile/lib/theme';
import type { VenueResult } from '@/mobile/lib/types';

function parseHmToMinutes(value: string): number | null {
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
  return h * 60 + mm;
}

type QuickSlotStatus = {
  index: number;
  label: string;
  available: boolean;
  pricePerHour: number | null;
  startTime: string | null;
  totalPrice: number | null;
  slots: { courtName: string; time: string; duration: number; price: number }[];
};

function buildQuickStatuses(
  venue: VenueResult,
  selectedDuration: number,
  aloboBookedKeys: Set<string>,
): QuickSlotStatus[] {
  const use30 = venue.use30MinSlots !== false;
  const halfHourCount = durationIndexToHalfHourCount(selectedDuration);
  const step = use30 ? 30 : 60;
  const runLen = use30 ? halfHourCount : Math.max(1, Math.round(halfHourCount / 2));

  const statuses: QuickSlotStatus[] = [];
  for (let i = 0; i < START_HOUR_OPTIONS.length; i += 1) {
    const opt = START_HOUR_OPTIONS[i]!;
    const base = opt.hour === 0 ? 0 : opt.hour * 60;
    const candidateStarts = [base];
    let best: {
      perHour: number;
      totalPrice: number;
      startTime: string;
      slots: { courtName: string; time: string; duration: number; price: number }[];
    } | null = null;

    for (const court of venue.courts) {
      const byMinute = new Map<
        number,
        { time: string; price: number; courtName: string; duration: number }
      >();
      for (const s of court.slots) {
        const key = `${court.name}|${s.time}`;
        if (s.isBooked || aloboBookedKeys.has(key)) continue;
        const slotMin = parseHmToMinutes(s.time);
        if (slotMin == null) continue;
        byMinute.set(slotMin, {
          time: s.time,
          price: s.price,
          courtName: court.name,
          duration: use30 ? 30 : 60,
        });
      }

      for (const start of candidateStarts) {
        const run: { time: string; price: number; courtName: string; duration: number }[] = [];
        let ok = true;
        for (let k = 0; k < runLen; k += 1) {
          const minute = start + (k * step);
          const slot = byMinute.get(minute);
          if (!slot) {
            ok = false;
            break;
          }
          run.push(slot);
        }
        if (!ok || run.length === 0) continue;

        const total = run.reduce((sum, s) => sum + s.price, 0);
        const durationHours = (runLen * step) / 60;
        const perHour = durationHours > 0 ? Math.round(total / durationHours) : null;
        if (perHour == null) continue;
        if (
          best == null ||
          perHour < best.perHour ||
          (perHour === best.perHour && total < best.totalPrice)
        ) {
          best = {
            perHour,
            totalPrice: total,
            startTime: run[0]!.time,
            slots: run.map((s) => ({
              courtName: s.courtName,
              time: s.time,
              duration: s.duration,
              price: s.price,
            })),
          };
        }
      }
    }

    statuses.push({
      index: i,
      label: opt.label,
      available: best != null,
      pricePerHour: best?.perHour ?? null,
      startTime: best?.startTime ?? null,
      totalPrice: best?.totalPrice ?? null,
      slots: best?.slots ?? [],
    });
  }

  return statuses;
}

export interface QuickPinnedVenueSelection {
  venue: VenueResult;
  startLabel: string;
  startTime: string;
  pricePerHour: number;
  totalPrice: number;
  slots: { courtName: string; time: string; duration: number; price: number }[];
}

export default function PinnedVenueAvailabilityPreview({
  venueId,
  searchDate,
  selectedTime,
  selectedDuration,
  t,
  onSelectionChange,
  onReady,
}: {
  venueId: string;
  searchDate: string;
  selectedTime: number;
  selectedDuration: number;
  t: ThemeTokens;
  onSelectionChange?: (selection: QuickPinnedVenueSelection | null) => void;
  onReady?: () => void;
}) {
  const [venue, setVenue] = useState<VenueResult | null>(null);
  const [aloboBookedKeys, setAloboBookedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [selectedChipIndex, setSelectedChipIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([getVenue(venueId, searchDate), getAloboSlots(venueId, searchDate)])
      .then(([v, alobo]) => {
        if (cancelled) return;
        setVenue(v);
        if (alobo.supported && Array.isArray(alobo.bookedKeys)) {
          setAloboBookedKeys(new Set(alobo.bookedKeys));
        } else {
          setAloboBookedKeys(new Set());
        }
      })
      .catch(() => {
        if (cancelled) return;
        setVenue(null);
        setAloboBookedKeys(new Set());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [venueId, searchDate]);

  const computed = useMemo(() => {
    if (!venue) return null;
    const statuses = buildQuickStatuses(venue, selectedDuration, aloboBookedKeys);
    const requested =
      statuses.find((s) => s.index === selectedTime) ??
      statuses[Math.min(selectedTime, statuses.length - 1)] ??
      null;
    const later = statuses.filter((s) => s.index > selectedTime);
    const laterAvail = later.filter((s) => s.available);

    const chips: QuickSlotStatus[] = [];
    if (requested) chips.push(requested);
    for (const s of laterAvail) {
      if (chips.some((c) => c.index === s.index)) continue;
      chips.push(s);
      if (chips.length >= 3) break;
    }
    if (chips.length < 3) {
      for (const s of later) {
        if (chips.some((c) => c.index === s.index)) continue;
        chips.push(s);
        if (chips.length >= 3) break;
      }
    }

    const nearest = requested && !requested.available ? laterAvail[0] ?? null : null;
    const displayPrice =
      requested?.available ? requested.pricePerHour : nearest?.pricePerHour ?? venue.priceMin ?? null;
    return { requested, nearest, chips, displayPrice };
  }, [venue, selectedDuration, selectedTime, aloboBookedKeys]);

  useEffect(() => {
    if (!computed) {
      setSelectedChipIndex(null);
      return;
    }
    const requestedChip = computed.chips.find((c) => c.index === selectedTime && c.available);
    if (requestedChip) {
      setSelectedChipIndex(requestedChip.index);
      return;
    }
    const firstAvailable = computed.chips.find((c) => c.available) ?? null;
    setSelectedChipIndex(firstAvailable?.index ?? null);
  }, [computed, selectedTime]);

  const durationLabel_ = DURATIONS[selectedDuration] ?? '';
  const isIncompatible = venue?.use30MinSlots === false && durationLabel_.includes('30');

  useEffect(() => {
    if (!venue || !computed || isIncompatible) {
      onSelectionChange?.(null);
      return;
    }
    if (selectedChipIndex == null) {
      onSelectionChange?.(null);
      return;
    }
    const selected = computed.chips.find((c) => c.index === selectedChipIndex && c.available) ?? null;
    if (!selected || selected.pricePerHour == null || selected.totalPrice == null || !selected.startTime) {
      onSelectionChange?.(null);
      return;
    }
    onSelectionChange?.({
      venue,
      startLabel: selected.label,
      startTime: selected.startTime,
      pricePerHour: selected.pricePerHour,
      totalPrice: selected.totalPrice,
      slots: selected.slots,
    });
  }, [venue, computed, selectedChipIndex, onSelectionChange, isIncompatible]);

  useEffect(() => {
    if (!loading && computed) onReady?.();
  }, [loading, computed, onReady]);

  if (loading) {
    return (
      <View style={[styles.quickCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={t.accent} />
          <Text style={{ color: t.textSec, fontSize: 13 }}>Checking selected venue slots...</Text>
        </View>
      </View>
    );
  }

  if (!venue || !computed) return null;

  const durationLabel = DURATIONS[selectedDuration] ?? '';
  const isHalfHourDuration = durationLabel.includes('30');
  const venueHourOnly = venue.use30MinSlots === false;
  const incompatibleDuration = venueHourOnly && isHalfHourDuration;

  if (incompatibleDuration) {
    return (
      <View style={[styles.quickCard, { backgroundColor: t.bgCard, borderColor: '#4A2026' }]}>
        <View style={styles.quickTopRow}>
          <View style={styles.titleCol}>
            <Text style={{ fontSize: 12, color: t.textMuted, marginBottom: 2 }}>Pinned venue preview</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: t.text }} numberOfLines={1}>
              {venue.name}
            </Text>
          </View>
        </View>
        <View style={[styles.warningBanner, { backgroundColor: '#2B0D10', borderColor: '#4A2026' }]}>
          <Text style={{ fontSize: 13, color: '#FF7D7D', lineHeight: 18 }}>
            This venue only accepts per-hour bookings (1h, 2h, 3h). Please select a different duration or choose another venue.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.quickCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
      <View style={styles.quickTopRow}>
        <View style={styles.titleCol}>
          <Text style={{ fontSize: 12, color: t.textMuted, marginBottom: 2 }}>Pinned venue preview</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: t.text }} numberOfLines={1}>
            {venue.name}
          </Text>
        </View>
        {computed.displayPrice != null ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 37, lineHeight: 38, fontWeight: '800', color: t.accent }}>
              {formatPrice(computed.displayPrice)}
            </Text>
            <Text style={{ fontSize: 12, color: t.textSec }}>d/hr</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.quickSlotsRow}>
        {computed.chips.map((chip) => (
          <Pressable
            key={`quick-slot-${chip.index}`}
            disabled={!chip.available}
            onPress={() => {
              if (chip.available) setSelectedChipIndex(chip.index);
            }}
            style={[
              styles.quickChip,
              chip.available
                ? { backgroundColor: t.accentBg, borderColor: t.accent }
                : { backgroundColor: '#2B0D10', borderColor: '#4A2026' },
              chip.available && selectedChipIndex === chip.index
                ? { borderColor: t.accent, backgroundColor: t.accent }
                : null,
            ]}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '800',
                color: chip.available
                  ? selectedChipIndex === chip.index
                    ? '#000'
                    : t.accent
                  : '#FF7D7D',
              }}
            >
              {chip.available ? chip.label : `${chip.label} full`}
            </Text>
          </Pressable>
        ))}
      </View>

      {computed.nearest ? (
        <Text style={{ marginTop: 8, fontSize: 12, color: t.textSec }}>
          No {computed.requested?.label ?? 'requested'} slot. Nearest is {computed.nearest.label}.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  quickCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quickTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleCol: {
    width: '66%',
    minWidth: 0,
  },
  quickSlotsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  quickChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  warningBanner: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
});
