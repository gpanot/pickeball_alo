'use client';

import { darkTheme } from '@/lib/theme';
import type { BookingResult, BookingStatus } from '@/lib/types';
import { formatBookingOrderRef, formatVndFull } from '@/lib/formatters';

const t = darkTheme;

export const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: t.orange,
  payment_submitted: '#E8C547',
  paid: t.blue,
  canceled: t.red,
};

export const STATUS_BG: Record<BookingStatus, string> = {
  pending: `${t.orange}18`,
  payment_submitted: '#E8C54718',
  paid: `${t.blue}18`,
  canceled: `${t.red}10`,
};

export type ProofModalState = { url: string; orderRef: string } | null;

export function slotSummary(slots: { courtName?: string; time?: string }[]): string {
  if (!slots?.length) return '—';
  return slots.map((s) => `${s.courtName ?? '?'} ${s.time ?? ''}`).join(', ');
}

export function formatRelativeTime(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function BookingCardCompact({
  b,
  busyId,
  rejectId,
  rejectNote,
  onRejectNote,
  onRejectId,
  onPatch,
  onProof,
  showDate = true,
  extra,
}: {
  b: BookingResult;
  busyId: string | null;
  rejectId: string | null;
  rejectNote: string;
  onRejectNote: (v: string) => void;
  onRejectId: (v: string | null) => void;
  onPatch: (id: string, body: Record<string, unknown>) => void;
  onProof?: (state: ProofModalState) => void;
  showDate?: boolean;
  extra?: React.ReactNode;
}) {
  const dim = b.status === 'canceled';

  return (
    <div
      style={{
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: 10,
        padding: '10px 12px',
        opacity: dim ? 0.5 : 1,
        borderLeft: `3px solid ${STATUS_COLORS[b.status]}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>{formatBookingOrderRef(b.orderId)}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: STATUS_COLORS[b.status],
            background: STATUS_BG[b.status],
            padding: '2px 7px',
            borderRadius: 6,
            textTransform: 'uppercase',
            letterSpacing: 0.3,
          }}
        >
          {b.status === 'payment_submitted' ? 'PAY SENT' : b.status}
        </span>
        {showDate && (
          <span style={{ fontSize: 11, color: t.textMuted, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            {b.date}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{b.userName}</span>
        <a href={`tel:${b.userPhone}`} style={{ color: t.blue, fontSize: 12, textDecoration: 'none' }}>
          {b.userPhone}
        </a>
        <span style={{ fontSize: 12, color: t.textSec, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          {formatVndFull(b.totalPrice)}
        </span>
      </div>

      <div style={{ fontSize: 12, color: t.textSec, marginTop: 3 }}>
        {slotSummary(b.slots as { courtName?: string; time?: string }[])}
      </div>

      {b.notes && (
        <div style={{ fontSize: 11, color: t.textSec, marginTop: 3 }}>Note: {b.notes}</div>
      )}
      {b.adminNote && (
        <div style={{ fontSize: 11, color: t.orange, marginTop: 2 }}>Admin: {b.adminNote}</div>
      )}
      {b.paymentNote && (
        <div style={{ fontSize: 11, color: t.orange, marginTop: 2 }}>Payment: {b.paymentNote}</div>
      )}

      {b.paymentProofUrl && (b.status === 'payment_submitted' || b.status === 'paid') && (
        <button
          type="button"
          onClick={() => onProof?.({ url: b.paymentProofUrl!, orderRef: formatBookingOrderRef(b.orderId) })}
          style={{
            marginTop: 6,
            padding: 4,
            border: `1px solid ${t.blue}44`,
            borderRadius: 8,
            background: `${t.blue}08`,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <img
            src={b.paymentProofUrl}
            alt="Proof"
            style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }}
          />
          <span style={{ fontSize: 11, color: t.blue, fontWeight: 600, paddingRight: 8 }}>Tap to enlarge</span>
        </button>
      )}

      {b.status === 'pending' && (
        <div style={{ marginTop: 8 }}>
          {rejectId === b.id ? (
            <>
              <textarea
                value={rejectNote}
                onChange={(e) => onRejectNote(e.target.value)}
                placeholder="Reason (optional)"
                rows={2}
                style={textareaStyle}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" disabled={busyId === b.id} onClick={() => onPatch(b.id, { status: 'canceled', adminNote: rejectNote })} style={btnSmReject}>
                  Confirm reject
                </button>
                <button type="button" onClick={() => onRejectId(null)} style={btnSmGhost}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" disabled={busyId === b.id} onClick={() => onRejectId(b.id)} style={btnSmReject}>
                Reject
              </button>
            </div>
          )}
        </div>
      )}

      {b.status === 'payment_submitted' && (
        <div style={{ marginTop: 8 }}>
          {rejectId === b.id ? (
            <>
              <textarea
                value={rejectNote}
                onChange={(e) => onRejectNote(e.target.value)}
                placeholder="Note if not received (optional)"
                rows={2}
                style={textareaStyle}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" disabled={busyId === b.id} onClick={() => onPatch(b.id, { status: 'pending', paymentNote: rejectNote })} style={btnSmGhost}>
                  Confirm not received
                </button>
                <button type="button" onClick={() => onRejectId(null)} style={btnSmGhost}>
                  Back
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" disabled={busyId === b.id} onClick={() => onPatch(b.id, { status: 'paid' })} style={btnSmOk}>
                Confirm paid
              </button>
              <button type="button" disabled={busyId === b.id} onClick={() => onRejectId(b.id)} style={btnSmGhost}>
                Not received
              </button>
            </div>
          )}
        </div>
      )}

      {extra}
    </div>
  );
}

export const btnSmOk: React.CSSProperties = {
  flex: 1,
  padding: '7px 12px',
  borderRadius: 6,
  border: 'none',
  background: darkTheme.green,
  color: '#fff',
  fontWeight: 600,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

export const btnSmReject: React.CSSProperties = {
  flex: 1,
  padding: '7px 12px',
  borderRadius: 6,
  border: 'none',
  background: darkTheme.red,
  color: '#fff',
  fontWeight: 600,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

export const btnSmGhost: React.CSSProperties = {
  padding: '7px 12px',
  borderRadius: 6,
  border: `1px solid ${darkTheme.border}`,
  background: 'transparent',
  color: darkTheme.textSec,
  fontFamily: 'inherit',
  cursor: 'pointer',
  fontSize: 12,
};

export const btnSmWarn: React.CSSProperties = {
  flex: 1,
  padding: '7px 12px',
  borderRadius: 6,
  border: 'none',
  background: darkTheme.orange,
  color: '#000',
  fontWeight: 600,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

export const textareaStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  borderRadius: 6,
  border: `1px solid ${darkTheme.border}`,
  background: darkTheme.bgInput,
  color: darkTheme.text,
  padding: 6,
  fontFamily: 'inherit',
  fontSize: 12,
  marginBottom: 6,
};
