'use client';

import React, { useState, useMemo } from 'react';
import { BackIcon } from '@/components/ui/Icons';
import BookingCard from '@/components/booking/BookingCard';
import BookingDetail from '@/components/booking/BookingDetail';
import type { ThemeTokens } from '@/lib/theme';
import type { BookingResult } from '@/lib/types';

interface MyBookingsScreenProps {
  bookings: BookingResult[];
  loading: boolean;
  userId: string;
  onBack: () => void;
  onCancel: (id: string) => void;
  onRefreshBookings?: () => void;
  onEdit?: (booking: BookingResult) => void;
  t: ThemeTokens;
}

type TabKey = 'upcoming' | 'past' | 'all';

export default function MyBookingsScreen({
  bookings,
  loading,
  userId,
  onBack,
  onCancel,
  onRefreshBookings,
  onEdit,
  t,
}: MyBookingsScreenProps) {
  const [tab, setTab] = useState<TabKey>('upcoming');
  const [selectedBooking, setSelectedBooking] = useState<BookingResult | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    if (tab === 'all') return bookings;
    return bookings.filter((b) => {
      const isPast = b.date < today || b.status === 'canceled' || b.status === 'paid';
      return tab === 'upcoming' ? !isPast : isPast;
    });
  }, [bookings, tab, today]);

  if (selectedBooking) {
    const current = bookings.find((b) => b.id === selectedBooking.id) || selectedBooking;
    return (
      <BookingDetail
        booking={current}
        userId={userId}
        onBack={() => setSelectedBooking(null)}
        onCancel={onCancel}
        onRefreshBookings={onRefreshBookings}
        onEditRequest={onEdit}
        t={t}
      />
    );
  }

  const tabStyle = (key: TabKey): React.CSSProperties => ({
    flex: 1, padding: '10px 0', background: 'none', border: 'none',
    cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
    color: tab === key ? t.accent : t.textSec,
    borderBottom: tab === key ? `2px solid ${t.accent}` : '2px solid transparent',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ minHeight: '100%', animation: 'fadeIn 0.3s ease', paddingBottom: 88 }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 50, background: t.bg,
        borderBottom: `1px solid ${t.border}`, padding: '14px 16px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: t.text, cursor: 'pointer', padding: 4, display: 'flex' }}>
            <BackIcon />
          </button>
          <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>My Bookings</div>
        </div>
        <div style={{ display: 'flex' }}>
          <button onClick={() => setTab('upcoming')} style={tabStyle('upcoming')}>Upcoming</button>
          <button onClick={() => setTab('past')} style={tabStyle('past')}>Past</button>
          <button onClick={() => setTab('all')} style={tabStyle('all')}>All</button>
        </div>
      </div>
      <div style={{ padding: '12px 16px 40px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: t.textSec }}>
            <div style={{ fontSize: 14 }}>Loading bookings...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: t.textSec }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 8 }}>No bookings yet</div>
            <div style={{ fontSize: 14 }}>Search for courts to make your first booking</div>
          </div>
        ) : (
          filtered.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onCancel={onCancel}
              onClick={() => setSelectedBooking(b)}
              onEdit={onEdit}
              t={t}
            />
          ))
        )}
      </div>
    </div>
  );
}
