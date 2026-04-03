'use client';

import React, { useState } from 'react';
import { BackIcon } from '@/components/ui/Icons';
import { createBooking } from '@/lib/api';
import type { ThemeTokens } from '@/lib/theme';
import type { VenueResult, BookingResult } from '@/lib/types';

interface SlotInfo {
  courtName: string;
  time: string;
  price: number;
}

interface BookingFormProps {
  venue: VenueResult;
  selectedSlots: SlotInfo[];
  totalPrice: number;
  searchDate: string;
  userId: string;
  defaultName: string;
  defaultPhone: string;
  onBack: () => void;
  onSuccess: (booking: BookingResult) => void;
  t: ThemeTokens;
}

export default function BookingForm({
  venue, selectedSlots, totalPrice, searchDate,
  userId, defaultName, defaultPhone,
  onBack, onSuccess, t,
}: BookingFormProps) {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      setError('Name and phone number are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const booking = await createBooking({
        venueId: venue.id,
        venueName: venue.name,
        venuePhone: venue.phone || undefined,
        venueAddress: venue.address,
        userId,
        userName: name.trim(),
        userPhone: phone.trim(),
        date: searchDate,
        slots: selectedSlots.map((s) => ({
          courtName: s.courtName,
          time: s.time,
          duration: venue.use30MinSlots !== false ? 30 : 60,
          price: s.price,
        })),
        totalPrice,
        notes: notes.trim() || undefined,
      });
      onSuccess(booking);
    } catch {
      setError('Failed to send booking request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    background: t.bgInput, border: `1px solid ${t.border}`,
    color: t.text, fontSize: 15, fontFamily: 'inherit',
    outline: 'none',
  };

  return (
    <div style={{ padding: '0 20px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: t.text, cursor: 'pointer', padding: 4, display: 'flex' }}>
          <BackIcon />
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: t.text, margin: 0 }}>Confirm Booking</h2>
      </div>

      {/* Booking summary */}
      <div style={{
        background: t.bgCard, borderRadius: 16, padding: 16,
        border: `1px solid ${t.border}`, marginBottom: 20,
      }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: t.text, marginBottom: 8 }}>{venue.name}</div>
        <div style={{ fontSize: 13, color: t.textSec, marginBottom: 12 }}>{searchDate}</div>
        {selectedSlots.map((s, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: i > 0 ? `1px solid ${t.border}` : 'none' }}>
            <span style={{ fontSize: 14, color: t.text }}>{s.courtName}, {s.time}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: t.accent }}>
              {s.price >= 1000 ? `${Math.round(s.price / 1000)}k` : `${s.price}k`}
            </span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', borderTop: `1px solid ${t.border}`, marginTop: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Total</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: t.accent }}>
            {totalPrice >= 1000 ? `${Math.round(totalPrice / 1000)}k` : `${totalPrice}k`}
          </span>
        </div>
      </div>

      {/* User info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>Phone</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block' }}>Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Need 4 paddles, Birthday group" rows={3} style={{ ...inputStyle, resize: 'none' }} />
        </div>
      </div>

      {!defaultName && !defaultPhone && (
        <div style={{ fontSize: 12, color: t.textSec, marginBottom: 16, padding: '8px 12px', background: t.accentBg, borderRadius: 10 }}>
          Your name and phone will be saved for future bookings
        </div>
      )}

      {error && (
        <div style={{ fontSize: 13, color: t.red, marginBottom: 12, fontWeight: 600 }}>{error}</div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: '100%', padding: '16px 20px', borderRadius: 14,
          background: t.accent, color: '#000', fontWeight: 800, fontSize: 15,
          border: 'none', cursor: loading ? 'wait' : 'pointer',
          letterSpacing: 0.3, boxShadow: `0 4px 20px ${t.accent}55`,
          fontFamily: 'inherit', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
        }}
      >
        {loading ? 'SENDING...' : 'SEND BOOKING REQUEST'}
      </button>
    </div>
  );
}
