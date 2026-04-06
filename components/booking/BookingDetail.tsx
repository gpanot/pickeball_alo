'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BackIcon, PhoneIcon, PinIcon } from '@/components/ui/Icons';
import type { ThemeTokens } from '@/lib/theme';
import type { BookingResult, BookingSlot, VenueResult } from '@/lib/types';
import { formatVndFull } from '@/lib/formatters';
import { getVenue } from '@/lib/api';
import VietQrPaymentWeb from '@/components/booking/VietQrPaymentWeb';

interface BookingDetailProps {
  booking: BookingResult;
  userId: string;
  onBack: () => void;
  onCancel: (id: string) => void;
  onRefreshBookings?: () => void;
  onEditRequest?: (booking: BookingResult) => void;
  t: ThemeTokens;
}

const STEP_ORDER = ['pending', 'payment_submitted', 'paid'] as const;
const STEP_LABELS: Record<string, string> = {
  pending: 'Requested',
  payment_submitted: 'Verifying',
  paid: 'Paid',
};

export default function BookingDetail({
  booking,
  userId,
  onBack,
  onCancel,
  onRefreshBookings,
  onEditRequest,
  t,
}: BookingDetailProps) {
  const [live, setLive] = useState(booking);
  useEffect(() => setLive(booking), [booking]);

  const slots = live.slots as BookingSlot[];
  const canCancel = live.status === 'pending' || live.status === 'payment_submitted';
  const isCanceled = live.status === 'canceled';
  const currentStep = isCanceled ? -1 : STEP_ORDER.indexOf(live.status as (typeof STEP_ORDER)[number]);

  const [payOpen, setPayOpen] = useState(false);
  const [payVenue, setPayVenue] = useState<VenueResult | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  const openPay = useCallback(async () => {
    setPayOpen(true);
    setPayLoading(true);
    setPayVenue(null);
    try {
      setPayVenue(await getVenue(live.venueId, live.date));
    } catch {
      setPayVenue(null);
    } finally {
      setPayLoading(false);
    }
  }, [live.venueId, live.date]);

  const confirmCancel = () => {
    const msg =
      live.status === 'payment_submitted'
        ? 'If you already transferred money, contact the venue for a refund. Continue?'
        : 'This cannot be undone.';
    if (typeof window !== 'undefined' && window.confirm(`Cancel booking? ${msg}`)) {
      onCancel(live.id);
    }
  };

  return (
    <div style={{ paddingBottom: 'max(100px, calc(72px + env(safe-area-inset-bottom)))', animation: 'fadeIn 0.3s ease' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: t.bg,
          borderBottom: `1px solid ${t.border}`,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: t.text, cursor: 'pointer', padding: 4, display: 'flex' }}
        >
          <BackIcon />
        </button>
        <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>Booking Detail</div>
      </div>

      <div style={{ padding: '20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
          {STEP_ORDER.map((step, i) => {
            const isActive = i <= currentStep;
            const isCurrent = i === currentStep;
            return (
              <React.Fragment key={step}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: isCanceled ? t.textMuted : isActive ? t.accent : t.bgInput,
                      color: isActive && !isCanceled ? '#000' : t.textSec,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      border: isCurrent ? `2px solid ${t.accent}` : 'none',
                    }}
                  >
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 10, color: isActive ? t.text : t.textMuted, fontWeight: 600 }}>
                    {STEP_LABELS[step] ?? step}
                  </span>
                </div>
                {i < STEP_ORDER.length - 1 && (
                  <div
                    style={{
                      width: 40,
                      height: 2,
                      background: i < currentStep ? t.accent : t.border,
                      marginBottom: 18,
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
          {isCanceled && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginLeft: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: t.red,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                ✕
              </div>
              <span style={{ fontSize: 10, color: t.red, fontWeight: 600 }}>Canceled</span>
            </div>
          )}
        </div>

        <div
          style={{
            background: t.bgCard,
            borderRadius: 16,
            padding: 16,
            border: `1px solid ${t.border}`,
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 18, color: t.text, marginBottom: 12 }}>{live.venueName}</div>
          <div style={{ fontSize: 14, color: t.textSec, marginBottom: 8 }}>Date: {live.date}</div>
          {slots.map((s, i) => (
            <div
              key={i}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: `1px solid ${t.border}` }}
            >
              <span style={{ fontSize: 14, color: t.text }}>
                {s.courtName}, {s.time}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: t.accent }}>
                {s.price >= 1000 ? `${Math.round(s.price / 1000)}k` : `${s.price}k`}
              </span>
            </div>
          ))}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 0 0',
              borderTop: `1px solid ${t.border}`,
              marginTop: 4,
            }}
          >
            <span style={{ fontWeight: 700, color: t.text }}>Total</span>
            <span style={{ fontWeight: 800, color: t.accent }}>{formatVndFull(live.totalPrice)}</span>
          </div>
          {live.notes ? (
            <div
              style={{
                marginTop: 12,
                padding: '8px 12px',
                background: t.bgInput,
                borderRadius: 10,
                fontSize: 13,
                color: t.textSec,
              }}
            >
              {live.notes}
            </div>
          ) : null}
        </div>

        {live.status === 'pending' ? (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => void openPay()}
              style={{
                flex: 1,
                padding: '16px 20px',
                borderRadius: 14,
                border: 'none',
                background: t.accent,
                color: '#000',
                fontWeight: 800,
                fontSize: 15,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Pay now
            </button>
            {onEditRequest ? (
              <button
                type="button"
                onClick={() => onEditRequest(live)}
                style={{
                  flex: 1,
                  padding: '16px 20px',
                  borderRadius: 14,
                  border: `1px solid ${t.accent}`,
                  background: 'transparent',
                  color: t.accent,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Edit request
              </button>
            ) : null}
          </div>
        ) : null}

        <div
          style={{
            background: t.bgCard,
            borderRadius: 16,
            padding: 16,
            border: `1px solid ${t.border}`,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: t.textMuted,
              marginBottom: 10,
            }}
          >
            Venue Contact
          </div>
          {live.venuePhone ? (
            <a
              href={`tel:${live.venuePhone}`}
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, textDecoration: 'none' }}
            >
              <span style={{ color: t.accent }}>
                <PhoneIcon />
              </span>
              <span style={{ fontSize: 14, color: t.text }}>{live.venuePhone}</span>
            </a>
          ) : null}
          {live.venueAddress ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: t.accent }}>
                <PinIcon />
              </span>
              <span style={{ fontSize: 14, color: t.text }}>{live.venueAddress}</span>
            </div>
          ) : null}
        </div>

        {canCancel ? (
          <button
            type="button"
            onClick={confirmCancel}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 14,
              background: 'transparent',
              border: `1px solid ${t.red}`,
              color: t.red,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {live.status === 'pending' ? 'Cancel request' : 'Cancel booking'}
          </button>
        ) : null}
      </div>

      {payOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              flex: 1,
              maxWidth: 480,
              margin: '0 auto',
              background: t.bg,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '100vh',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                borderBottom: `1px solid ${t.border}`,
                padding: '8px 8px',
              }}
            >
              <button
                type="button"
                onClick={() => setPayOpen(false)}
                style={{
                  padding: 12,
                  background: 'none',
                  border: 'none',
                  color: t.accent,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Close
              </button>
              <div style={{ flex: 1, textAlign: 'center', fontWeight: 800, color: t.text }}>Pay</div>
              <div style={{ width: 72 }} />
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
                overflow: 'hidden',
                padding: 16,
              }}
            >
              {payLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: t.textSec }}>Loading…</div>
              ) : payVenue ? (
                <VietQrPaymentWeb
                  booking={live}
                  venue={payVenue}
                  userId={userId}
                  t={t}
                  showSuccessHeader={false}
                  onBookingUpdated={(b) => {
                    setLive(b);
                    onRefreshBookings?.();
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: t.textSec }}>Could not load venue.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
