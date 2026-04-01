'use client';

import React from 'react';
import type { ThemeTokens } from '@/lib/theme';
import type { BookingResult, BookingSlot } from '@/lib/types';

interface BookingCardProps {
  booking: BookingResult;
  onCancel: (id: string) => void;
  onClick: () => void;
  t: ThemeTokens;
}

const STATUS_CONFIG: Record<string, { label: string; colorKey: 'orange' | 'green' | 'blue' | 'red' }> = {
  pending: { label: 'Awaiting approval', colorKey: 'orange' },
  booked: { label: 'Confirmed', colorKey: 'green' },
  paid: { label: 'Paid', colorKey: 'blue' },
  canceled: { label: 'Canceled', colorKey: 'red' },
};

export default function BookingCard({ booking, onCancel, onClick, t }: BookingCardProps) {
  const config = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const slots = booking.slots as BookingSlot[];
  const isCanceled = booking.status === 'canceled';
  const canCancel = booking.status === 'pending' || booking.status === 'booked';

  return (
    <div
      onClick={onClick}
      style={{
        background: t.bgCard, borderRadius: 16, padding: 16,
        border: `1px solid ${t.border}`, marginBottom: 12,
        opacity: isCanceled ? 0.5 : 1, cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: t.text }}>{booking.venueName}</div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 10px',
          borderRadius: 8, background: `${t[config.colorKey]}22`,
          color: t[config.colorKey],
        }}>
          {config.label}
        </span>
      </div>
      <div style={{ fontSize: 13, color: t.textSec, marginBottom: 4 }}>
        {booking.date} · {slots.map((s) => s.time).join(', ')}
      </div>
      <div style={{ fontSize: 13, color: t.textSec, marginBottom: 4 }}>
        {slots.map((s) => s.courtName).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: t.accent, marginTop: 8 }}>
        {booking.totalPrice >= 1000 ? `${Math.round(booking.totalPrice / 1000)}k` : `${booking.totalPrice}k`}
      </div>
      {canCancel && (
        <button
          onClick={(e) => { e.stopPropagation(); onCancel(booking.id); }}
          style={{
            marginTop: 10, padding: '8px 16px', borderRadius: 10,
            background: 'transparent', border: `1px solid ${t.red}`,
            color: t.red, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all 0.15s',
          }}
        >
          {booking.status === 'pending' ? 'Cancel Request' : 'Cancel Booking'}
        </button>
      )}
    </div>
  );
}
