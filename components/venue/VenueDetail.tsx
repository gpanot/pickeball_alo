'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HeartIcon, ShareIcon, StarIcon, CourtIcon, PinIcon, DirectionsIcon } from '@/components/ui/Icons';
import AvailabilityTab from './AvailabilityTab';
import PricingTab from './PricingTab';
import InfoTab from './InfoTab';
import BookingForm from '@/components/booking/BookingForm';
import BookingConfirmation from '@/components/booking/BookingConfirmation';
import {
  earliestSelectedSlotTime,
  formatDateLabel,
  formatPrice,
  getNextDays,
  START_HOUR_OPTIONS,
} from '@/lib/formatters';
import type { ThemeTokens } from '@/lib/theme';
import type { VenueResult, BookingResult } from '@/lib/types';
import { getVenue } from '@/lib/api';

interface VenueDetailProps {
  venue: VenueResult;
  visible: boolean;
  /** When true on open, go straight to Confirm Booking if there are selected slots. */
  initialJumpToBooking?: boolean;
  selectedSlots: Set<string>;
  isSaved: boolean;
  searchDate: string;
  /** Index into `getNextDays(7)`; changing day refetches slots for this venue. */
  selectedDateIndex: number;
  onAvailabilityDateChange: (dateIndex: number) => void;
  detailDateLoading?: boolean;
  /** Search time-of-day index; used to scroll availability when no slots are pre-selected. */
  selectedTimeIndex: number;
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

function CompactAvailabilityDateStrip({
  selectedDateIndex,
  loading,
  onSelect,
  t,
}: {
  selectedDateIndex: number;
  loading: boolean;
  onSelect: (i: number) => void;
  t: ThemeTokens;
}) {
  const dates = getNextDays(7);
  return (
    <div style={{ padding: '0 20px 12px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: t.textMuted, marginBottom: 8 }}>
        Date
      </div>
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 2,
          opacity: loading ? 0.55 : 1,
          pointerEvents: loading ? 'none' : 'auto',
        }}
      >
        {dates.map((d, i) => {
          const { day, date } = formatDateLabel(d);
          const active = i === selectedDateIndex;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              style={{
                minWidth: 56,
                padding: '6px 10px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                background: active ? t.accent : t.bgCard,
                color: active ? '#000' : t.text,
                outline: active ? 'none' : `1px solid ${t.border}`,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 9, fontWeight: 600, opacity: active ? 0.75 : 0.65 }}>{day}</span>
              <span style={{ fontSize: 12, fontWeight: 800 }}>{date}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function VenueDetail({
  venue,
  visible,
  initialJumpToBooking = false,
  selectedSlots,
  isSaved,
  searchDate,
  selectedDateIndex,
  onAvailabilityDateChange,
  detailDateLoading = false,
  selectedTimeIndex,
  userId,
  userName,
  userPhone,
  onClose,
  onToggleSlot,
  onToggleSaved,
  onBookingComplete,
  onViewBookings,
  t,
}: VenueDetailProps) {
  const [detailTab, setDetailTab] = useState<'avail' | 'pricing' | 'info'>('avail');
  /** Search/list venues omit `payments`; hydrate from GET /api/venues/[id] for booking payment UI. */
  const [paymentHydration, setPaymentHydration] = useState<VenueResult | null>(null);

  useEffect(() => {
    setPaymentHydration(null);
  }, [venue.id]);

  useEffect(() => {
    if (!visible) return;
    if (venue.payments !== undefined) return;
    let cancelled = false;
    void getVenue(venue.id, searchDate).then((v) => {
      if (!cancelled) setPaymentHydration(v);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, venue.id, searchDate, venue.payments]);

  const displayVenue: VenueResult =
    venue.payments !== undefined
      ? venue
      : paymentHydration?.id === venue.id
        ? { ...paymentHydration, distance: paymentHydration.distance ?? venue.distance }
        : venue;

  const pricingTables = Array.isArray(displayVenue.pricingTables) ? displayVenue.pricingTables : [];
  const [step, setStep] = useState<SheetStep>('detail');
  const [completedBooking, setCompletedBooking] = useState<BookingResult | null>(null);
  /** When sheet opens: earliest pre-selected time so Availability scrolls there first (not 5am). */
  const [availabilityScrollAnchor, setAvailabilityScrollAnchor] = useState<string | null>(null);
  const selectedSlotsRef = useRef(selectedSlots);
  selectedSlotsRef.current = selectedSlots;
  /** Only apply quick-book jump once per sheet open; slot changes must not re-trigger. */
  const lastSheetOpenKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!visible) {
      lastSheetOpenKeyRef.current = null;
      return;
    }
    const openKey = venue.id;
    const isNewOpen = lastSheetOpenKeyRef.current !== openKey;
    if (!isNewOpen) return;
    lastSheetOpenKeyRef.current = openKey;
    if (initialJumpToBooking && selectedSlots.size > 0) {
      setStep('booking');
    } else {
      setStep('detail');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedSlots only read at sheet open, not on toggle
  }, [visible, venue.id, initialJumpToBooking]);

  useEffect(() => {
    if (!visible) {
      setAvailabilityScrollAnchor(null);
      return;
    }
    const names = displayVenue.courts.map((c) => c.name);
    setAvailabilityScrollAnchor(earliestSelectedSlotTime(selectedSlotsRef.current, names));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- anchor only when sheet opens; court list keyed by venue.id
  }, [visible, displayVenue.courts, venue.id]);

  const selArr = useMemo(() => {
    return [...selectedSlots].map((k) => {
      const [courtName, time] = k.split('|');
      const court = displayVenue.courts.find((c) => c.name === courtName);
      const slot = court?.slots.find((s) => s.time === time);
      return { courtName, time, price: slot?.price || 0 };
    });
  }, [selectedSlots, displayVenue.courts]);

  const totalPrice = selArr.reduce((s, x) => s + x.price, 0);

  const searchHourScrollAnchor = useMemo(() => {
    const h = START_HOUR_OPTIONS[selectedTimeIndex]?.hour ?? 9;
    return `${String(h).padStart(2, '0')}:00`;
  }, [selectedTimeIndex]);

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
        borderRadius: '24px 24px 0 0', zIndex: 6001,
        maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
      }}>
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: t.textMuted, opacity: 0.4 }} />
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
          }}
        >
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
                    <h2 style={{ fontSize: 21, fontWeight: 800, color: t.text, margin: 0, lineHeight: 1.2 }}>{displayVenue.name}</h2>
                    <div style={{ fontSize: 13, color: t.textSec, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <PinIcon /> {displayVenue.address}
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
                    <span style={{ fontWeight: 700, fontSize: 14, color: t.text }}>{displayVenue.rating}</span>
                    <span style={{ fontSize: 12, color: t.textSec }}>({displayVenue.reviewCount})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: t.bgCard, padding: '6px 12px', borderRadius: 10, border: `1px solid ${t.border}` }}>
                    <span style={{ color: t.textSec }}><CourtIcon /></span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{displayVenue.courts.length} courts</span>
                  </div>
                  {displayVenue.distance != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: t.bgCard, padding: '6px 12px', borderRadius: 10, border: `1px solid ${t.border}` }}>
                      <span style={{ color: t.textSec }}><PinIcon /></span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{displayVenue.distance} km</span>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: t.accent }}>{formatPrice(displayVenue.priceMin)}</span>
                  <span style={{ fontSize: 14, color: t.textSec }}>to {formatPrice(displayVenue.priceMax)}/hour</span>
                </div>
              </div>

              {/* Tabs — sticky so long Availability / Pricing / Info stays scrollable under labels */}
              <div
                style={{
                  display: 'flex',
                  borderBottom: `1px solid ${t.border}`,
                  padding: '0 20px',
                  position: 'sticky',
                  top: 0,
                  zIndex: 4,
                  background: t.sheetBg,
                }}
              >
                {([
                  { key: 'avail' as const, label: 'Availability' },
                  { key: 'pricing' as const, label: 'Pricing' },
                  { key: 'info' as const, label: 'Info' },
                ]).map((tab) => (
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

              <div style={{ padding: '16px 0 32px' }}>
                {detailTab === 'avail' && (
                  <>
                    <CompactAvailabilityDateStrip
                      selectedDateIndex={selectedDateIndex}
                      loading={detailDateLoading}
                      onSelect={onAvailabilityDateChange}
                      t={t}
                    />
                    <AvailabilityTab
                      courts={displayVenue.courts}
                      selectedSlots={selectedSlots}
                      scrollAnchorTime={availabilityScrollAnchor ?? searchHourScrollAnchor}
                      onToggleSlot={onToggleSlot}
                      t={t}
                    />
                  </>
                )}
                {detailTab === 'pricing' && (
                  <PricingTab
                    pricingTables={pricingTables}
                    hasMemberPricing={displayVenue.hasMemberPricing}
                    venuePhone={displayVenue.phone}
                    t={t}
                  />
                )}
                {detailTab === 'info' && <InfoTab venue={displayVenue} t={t} />}
              </div>
            </>
          )}

          {step === 'booking' && (
            <BookingForm
              venue={displayVenue}
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
            <BookingConfirmation booking={completedBooking} venue={displayVenue} userId={userId} t={t} />
          )}
        </div>

        {/* CTA — flex footer so the area above scrolls (no absolute overlay blocking scroll) */}
        {step === 'detail' && (
          <div
            style={{
              flexShrink: 0,
              padding: '12px 20px max(28px, env(safe-area-inset-bottom, 0px))',
              paddingTop: 14,
              borderTop: `1px solid ${t.border}`,
              background: t.sheetBg,
              display: 'flex',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${displayVenue.lat},${displayVenue.lng}`}
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
