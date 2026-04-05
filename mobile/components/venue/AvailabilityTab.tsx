import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { firstSlotIndexAtOrAfter, sortSlotsByTime } from '@/lib/formatters';
import type { ThemeTokens } from '@/lib/theme';
import type { CourtResult } from '@/lib/types';

interface AvailabilityTabProps {
  courts: CourtResult[];
  selectedSlots: Set<string>;
  scrollAnchorTime?: string | null;
  /** When editing a booking, courts that contain selected slots move to the top. */
  prioritizeSelectedCourts?: boolean;
  onToggleSlot: (courtName: string, time: string) => void;
  t: ThemeTokens;
}

export default function AvailabilityTab({
  courts,
  selectedSlots,
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

  const stripRefs = useRef<Map<string, ScrollView | null>>(new Map());
  const layoutX = useRef<Map<string, number[]>>(new Map());

  const scrollStripsToAnchor = useCallback(() => {
    if (!scrollAnchorTime) return;
    for (const crt of courtsOrdered) {
      const strip = stripRefs.current.get(crt.name);
      if (!strip || crt.slots.length === 0) continue;
      const idx = firstSlotIndexAtOrAfter(crt.slots, scrollAnchorTime);
      const xs = layoutX.current.get(crt.name);
      const x = xs?.[idx];
      if (x != null) {
        strip.scrollTo({ x: Math.max(0, x - 6), animated: true });
      }
    }
  }, [scrollAnchorTime, courtsOrdered]);

  useEffect(() => {
    if (!scrollAnchorTime) return;
    scrollStripsToAnchor();
    const raf = requestAnimationFrame(scrollStripsToAnchor);
    const tmr = setTimeout(scrollStripsToAnchor, 160);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(tmr);
    };
  }, [scrollAnchorTime, courtsOrdered, scrollStripsToAnchor]);

  return (
    <View>
      {courtsOrdered.map((crt, ci) => {
        const hasSlots = crt.slots.length > 0;
        const openCount = crt.slots.filter((s) => {
          const key = `${crt.name}|${s.time}`;
          if (prioritizeSelectedCourts && selectedSlots.has(key)) return true;
          return !s.isBooked;
        }).length;

        return (
          <View
            key={ci}
            style={[styles.courtBlock, { borderBottomColor: t.border }, !hasSlots && { opacity: 0.4 }]}
          >
            <View style={styles.courtHeader}>
              <View style={styles.courtTitleRow}>
                <Text style={[styles.courtName, { color: t.text }]}>{crt.name}</Text>
                {crt.note ? (
                  <Text
                    style={{
                      fontSize: 10,
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
              </View>
              {hasSlots ? (
                <Text style={{ fontSize: 11, color: openCount > 0 ? t.green : t.red, fontWeight: '600' }}>
                  {openCount} open
                </Text>
              ) : (
                <Text style={{ fontSize: 11, color: t.orange, fontWeight: '600' }}>Unavailable</Text>
              )}
            </View>
            {hasSlots && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                ref={(r) => {
                  if (r) stripRefs.current.set(crt.name, r);
                  else stripRefs.current.delete(crt.name);
                }}
                contentContainerStyle={styles.strip}
              >
                {crt.slots.map((slot, si) => {
                  const key = `${crt.name}|${slot.time}`;
                  const isSel = selectedSlots.has(key);
                  const isBooked = slot.isBooked;
                  /** Your current picks stay tappable so you can remove them; other bookings stay locked. */
                  const canToggle = !isBooked || isSel;
                  return (
                    <Pressable
                      key={si}
                      disabled={!canToggle}
                      onLayout={(e) => {
                        const arr = layoutX.current.get(crt.name) ?? [];
                        arr[si] = e.nativeEvent.layout.x;
                        layoutX.current.set(crt.name, arr);
                      }}
                      onPress={() => canToggle && onToggleSlot(crt.name, slot.time)}
                      style={[
                        styles.slotBtn,
                        {
                          backgroundColor: isSel ? t.accent : isBooked ? t.bgInput : t.bgCard,
                          opacity: isBooked && !isSel ? 0.35 : 1,
                          borderWidth: isSel ? 2 : 1,
                          borderColor: isSel ? 'rgba(0,0,0,0.3)' : t.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: isSel ? '#000' : t.text,
                        }}
                      >
                        {slot.time}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: isSel ? 'rgba(0,0,0,0.6)' : t.accent,
                          marginTop: 1,
                        }}
                      >
                        {slot.price >= 1000 ? `${Math.round(slot.price / 1000)}k` : `${slot.price}k`}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  courtBlock: { paddingVertical: 12, borderBottomWidth: 1 },
  courtHeader: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  courtTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  courtName: { fontWeight: '700', fontSize: 14 },
  strip: { paddingLeft: 20, paddingRight: 20, paddingBottom: 4, gap: 6, flexDirection: 'row' },
  slotBtn: {
    minWidth: 68,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
});
