'use client';

import React from 'react';
import { BackIcon, PhoneIcon, PinIcon } from '@/components/ui/Icons';
import type { ThemeTokens } from '@/lib/theme';
import type { BookingResult, BookingSlot } from '@/lib/types';

interface BookingDetailProps {
  booking: BookingResult;
  onBack: () => void;
  onCancel: (id: string) => void;
  t: ThemeTokens;
}

const STEPS = ['pending', 'booked', 'paid'];

export default function BookingDetail({ booking, onBack, onCancel, t }: BookingDetailProps) {
  const slots = booking.slots as BookingSlot[];
  const canCancel = booking.status === 'pending' || booking.status === 'booked';
  const isCanceled = booking.status === 'canceled';
  const currentStep = isCanceled ? -1 : STEPS.indexOf(booking.status);

  return (
    <div style={{ paddingBottom: 'max(100px, calc(72px + env(safe-area-inset-bottom)))', animation: 'fadeIn 0.3s ease' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 50, background: t.bg,
        borderBottom: `1px solid ${t.border}`, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: t.text, cursor: 'pointer', padding: 4, display: 'flex' }}>
          <BackIcon />
        </button>
        <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>Booking Detail</div>
      </div>

      <div style={{ padding: '20px 16px' }}>
        {/* Status timeline */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 24 }}>
          {STEPS.map((step, i) => {
            const isActive = i <= currentStep;
            const isCurrent = i === currentStep;
            return (
              <React.Fragment key={step}>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: isCanceled ? t.textMuted : isActive ? t.accent : t.bgInput,
                    color: isActive && !isCanceled ? '#000' : t.textSec,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    border: isCurrent ? `2px solid ${t.accent}` : 'none',
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 10, color: isActive ? t.text : t.textMuted, fontWeight: 600, textTransform: 'capitalize' }}>
                    {step}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    width: 40, height: 2, background: i < currentStep ? t.accent : t.border,
                    marginBottom: 18,
                  }} />
                )}
              </React.Fragment>
            );
          })}
          {isCanceled && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginLeft: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: t.red, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700,
              }}>
                ✕
              </div>
              <span style={{ fontSize: 10, color: t.red, fontWeight: 600 }}>Canceled</span>
            </div>
          )}
        </div>

        {/* Booking details */}
        <div style={{
          background: t.bgCard, borderRadius: 16, padding: 16,
          border: `1px solid ${t.border}`, marginBottom: 16,
        }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: t.text, marginBottom: 12 }}>{booking.venueName}</div>
          <div style={{ fontSize: 14, color: t.textSec, marginBottom: 8 }}>Date: {booking.date}</div>
          {slots.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: `1px solid ${t.border}` }}>
              <span style={{ fontSize: 14, color: t.text }}>{s.courtName}, {s.time}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: t.accent }}>
                {s.price >= 1000 ? `${Math.round(s.price / 1000)}k` : `${s.price}k`}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', borderTop: `1px solid ${t.border}`, marginTop: 4 }}>
            <span style={{ fontWeight: 700, color: t.text }}>Total</span>
            <span style={{ fontWeight: 800, color: t.accent }}>
              {booking.totalPrice >= 1000 ? `${Math.round(booking.totalPrice / 1000)}k` : `${booking.totalPrice}k`}
            </span>
          </div>
          {booking.notes && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: t.bgInput, borderRadius: 10, fontSize: 13, color: t.textSec }}>
              {booking.notes}
            </div>
          )}
        </div>

        {/* Venue info */}
        <div style={{
          background: t.bgCard, borderRadius: 16, padding: 16,
          border: `1px solid ${t.border}`, marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: t.textMuted, marginBottom: 10 }}>
            Venue Contact
          </div>
          {booking.venuePhone && (
            <a href={`tel:${booking.venuePhone}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, textDecoration: 'none' }}>
              <span style={{ color: t.accent }}><PhoneIcon /></span>
              <span style={{ fontSize: 14, color: t.text }}>{booking.venuePhone}</span>
            </a>
          )}
          {booking.venueAddress && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: t.accent }}><PinIcon /></span>
              <span style={{ fontSize: 14, color: t.text }}>{booking.venueAddress}</span>
            </div>
          )}
        </div>

        {canCancel && (
          <button
            onClick={() => onCancel(booking.id)}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 14,
              background: 'transparent', border: `1px solid ${t.red}`,
              color: t.red, fontWeight: 700, fontSize: 14, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {booking.status === 'pending' ? 'Cancel Request' : 'Cancel Booking'}
          </button>
        )}
      </div>
    </div>
  );
}
