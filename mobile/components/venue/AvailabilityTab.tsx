import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { firstSlotIndexAtOrAfter, sortSlotsByTime } from '@/lib/formatters';
import type { ThemeTokens } from '@/lib/theme';
import type { CourtResult, SlotResult } from '@/lib/types';

interface AvailabilityTabProps {
  courts: CourtResult[];
  selectedSlots: Set<string>;
  aloboBookedKeys?: Set<string>;
  scrollAnchorTime?: string | null;
  prioritizeSelectedCourts?: boolean;
  onToggleSlot: (courtName: string, time: string) => void;
  t: ThemeTokens;
}

const SLOT_WIDTH = 74;
const SLOT_GAP = 6;
const H_PAD = 20;
const COURT_LABEL_WIDTH = 100;

export default function AvailabilityTab({
  courts,
  selectedSlots,
  aloboBookedKeys,
  scrollAnchorTime = null,
  prioritizeSelectedCourts = false,
  onToggleSlot,
  t,
}: AvailabilityTabProps) {
  const courtsSorted = useMemo(
    () => courts.map((c) => ({ ...c, slots: sortSlotsByTime(c.slots) })),
    [courts],
  );

  const courtsOrdered = useMemo(() => {
    if (!prioritizeSelectedCourts || selectedSlots.size === 0) return courtsSorted;
    const hasSelected = (crt: (typeof courtsSorted)[0]) =>
      crt.slots.some((s) => selectedSlots.has(`${crt.name}|${s.time}`));
    return [...courtsSorted].sort((a, b) => {
      const sa = hasSelected(a) ? 1 : 0;
      const sb = hasSelected(b) ? 1 : 0;
      return sb - sa;
    });
  }, [courtsSorted, prioritizeSelectedCourts, selectedSlots]);

  const allTimes = useMemo(() => {
    const set = new Set<string>();
    for (const crt of courtsOrdered) {
      for (const s of crt.slots) set.add(s.time);
    }
    return [...set].sort();
  }, [courtsOrdered]);

  const slotGrid = useMemo(() => {
    const grid = new Map<string, Map<string, SlotResult>>();
    for (const crt of courtsOrdered) {
      const row = new Map<string, SlotResult>();
      for (const s of crt.slots) row.set(s.time, s);
      grid.set(crt.name, row);
    }
    return grid;
  }, [courtsOrdered]);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!scrollAnchorTime || allTimes.length === 0) return;
    const dummySlots = allTimes.map((time) => ({ time, id: '', price: 0, isBooked: false }));
    const idx = firstSlotIndexAtOrAfter(dummySlots, scrollAnchorTime);
    const x = idx * (SLOT_WIDTH + SLOT_GAP);
    const doScroll = () => scrollRef.current?.scrollTo({ x: Math.max(0, x - 6), animated: true });
    doScroll();
    const raf = requestAnimationFrame(doScroll);
    const tmr = setTimeout(doScroll, 160);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(tmr);
    };
  }, [scrollAnchorTime, allTimes]);

  if (allTimes.length === 0) {
    return (
      <View style={{ paddingHorizontal: H_PAD, paddingVertical: 20 }}>
        {courtsOrdered.map((crt, ci) => (
          <View key={ci} style={[styles.courtBlock, { borderBottomColor: t.border, opacity: 0.4 }]}>
            <View style={styles.courtHeader}>
              <View style={styles.courtTitleRow}>
                <Text style={[styles.courtName, { color: t.text }]}>{crt.name}</Text>
              </View>
              <Text style={{ fontSize: 11, color: t.orange, fontWeight: '600' }}>Unavailable</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.gridWrap}>
      {/* Fixed left column: court names */}
      <View style={styles.leftCol}>
        {/* Time header spacer */}
        <View style={styles.timeHeaderSpacer} />
        {courtsOrdered.map((crt, ci) => {
          const hasSlots = crt.slots.length > 0;
          const openCount = crt.slots.filter((s) => {
            const key = `${crt.name}|${s.time}`;
            if (prioritizeSelectedCourts && selectedSlots.has(key)) return true;
            if (s.isBooked) return false;
            if (aloboBookedKeys?.has(key)) return false;
            return true;
          }).length;
          return (
            <View
              key={ci}
              style={[
                styles.courtLabel,
                { borderBottomColor: t.border },
                !hasSlots && { opacity: 0.4 },
              ]}
            >
              <Text style={[styles.courtName, { color: t.text }]} numberOfLines={1}>
                {crt.name}
              </Text>
              {crt.note ? (
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 9,
                    fontWeight: '600',
                    color:
                      crt.note === 'Maintenance' || crt.note === 'Under maintenance'
                        ? t.orange
                        : t.accent,
                  }}
                >
                  {crt.note}
                </Text>
              ) : null}
              {hasSlots ? (
                <Text style={{ fontSize: 10, color: openCount > 0 ? t.green : t.red, fontWeight: '600' }}>
                  {openCount} open
                </Text>
              ) : (
                <Text style={{ fontSize: 10, color: t.orange, fontWeight: '600' }}>N/A</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Scrollable grid: time columns x court rows */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.gridScroll}
        contentContainerStyle={{ paddingRight: H_PAD }}
      >
        <View>
          {/* Time header row */}
          <View style={styles.timeHeaderRow}>
            {allTimes.map((time) => (
              <View key={time} style={styles.timeHeaderCell}>
                <Text style={[styles.timeHeaderText, { color: t.textMuted }]}>{time}</Text>
              </View>
            ))}
          </View>

          {/* Court rows */}
          {courtsOrdered.map((crt, ci) => {
            const courtSlots = slotGrid.get(crt.name);
            const hasSlots = crt.slots.length > 0;
            return (
              <View
                key={ci}
                style={[
                  styles.gridRow,
                  { borderBottomColor: t.border },
                  !hasSlots && { opacity: 0.4 },
                ]}
              >
                {allTimes.map((time) => {
                  const slot = courtSlots?.get(time);
                  if (!slot) {
                    return <View key={time} style={styles.emptyCell} />;
                  }
                  const key = `${crt.name}|${slot.time}`;
                  const isSel = selectedSlots.has(key);
                  const isBooked = slot.isBooked;
                  const isAloboBooked = !isBooked && !!aloboBookedKeys?.has(key);
                  const blocked = isBooked || isAloboBooked;
                  const canToggle = !blocked || isSel;
                  return (
                    <Pressable
                      key={time}
                      disabled={!canToggle}
                      onPress={() => canToggle && onToggleSlot(crt.name, slot.time)}
                      style={[
                        styles.slotBtn,
                        {
                          backgroundColor: isSel
                            ? t.accent
                            : isAloboBooked
                              ? t.bgInput
                              : isBooked
                                ? t.bgInput
                                : t.bgCard,
                          opacity: blocked && !isSel ? 0.35 : 1,
                          borderWidth: isSel ? 2 : 1,
                          borderColor: isSel
                            ? 'rgba(0,0,0,0.3)'
                            : isAloboBooked
                              ? t.orange
                              : t.border,
                        },
                      ]}
                    >
                      {isAloboBooked ? (
                        <Text style={{ fontSize: 9, fontWeight: '700', color: t.orange }}>
                          Booked
                        </Text>
                      ) : (
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '600',
                            color: isSel ? 'rgba(0,0,0,0.6)' : t.accent,
                          }}
                        >
                          {slot.price >= 1000 ? `${Math.round(slot.price / 1000)}k` : `${slot.price}k`}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  gridWrap: {
    flexDirection: 'row',
  },
  leftCol: {
    width: COURT_LABEL_WIDTH,
    paddingLeft: H_PAD,
    zIndex: 2,
  },
  timeHeaderSpacer: {
    height: 28,
  },
  courtLabel: {
    height: 48,
    justifyContent: 'center',
    borderBottomWidth: 1,
    paddingRight: 6,
  },
  courtName: { fontWeight: '700', fontSize: 13 },
  gridScroll: {
    flex: 1,
  },
  timeHeaderRow: {
    flexDirection: 'row',
    height: 28,
    alignItems: 'flex-end',
    gap: SLOT_GAP,
    paddingBottom: 4,
  },
  timeHeaderCell: {
    width: SLOT_WIDTH,
    alignItems: 'center',
  },
  timeHeaderText: {
    fontSize: 11,
    fontWeight: '600',
  },
  gridRow: {
    flexDirection: 'row',
    height: 48,
    alignItems: 'center',
    gap: SLOT_GAP,
    borderBottomWidth: 1,
  },
  emptyCell: {
    width: SLOT_WIDTH,
    height: 36,
  },
  slotBtn: {
    width: SLOT_WIDTH,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courtBlock: { paddingVertical: 12, borderBottomWidth: 1 },
  courtHeader: {
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  courtTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
