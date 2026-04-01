'use client';

import React, { useState, useMemo } from 'react';
import { HeartIcon, ShareIcon, StarIcon, CourtIcon, PinIcon, DirectionsIcon } from '@/components/ui/Icons';
import AvailabilityTab from './AvailabilityTab';
import InfoTab from './InfoTab';
import BookingForm from '@/components/booking/BookingForm';
import BookingConfirmation from '@/components/booking/BookingConfirmation';
import { formatPrice } from '@/lib/formatters';
import type { ThemeTokens } from '@/lib/theme';
import type { VenueResult, BookingResult } from '@/lib/types';

interface VenueDetailProps {
  venue: VenueResult;
  visible: boolean;
  selectedSlots: Set<string>;
  isSaved: boolean;
  searchDate: string;
  userId: string;
  userName: string;
  userPhone: string;
  onClose: () => void;
  onToggleSlot: (courtName: string, time: string) => void;
  onToggleSaved: (id: string, e: React.MouseEvent) => void;
  onBookingComplete: (booking: BookingResult) => void;
  onViewBookings: () => void;
  t: ThemeTokens;
}

type SheetStep = 'detail' | 'booking' | 'confirmation';

export default function VenueDetail({
  venue, visible, selectedSlots, isSaved, searchDate,
  userId, userName, userPhone,
  onClose, onToggleSlot, onToggleSaved, onBookingComplete, onViewBookings, t,
}: VenueDetailProps) {
  const [detailTab, setDetailTab] = useState<'avail' | 'info'>('avail');
  const [step, setStep] = useState<SheetStep>('detail');
  const [completedBooking, setCompletedBooking] = useState<BookingResult | null>(null);

  const selArr = useMemo(() => {
    return [...selectedSlots].map((k) => {
      const [courtName, time] = k.split('|');
      const court = venue.courts.find((c) => c.name === courtName);
      const slot = court?.slots.find((s) => s.time === time);
      return { courtName, time, price: slot?.price || 0 };
    });
  }, [selectedSlots, venue.courts]);

  const totalPrice = selArr.reduce((s, x) => s + x.price, 0);

  const handleBookingSuccess = (booking: BookingResult) => {
    setCompletedBooking(booking);
    setStep('confirmation');
    onBookingComplete(booking);
  };

  const handleClose = () => {
    setStep('detail');
    setDetailTab('avail');
    setCompletedBooking(null);
    onClose();
  };

  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, background: t.overlay, zIndex: 6000,
          opacity: visible ? 1 : 0, transition: 'opacity 0.3s',
          pointerEvents: visible ? 'auto' : 'none',
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        maxWidth: 430, margin: '0 auto', background: t.sheetBg,
        borderRadius: '24px 24px 0 0', zIndex: 6001, maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: t.textMuted, opacity: 0.4 }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {step === 'detail' && (
            <>
              {/* Photos */}
              <div style={{ display: 'flex', gap: 8, padding: '8px 16px 12px', overflowX: 'auto' }}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} style={{
                    minWidth: i === 0 ? 200 : 130, height: 130, borderRadius: 14, flexShrink: 0,
                    background: `linear-gradient(${135 + i * 30}deg,${t.bgSurface},${t.bgInput},${t.bgCard})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 36, border: `1px solid ${t.border}`,
                  }}>
                    {['🏓', '🏸', '🎾', '🏆'][i]}
                  </div>
                ))}
              </div>

              {/* Header */}
              <div style={{ padding: '4px 20px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: 21, fontWeight: 800, color: t.text, margin: 0, lineHeight: 1.2 }}>{venue.name}</h2>
                    <div style={{ fontSize: 13, color: t.textSec, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <PinIcon /> {venue.address}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginLeft: 12, flexShrink: 0 }}>
                    <button
                      onClick={(e) => onToggleSaved(venue.id, e)}
                      style={{
                        width: 40, height: 40, borderRadius: 12, background: t.bgCard,
                        border: `1px solid ${t.border}`, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isSaved ? t.red : t.textSec,
                      }}
                    >
                      <HeartIcon fill={isSaved} />
                    </button>
                    <button style={{
                      width: 40, height: 40, borderRadius: 12, background: t.bgCard,
                      border: `1px solid ${t.border}`, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: t.textSec,
                    }}>
                      <ShareIcon />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: t.accentBg, padding: '6px 12px', borderRadius: 10 }}>
                    <span style={{ color: t.accent }}><StarIcon /></span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: t.text }}>{venue.rating}</span>
                    <span style={{ fontSize: 12, color: t.textSec }}>({venue.reviewCount})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: t.bgCard, padding: '6px 12px', borderRadius: 10, border: `1px solid ${t.border}` }}>
                    <span style={{ color: t.textSec }}><CourtIcon /></span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{venue.courts.length} courts</span>
                  </div>
                  {venue.distance != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: t.bgCard, padding: '6px 12px', borderRadius: 10, border: `1px solid ${t.border}` }}>
                      <span style={{ color: t.textSec }}><PinIcon /></span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{venue.distance} km</span>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: t.accent }}>{formatPrice(venue.priceMin)}</span>
                  <span style={{ fontSize: 14, color: t.textSec }}>to {formatPrice(venue.priceMax)}/hour</span>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${t.border}`, padding: '0 20px' }}>
                {([{ key: 'avail', label: 'Availability' }, { key: 'info', label: 'Info' }] as const).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setDetailTab(tab.key)}
                    style={{
                      flex: 1, padding: '12px 0', background: 'none', border: 'none',
                      cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                      color: detailTab === tab.key ? t.accent : t.textSec,
                      borderBottom: detailTab === tab.key ? `2px solid ${t.accent}` : '2px solid transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ padding: '16px 0 140px' }}>
                {detailTab === 'avail' && (
                  <AvailabilityTab courts={venue.courts} selectedSlots={selectedSlots} onToggleSlot={onToggleSlot} t={t} />
                )}
                {detailTab === 'info' && <InfoTab venue={venue} t={t} />}
              </div>
            </>
          )}

          {step === 'booking' && (
            <BookingForm
              venue={venue}
              selectedSlots={selArr}
              totalPrice={totalPrice}
              searchDate={searchDate}
              userId={userId}
              defaultName={userName}
              defaultPhone={userPhone}
              onBack={() => setStep('detail')}
              onSuccess={handleBookingSuccess}
              t={t}
            />
          )}

          {step === 'confirmation' && completedBooking && (
            <BookingConfirmation
              booking={completedBooking}
              onViewBookings={() => { handleClose(); onViewBookings(); }}
              onDone={handleClose}
              t={t}
            />
          )}
        </div>

        {/* CTA - only show on detail step */}
        {step === 'detail' && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '12px 20px 28px',
            background: `linear-gradient(transparent,${t.sheetBg} 25%)`,
            display: 'flex', gap: 10, alignItems: 'center',
          }}>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: 50, height: 50, borderRadius: 14, background: t.bgCard,
                border: `1px solid ${t.border}`, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.accent, flexShrink: 0, textDecoration: 'none',
              }}
            >
              <DirectionsIcon />
            </a>
            <button
              onClick={() => selArr.length > 0 && setStep('booking')}
              style={{
                flex: 1, padding: '16px 20px', borderRadius: 14, fontFamily: 'inherit',
                background: selArr.length > 0 ? t.accent : t.textMuted,
                color: selArr.length > 0 ? '#000' : '#fff',
                fontWeight: 800, fontSize: 14, border: 'none',
                cursor: selArr.length > 0 ? 'pointer' : 'default',
                letterSpacing: 0.3,
                boxShadow: selArr.length > 0 ? `0 4px 20px ${t.accent}55` : 'none',
                transition: 'all 0.2s',
              }}
            >
              {selArr.length === 0 && 'SELECT COURT & TIME'}
              {selArr.length === 1 && `BOOK ${selArr[0].courtName} at ${selArr[0].time} · ${selArr[0].price >= 1000 ? Math.round(selArr[0].price / 1000) + 'k' : selArr[0].price + 'k'}`}
              {selArr.length > 1 && `BOOK ${selArr.length} SLOTS · ${totalPrice >= 1000 ? Math.round(totalPrice / 1000) + 'k' : totalPrice + 'k'}`}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
