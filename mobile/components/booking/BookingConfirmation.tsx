import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/lib/theme';
import type { BookingResult, VenueResult } from '@/lib/types';
import VietQrPaymentPanel from '@/components/booking/VietQrPaymentPanel';

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

  return (
    <View style={styles.root}>
      <VietQrPaymentPanel
        booking={live}
        venue={venue}
        userId={userId}
        t={t}
        compact
        scrollEnabled={false}
        onBookingUpdated={setLive}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingVertical: 8, paddingHorizontal: 12, flex: 1 },
});
