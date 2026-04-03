'use client';

import React from 'react';
import { CheckIcon } from '@/components/ui/Icons';
import type { ThemeTokens } from '@/lib/theme';
import type { BookingResult } from '@/lib/types';
import { formatBookingOrderRef } from '@/lib/formatters';

interface BookingConfirmationProps {
  booking: BookingResult;
  onViewBookings: () => void;
  onDone: () => void;
  t: ThemeTokens;
}

export default function BookingConfirmation({ booking, onViewBookings, onDone, t }: BookingConfirmationProps) {
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%', background: t.accentBgStrong,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px', color: t.accent,
      }}>
        <CheckIcon size={40} />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: t.text, margin: '0 0 8px' }}>Request sent!</h2>
      <p style={{ fontSize: 14, color: t.textSec, margin: '0 0 8px' }}>
        The venue will confirm your booking shortly
      </p>
      <p style={{ fontSize: 13, color: t.textMuted, margin: '0 0 32px' }}>
        Order {formatBookingOrderRef(booking.orderId)}
      </p>

      <button
        onClick={onViewBookings}
        style={{
          width: '100%', padding: '16px 20px', borderRadius: 14,
          background: t.accent, color: '#000', fontWeight: 800, fontSize: 15,
          border: 'none', cursor: 'pointer', letterSpacing: 0.3,
          boxShadow: `0 4px 20px ${t.accent}55`, fontFamily: 'inherit',
          marginBottom: 12,
        }}
      >
        VIEW MY BOOKINGS
      </button>
      <button
        onClick={onDone}
        style={{
          width: '100%', padding: '14px 20px', borderRadius: 14,
          background: t.bgCard, color: t.text, fontWeight: 700, fontSize: 14,
          border: `1px solid ${t.border}`, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        DONE
      </button>
    </div>
  );
}
