'use client';

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { firstSlotIndexAtOrAfter, sortSlotsByTime } from '@/lib/formatters';
import type { ThemeTokens } from '@/lib/theme';
import type { CourtResult } from '@/lib/types';

interface AvailabilityTabProps {
  courts: CourtResult[];
  selectedSlots: Set<string>;
  /** First slot at or after this time is scrolled to the left of each court strip (search / pre-pick). */
  scrollAnchorTime?: string | null;
  onToggleSlot: (courtName: string, time: string) => void;
  t: ThemeTokens;
}

export default function AvailabilityTab({
  courts,
  selectedSlots,
  scrollAnchorTime = null,
  onToggleSlot,
  t,
}: AvailabilityTabProps) {
  const courtsSorted = useMemo(
    () => courts.map((c) => ({ ...c, slots: sortSlotsByTime(c.slots) })),
    [courts],
  );

  const stripRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  useLayoutEffect(() => {
    if (!scrollAnchorTime) return;
    for (const crt of courtsSorted) {
      const strip = stripRefs.current.get(crt.name);
      if (!strip || crt.slots.length === 0) continue;
      const idx = firstSlotIndexAtOrAfter(crt.slots, scrollAnchorTime);
      const btn = strip.children[idx] as HTMLElement | undefined;
      if (btn && typeof btn.offsetLeft === 'number') {
        strip.scrollLeft = Math.max(0, btn.offsetLeft - 6);
      }
    }
  }, [scrollAnchorTime, courtsSorted]);

  return (
    <div>
      {courtsSorted.map((crt, ci) => {
        const hasSlots = crt.slots.length > 0;
        const openCount = crt.slots.filter((s) => !s.isBooked).length;

        return (
          <div key={ci} style={{ padding: '12px 0', borderBottom: `1px solid ${t.border}`, opacity: !hasSlots ? 0.4 : 1 }}>
            <div style={{ padding: '0 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: t.text }}>{crt.name}</span>
                {crt.note && (
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: crt.note === 'Maintenance' || crt.note === 'Under maintenance' ? t.orange : t.accent,
                  }}>
                    {crt.note}
                  </span>
                )}
              </div>
              {hasSlots && <span style={{ fontSize: 11, color: openCount > 0 ? t.green : t.red, fontWeight: 600 }}>{openCount} open</span>}
              {!hasSlots && <span style={{ fontSize: 11, color: t.orange, fontWeight: 600 }}>Unavailable</span>}
            </div>
            {hasSlots && (
              <div
                ref={(el) => {
                  if (el) stripRefs.current.set(crt.name, el);
                  else stripRefs.current.delete(crt.name);
                }}
                style={{
                  display: 'flex',
                  gap: 6,
                  overflowX: 'auto',
                  paddingLeft: 20,
                  paddingRight: 20,
                  paddingBottom: 4,
                }}
              >
                {crt.slots.map((slot, si) => {
                  const key = `${crt.name}|${slot.time}`;
                  const isSel = selectedSlots.has(key);
                  const isBooked = slot.isBooked;

                  return (
                    <button
                      key={si}
                      type="button"
                      onClick={() => !isBooked && onToggleSlot(crt.name, slot.time)}
                      disabled={isBooked}
                      style={{
                        minWidth: 68,
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: 'none',
                        cursor: isBooked ? 'default' : 'pointer',
                        background: isSel ? t.accent : isBooked ? t.bgInput : t.bgCard,
                        opacity: isBooked ? 0.35 : 1,
                        fontFamily: 'inherit',
                        transition: 'all 0.15s',
                        textAlign: 'center',
                        flexShrink: 0,
                        outline: isSel ? 'none' : `1px solid ${t.border}`,
                        boxShadow: isSel ? `0 2px 8px ${t.accent}44` : 'none',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: isSel ? '#000' : t.text, letterSpacing: -0.3 }}>{slot.time}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: isSel ? 'rgba(0,0,0,0.6)' : t.accent, marginTop: 1 }}>
                        {slot.price >= 1000 ? `${Math.round(slot.price / 1000)}k` : `${slot.price}k`}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
