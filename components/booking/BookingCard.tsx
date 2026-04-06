'use client';

import React from 'react';
import type { ThemeTokens } from '@/lib/theme';
import type { BookingResult, BookingSlot } from '@/lib/types';
import { formatVndFull } from '@/lib/formatters';

interface BookingCardProps {
  booking: BookingResult;
  onCancel: (id: string) => void;
  onClick: () => void;
  onEdit?: (booking: BookingResult) => void;
  t: ThemeTokens;
}

const STATUS_CONFIG: Record<string, { label: string; colorKey: 'orange' | 'green' | 'blue' | 'red' }> = {
  pending: { label: 'Pending payment', colorKey: 'orange' },
  payment_submitted: { label: 'Verifying payment', colorKey: 'orange' },
  paid: { label: 'Confirmed & paid', colorKey: 'blue' },
  canceled: { label: 'Canceled', colorKey: 'red' },
};

export default function BookingCard({ booking, onCancel, onClick, onEdit, t }: BookingCardProps) {
  const config = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const slots = booking.slots as BookingSlot[];
  const isCanceled = booking.status === 'canceled';
  const canCancel = booking.status === 'pending' || booking.status === 'payment_submitted';
  const canEdit = booking.status === 'pending' && onEdit != null;

  const requestCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    const msg =
      booking.status === 'payment_submitted'
        ? 'If you already transferred money, contact the venue for a refund. Continue?'
        : 'This cannot be undone.';
    if (typeof window !== 'undefined' && window.confirm(`Cancel booking? ${msg}`)) {
      onCancel(booking.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        background: t.bgCard,
        borderRadius: 16,
        padding: 16,
        border: `1px solid ${t.border}`,
        marginBottom: 12,
        opacity: isCanceled ? 0.5 : 1,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: t.text }}>{booking.venueName}</div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 8,
            background: `${t[config.colorKey]}22`,
            color: t[config.colorKey],
          }}
        >
          {config.label}
        </span>
      </div>
      <div style={{ fontSize: 13, color: t.textSec, marginBottom: 4 }}>
        {booking.date} · {slots.map((s) => s.time).join(', ')}
      </div>
      <div style={{ fontSize: 13, color: t.textSec, marginBottom: 4 }}>
        {slots.map((s) => s.courtName).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: t.accent, marginTop: 8 }}>{formatVndFull(booking.totalPrice)}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {booking.status === 'pending' ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              background: t.accent,
              border: 'none',
              color: '#000',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Pay now
          </button>
        ) : null}
        {canEdit ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit!(booking);
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              background: 'transparent',
              border: `1px solid ${t.accent}`,
              color: t.accent,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Edit request
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            onClick={requestCancel}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              background: 'transparent',
              border: `1px solid ${t.red}`,
              color: t.red,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}
