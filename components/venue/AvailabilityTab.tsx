'use client';

import React, { useMemo } from 'react';
import { sortSlotsByTime } from '@/lib/formatters';
import type { ThemeTokens } from '@/lib/theme';
import type { CourtResult } from '@/lib/types';

interface AvailabilityTabProps {
  courts: CourtResult[];
  selectedSlots: Set<string>;
  onToggleSlot: (courtName: string, time: string) => void;
  t: ThemeTokens;
}

export default function AvailabilityTab({ courts, selectedSlots, onToggleSlot, t }: AvailabilityTabProps) {
  const courtsSorted = useMemo(
    () => courts.map((c) => ({ ...c, slots: sortSlotsByTime(c.slots) })),
    [courts],
  );

  return (
    <div>
      <div style={{ fontSize: 11, color: t.textSec, padding: '0 20px 14px', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: t.green, display: 'inline-block' }} /> Available
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: t.textMuted, display: 'inline-block' }} /> Booked
        </span>
      </div>

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
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingLeft: 20, paddingRight: 20, paddingBottom: 4 }}>
                {crt.slots.map((slot, si) => {
                  const key = `${crt.name}|${slot.time}`;
                  const isSel = selectedSlots.has(key);
                  const isBooked = slot.isBooked;

                  return (
                    <button
                      key={si}
                      onClick={() => !isBooked && onToggleSlot(crt.name, slot.time)}
                      disabled={isBooked}
                      style={{
                        minWidth: 68, padding: '8px 10px', borderRadius: 10, border: 'none',
                        cursor: isBooked ? 'default' : 'pointer',
                        background: isSel ? t.accent : isBooked ? t.bgInput : t.bgCard,
                        opacity: isBooked ? 0.35 : 1, fontFamily: 'inherit',
                        transition: 'all 0.15s', textAlign: 'center', flexShrink: 0,
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
