'use client';

import React, { useLayoutEffect, useRef } from 'react';
import { PinIcon, CloseIcon, LocateIcon } from '@/components/ui/Icons';
import { formatDateLabel, getNextDays, DURATIONS, START_HOUR_OPTIONS } from '@/lib/formatters';
import type { ThemeTokens } from '@/lib/theme';

function SectionLabel({ label, t }: { label: string; t: ThemeTokens }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, color: t.textMuted }}>
      {label}
    </div>
  );
}

function chip(t: ThemeTokens, active: boolean): React.CSSProperties {
  return {
    padding: '10px 18px', borderRadius: 12, border: 'none',
    background: active ? t.accent : t.bgCard,
    color: active ? '#000' : t.text,
    fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s', flexShrink: 0,
    outline: active ? 'none' : `1px solid ${t.border}`,
  };
}

export interface SearchFormFieldsProps {
  searchQuery: string;
  selectedDate: number;
  selectedDuration: number;
  selectedTime: number;
  onSearchQueryChange: (q: string) => void;
  onDateChange: (i: number) => void;
  onDurationChange: (i: number) => void;
  onTimeChange: (i: number) => void;
  t: ThemeTokens;
}

export default function SearchFormFields({
  searchQuery,
  selectedDate,
  selectedDuration,
  selectedTime,
  onSearchQueryChange,
  onDateChange,
  onDurationChange,
  onTimeChange,
  t,
}: SearchFormFieldsProps) {
  const dates = getNextDays(7);
  const selectedTimeBtnRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    selectedTimeBtnRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [selectedTime]);

  return (
    <div>
      <div style={{
        background: t.bgCard, borderRadius: 14, padding: '16px 18px',
        border: `1px solid ${t.border}`, marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ color: t.accent }}><PinIcon /></span>
        <input
          type="text"
          placeholder="Search area or venue name..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: t.text, fontSize: 15, fontFamily: 'inherit' }}
        />
        {searchQuery && (
          <button type="button" onClick={() => onSearchQueryChange('')} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', padding: 2 }}>
            <CloseIcon />
          </button>
        )}
      </div>

      <SectionLabel label="When" t={t} />
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 20 }}>
        {dates.map((d, i) => {
          const { day, date } = formatDateLabel(d);
          return (
            <button key={i} type="button" onClick={() => onDateChange(i)} style={{ ...chip(t, i === selectedDate), flexDirection: 'column', minWidth: 70, padding: '10px 14px' }}>
              <span style={{ fontSize: 11, opacity: 0.7 }}>{day}</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{date}</span>
            </button>
          );
        })}
      </div>

      <SectionLabel label="Duration" t={t} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {DURATIONS.map((d, i) => (
          <button key={d} type="button" onClick={() => onDurationChange(i)} style={chip(t, i === selectedDuration)}>
            {d}
          </button>
        ))}
      </div>

      <SectionLabel label="Start time" t={t} />
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          flexWrap: 'nowrap',
          paddingBottom: 8,
          marginBottom: 20,
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
        }}
      >
        {START_HOUR_OPTIONS.map((opt, i) => (
          <button
            key={`${opt.hour}-${i}`}
            ref={i === selectedTime ? selectedTimeBtnRef : undefined}
            type="button"
            onClick={() => onTimeChange(i)}
            style={chip(t, i === selectedTime)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div style={{
        background: t.bgCard, borderRadius: 14, padding: '16px 18px',
        border: `1px solid ${t.border}`, marginBottom: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: t.accent }}><LocateIcon /></span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Near me</div>
            <div style={{ fontSize: 12, color: t.textSec }}>Within 10 km radius</div>
          </div>
        </div>
        <div style={{ width: 44, height: 26, borderRadius: 13, background: t.accent, position: 'relative', cursor: 'pointer' }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, right: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
        </div>
      </div>
    </div>
  );
}
