'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckIcon, CloseIcon } from '@/components/ui/Icons';
import type { ThemeTokens } from '@/lib/theme';
import type { BookingResult, BookingSlot, VenueResult } from '@/lib/types';
import { formatBookingOrderRef, formatVndFull } from '@/lib/formatters';
import {
  buildVietQrImageUrl,
  pickDynamicQrPayment,
  pickPrimaryManualPayment,
  resolveStaticQrUrl,
} from '@/lib/vietqr';
import { markPaymentSubmitted } from '@/lib/api';

function BankCard({
  bank,
  accountNumber,
  accountName,
  t,
}: {
  bank: string;
  accountNumber: string;
  accountName: string;
  t: ThemeTokens;
}) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${t.border}`,
        background: t.bgCard,
        padding: 14,
        marginBottom: 4,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 800, color: t.text, marginBottom: 6 }}>{bank}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: t.accent, letterSpacing: 0.3, marginBottom: 4 }}>{accountNumber}</div>
      <div style={{ fontSize: 12, color: t.textSec, lineHeight: 1.35 }}>{accountName}</div>
    </div>
  );
}

async function downloadQrInBrowser(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = obj;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(obj);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function useCountdown(deadline: string | null | undefined) {
  const [secsLeft, setSecsLeft] = useState(() => {
    if (!deadline) return -1;
    return Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000));
      setSecsLeft(remaining);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [deadline]);

  const mm = Math.floor(secsLeft / 60);
  const ss = secsLeft % 60;
  const display = secsLeft >= 0 ? `${mm}:${ss.toString().padStart(2, '0')}` : '';
  const expired = secsLeft === 0 && deadline != null;

  return { secsLeft, display, expired };
}

export default function VietQrPaymentWeb({
  booking,
  venue,
  userId,
  t,
  showSuccessHeader = true,
  onBookingUpdated,
}: {
  booking: BookingResult;
  venue: VenueResult;
  userId: string;
  t: ThemeTokens;
  showSuccessHeader?: boolean;
  onBookingUpdated?: (b: BookingResult) => void;
}) {
  const [live, setLive] = useState(booking);
  useEffect(() => setLive(booking), [booking]);

  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState('');
  const [proofDataUrl, setProofDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { display: timerDisplay, expired } = useCountdown(live.paymentDeadline);

  const orderRef = formatBookingOrderRef(live.orderId);
  const slots = live.slots as BookingSlot[];
  const slotSummary = slots.map((s) => `${s.courtName} ${s.time}`).join(' · ');

  const payments = venue.payments ?? [];
  const dynamicPay = useMemo(() => pickDynamicQrPayment(payments), [payments]);
  const manualPay = useMemo(() => pickPrimaryManualPayment(payments.length ? payments : undefined), [payments]);

  const qrUri = useMemo(() => {
    if (dynamicPay?.bankBin) {
      return buildVietQrImageUrl({
        bankBin: dynamicPay.bankBin,
        accountNumber: dynamicPay.accountNumber,
        accountName: dynamicPay.accountName,
        amountVnd: live.totalPrice,
        orderId: live.orderId,
      });
    }
    return null;
  }, [dynamicPay, live.totalPrice, live.orderId]);

  const staticQrUrl = useMemo(
    () => (qrUri ? null : resolveStaticQrUrl(payments.length ? payments : undefined, manualPay)),
    [payments, manualPay, qrUri],
  );

  const activeQrUrl = qrUri ?? staticQrUrl;

  const payScenario = useMemo(() => {
    if (qrUri) return 3 as const;
    if (manualPay) return 2 as const;
    return 1 as const;
  }, [qrUri, manualPay]);

  const displayBank = (dynamicPay ?? manualPay)?.bank ?? '';
  const displayName = (dynamicPay ?? manualPay)?.accountName ?? '';
  const displayAcct = (dynamicPay ?? manualPay)?.accountNumber ?? '';
  const showBankCard = payScenario !== 1 && Boolean(displayAcct);

  const qrSize = 200;

  const onDownloadQr = async () => {
    if (!activeQrUrl) return;
    setDownloading(true);
    setErr('');
    try {
      await downloadQrInBrowser(activeQrUrl, `courtmap-qr-${orderRef}.png`);
    } catch {
      setErr('Could not download the QR');
    } finally {
      setDownloading(false);
    }
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErr('Image must be under 5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProofDataUrl(reader.result);
        setErr('');
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const clearProof = useCallback(() => {
    setProofDataUrl(null);
    setErr('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const canSubmit = !!proofDataUrl && !submitting && !expired && live.status === 'pending';

  const qrPad = 10;
  const qrColWidth = qrSize + qrPad * 2;
  const proofMinH = qrColWidth + 8 + 44;

  const qrRow = (uri: string) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        gap: 12,
        width: '100%',
        marginBottom: 12,
      }}
    >
      <div
        style={{
          width: qrColWidth,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div style={{ padding: 0, borderRadius: 12 }}>
          <div style={{ background: '#fff', padding: qrPad, borderRadius: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={uri} alt="Payment QR" width={qrSize} height={qrSize} style={{ display: 'block' }} />
          </div>
        </div>
        <button
          type="button"
          disabled={downloading}
          onClick={() => void onDownloadQr()}
          style={{
            width: '100%',
            padding: '10px 8px',
            borderRadius: 12,
            border: `1px solid ${t.border}`,
            background: t.bgInput,
            color: t.accent,
            fontWeight: 800,
            fontSize: 13,
            cursor: downloading ? 'wait' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {downloading ? '…' : 'Download QR'}
        </button>
      </div>

      <div style={{ flex: 1, minWidth: 0, position: 'relative', minHeight: proofMinH }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '100%',
            minHeight: proofMinH,
            borderRadius: 12,
            border: `1px ${proofDataUrl ? 'solid' : 'dashed'} ${proofDataUrl ? t.accent : t.border}`,
            background: proofDataUrl ? `${t.accent}15` : t.bgInput,
            color: t.textSec,
            fontWeight: 800,
            fontSize: 13,
            lineHeight: 1.35,
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: proofDataUrl ? 0 : 12,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          {proofDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proofDataUrl}
              alt="Payment proof preview"
              style={{ width: '100%', height: '100%', minHeight: proofMinH, objectFit: 'cover', borderRadius: 11 }}
            />
          ) : (
            'Click to upload payment proof'
          )}
        </button>
        {proofDataUrl ? (
          <button
            type="button"
            aria-label="Remove payment proof"
            onClick={clearProof}
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              zIndex: 2,
              width: 30,
              height: 30,
              borderRadius: 15,
              border: `1px solid ${t.border}`,
              background: t.bgCard,
              color: t.text,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            <CloseIcon size={16} />
          </button>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );

  if (live.status === 'payment_submitted') {
    return (
      <div style={{ padding: '24px 8px', textAlign: 'center' }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            background: t.accentBgStrong,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            color: t.accent,
          }}
        >
          <CheckIcon size={36} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: t.text, margin: 0 }}>Payment submitted</h2>
        <p style={{ color: t.textSec, marginTop: 8 }}>The venue will verify your transfer shortly.</p>
        <p style={{ fontSize: 22, fontWeight: 900, color: t.accent, marginTop: 16 }}>{orderRef}</p>
      </div>
    );
  }

  const paid = async () => {
    if (!proofDataUrl) {
      setErr('Please upload your payment screenshot first');
      return;
    }
    setErr('');
    setSubmitting(true);
    try {
      const u = await markPaymentSubmitted(live.id, userId, proofDataUrl);
      setLive(u);
      onBookingUpdated?.(u);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const main = (
    <div style={{ textAlign: 'left' }}>
      {showSuccessHeader ? (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              background: t.accentBgStrong,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              color: t.accent,
            }}
          >
            <CheckIcon size={36} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: t.text, margin: '0 0 4px' }}>Booking request sent!</h2>
          <p style={{ color: t.textSec, margin: 0, fontSize: 14 }}>Pay to confirm your booking</p>
        </div>
      ) : null}

      {timerDisplay ? (
        <div
          style={{
            borderRadius: 10,
            border: `1px solid ${expired ? t.red : t.orange}`,
            background: expired ? `${t.red}18` : `${t.orange}18`,
            padding: 10,
            marginBottom: 12,
            textAlign: 'center',
            fontWeight: 800,
            fontSize: 15,
            color: expired ? t.red : t.orange,
          }}
        >
          {expired ? 'Time expired — booking will be cancelled' : `Time left to pay: ${timerDisplay}`}
        </div>
      ) : null}

      <div
        style={{
          border: `1px solid ${t.border}`,
          borderRadius: 14,
          padding: 14,
          marginBottom: 16,
          background: t.bgCard,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900, color: t.accent }}>{orderRef}</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: t.text, marginTop: 6 }}>{live.venueName}</div>
        <div style={{ fontSize: 13, color: t.textSec, marginTop: 4 }}>
          {live.date} · {slotSummary}
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: t.accent, marginTop: 8 }}>{formatVndFull(live.totalPrice)}</div>
      </div>

      <div style={{ fontWeight: 800, fontSize: 16, color: t.text, marginBottom: 10 }}>
        {payScenario === 3 ? 'Pay via VietQR' : payScenario === 2 ? 'Pay by bank transfer' : 'Payment'}
      </div>

      {payScenario === 1 ? (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            border: `1px solid ${t.border}`,
            background: t.bgInput,
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          <p style={{ color: t.textSec, fontSize: 14 }}>
            This venue has not added payment details yet. Please contact them to complete payment.
          </p>
          {venue.phone ? (
            <a href={`tel:${venue.phone}`} style={{ display: 'inline-block', marginTop: 12, color: t.accent, fontWeight: 800 }}>
              {venue.phone}
            </a>
          ) : null}
        </div>
      ) : null}

      {payScenario === 3 && qrUri ? qrRow(qrUri) : null}

      {payScenario === 2 && staticQrUrl ? (
        <>
          {qrRow(staticQrUrl)}
          <p style={{ fontSize: 13, color: t.textSec, marginTop: 4, marginBottom: 8, lineHeight: 1.4 }}>
            Save the QR and upload it in your bank app. Your amount is shown on your booking above.
          </p>
        </>
      ) : payScenario === 2 && !staticQrUrl ? (
        <p style={{ color: t.textSec, fontSize: 14, marginBottom: 16, textAlign: 'center' }}>
          No QR on file — use the account details below.
        </p>
      ) : null}

      {payScenario === 1 ? (
        <>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%',
                minHeight: 100,
                borderRadius: 12,
                border: `1px ${proofDataUrl ? 'solid' : 'dashed'} ${proofDataUrl ? t.accent : t.border}`,
                background: proofDataUrl ? `${t.accent}15` : t.bgInput,
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: proofDataUrl ? 0 : 16,
                overflow: 'hidden',
              }}
            >
              {proofDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={proofDataUrl} alt="Proof" style={{ width: '100%', maxHeight: 200, objectFit: 'contain' }} />
              ) : (
                <span style={{ color: t.textSec, fontSize: 14 }}>Click to upload payment screenshot</span>
              )}
            </button>
            {proofDataUrl ? (
              <button
                type="button"
                aria-label="Remove payment proof"
                onClick={clearProof}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 2,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  border: `1px solid ${t.border}`,
                  background: t.bgCard,
                  color: t.text,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  fontFamily: 'inherit',
                }}
              >
                <CloseIcon size={16} />
              </button>
            ) : null}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </>
      ) : null}

      {showBankCard ? (
        <div style={{ marginTop: 4 }}>
          <BankCard bank={displayBank} accountNumber={displayAcct} accountName={displayName} t={t} />
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        maxHeight: showSuccessHeader ? 'min(85vh, 720px)' : '100%',
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          paddingBottom: 8,
        }}
      >
        {main}
      </div>
      <div
        style={{
          flexShrink: 0,
          paddingTop: 12,
          borderTop: `1px solid ${t.border}`,
        }}
      >
        {err ? <p style={{ color: t.red, fontSize: 13, marginBottom: 8 }}>{err}</p> : null}
        {!proofDataUrl && !expired ? (
          <p style={{ color: t.textSec, fontSize: 12, textAlign: 'center', margin: '0 0 8px' }}>
            Upload your payment screenshot to enable submit
          </p>
        ) : null}
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => void paid()}
          style={{
            width: '100%',
            padding: '16px 20px',
            borderRadius: 14,
            border: 'none',
            background: canSubmit ? t.accent : `${t.accent}40`,
            color: '#000',
            fontWeight: 800,
            fontSize: 15,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            opacity: submitting ? 0.7 : canSubmit ? 1 : 0.6,
          }}
        >
          {submitting ? '…' : 'I HAVE PAID'}
        </button>
      </div>
    </div>
  );
}
