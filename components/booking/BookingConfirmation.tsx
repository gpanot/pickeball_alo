'use client';

import React, { useEffect, useState } from 'react';
import type { ThemeTokens } from '@/lib/theme';
import type { BookingResult, VenueResult } from '@/lib/types';
import VietQrPaymentWeb from '@/components/booking/VietQrPaymentWeb';

interface BookingConfirmationProps {
  booking: BookingResult;
  venue: VenueResult;
  userId: string;
  t: ThemeTokens;
}

export default function BookingConfirmation({
  booking,
  venue,
  userId,
  t,
}: BookingConfirmationProps) {
  const [live, setLive] = useState(booking);
  useEffect(() => setLive(booking), [booking]);

  return (
    <div
      style={{
        padding: '12px 16px 0',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <VietQrPaymentWeb booking={live} venue={venue} userId={userId} t={t} compact onBookingUpdated={setLive} />
    </div>
  );
}
