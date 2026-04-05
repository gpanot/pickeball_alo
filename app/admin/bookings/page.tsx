'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { darkTheme } from '@/lib/theme';
import { readAdminSession } from '@/lib/admin-storage';
import { adminAuthHeaders } from '@/lib/admin-api';
import type { BookingResult, BookingStatus } from '@/lib/types';

type ProofModalState = { url: string; orderRef: string } | null;
import { formatBookingOrderRef, formatVndFull } from '@/lib/formatters';

const t = darkTheme;

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: t.orange,
  payment_submitted: '#E8C547',
  paid: t.blue,
  canceled: t.red,
};

export default function AdminBookingsPage() {
  const session = useMemo(() => readAdminSession(), []);
  const [list, setList] = useState<BookingResult[]>([]);
  const [status, setStatus] = useState<string>('all');
  const [date, setDate] = useState<string>('all');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [proofModal, setProofModal] = useState<ProofModalState>(null);

  const load = useCallback(() => {
    if (!session) return;
    const params = new URLSearchParams({ venueId: session.venueId });
    if (status !== 'all') params.set('status', status);
    if (date !== 'all') params.set('date', date);
    if (q.trim()) params.set('q', q.trim());
    fetch(`/api/admin/bookings?${params}`, { headers: adminAuthHeaders(session.token) })
      .then((r) => r.json())
      .then((rows: BookingResult[]) =>
        setList(
          Array.isArray(rows)
            ? rows.sort((a, b) => {
                const dc = b.date.localeCompare(a.date);
                if (dc !== 0) return dc;
                return +new Date(b.createdAt) - +new Date(a.createdAt);
              })
            : [],
        ),
      )
      .catch(() => setList([]));
  }, [session, status, date, q]);

  useEffect(() => {
    const tmr = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(tmr);
  }, [load, q]);

  const patch = async (id: string, body: Record<string, unknown>) => {
    if (!session) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(session.token) },
        body: JSON.stringify({ ...body, reviewedBy: session.venueName }),
      });
      if (!res.ok) throw new Error();
      load();
    } catch {
      alert('Update failed');
    } finally {
      setBusyId(null);
      setRejectId(null);
      setRejectNote('');
    }
  };

  if (!session) return null;

  return (
    <div>
      <h1 style={{ margin: '0 0 16px', fontSize: 22 }}>All bookings</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(['all', 'pending', 'payment_submitted', 'paid', 'canceled'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                border: `1px solid ${status === s ? t.blue : t.border}`,
                background: status === s ? `${t.blue}22` : t.bgCard,
                color: status === s ? t.blue : t.textSec,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textTransform: 'capitalize',
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={date === 'all' ? '' : date}
          onChange={(e) => setDate(e.target.value || 'all')}
          style={{
            padding: 10,
            borderRadius: 10,
            border: `1px solid ${t.border}`,
            background: t.bgInput,
            color: t.text,
            fontFamily: 'inherit',
          }}
        />
        <button
          type="button"
          onClick={() => setDate('all')}
          style={{
            alignSelf: 'flex-start',
            fontSize: 12,
            color: t.blue,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Clear date (all dates)
        </button>
        <input
          type="search"
          placeholder="Search name, phone, or order ref (CM-…)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${t.border}`,
            background: t.bgInput,
            color: t.text,
            fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.map((b) => {
          const dim = b.status === 'canceled';
          return (
            <div
              key={b.id}
              style={{
                background: t.bgCard,
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                padding: 14,
                opacity: dim ? 0.55 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 800 }}>{formatBookingOrderRef(b.orderId)}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: STATUS_COLORS[b.status],
                    textTransform: 'uppercase',
                  }}
                >
                  {b.status}
                </span>
              </div>
              <div style={{ marginTop: 8, fontSize: 15 }}>{b.userName}</div>
              <a href={`tel:${b.userPhone}`} style={{ color: t.blue, fontSize: 14 }}>
                {b.userPhone}
              </a>
              <div style={{ fontSize: 13, color: t.textSec, marginTop: 8 }}>
                {b.date} · {formatVndFull(b.totalPrice)}
              </div>
              {b.notes ? (
                <div style={{ fontSize: 13, color: t.textSec, marginTop: 4 }}>Player: {b.notes}</div>
              ) : null}
              {b.adminNote ? (
                <div style={{ fontSize: 13, color: t.orange, marginTop: 4 }}>Admin: {b.adminNote}</div>
              ) : null}
              {b.paymentNote ? (
                <div style={{ fontSize: 13, color: t.orange, marginTop: 4 }}>Payment: {b.paymentNote}</div>
              ) : null}
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6 }}>
                {new Date(b.createdAt).toLocaleString()}
              </div>

              {b.status === 'pending' && (
                <div style={{ marginTop: 12 }}>
                  {rejectId === b.id ? (
                    <>
                      <textarea
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="Reason (optional)"
                        rows={2}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          borderRadius: 8,
                          border: `1px solid ${t.border}`,
                          background: t.bgInput,
                          color: t.text,
                          padding: 8,
                          fontFamily: 'inherit',
                          marginBottom: 8,
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          disabled={busyId === b.id}
                          onClick={() => patch(b.id, { status: 'canceled', adminNote: rejectNote })}
                          style={btnReject}
                        >
                          Confirm reject
                        </button>
                        <button type="button" onClick={() => setRejectId(null)} style={btnGhost}>
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        disabled={busyId === b.id}
                        onClick={() => setRejectId(b.id)}
                        style={btnReject}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              )}

              {b.paymentProofUrl && (b.status === 'payment_submitted' || b.status === 'paid') ? (
                <button
                  type="button"
                  onClick={() => setProofModal({ url: b.paymentProofUrl!, orderRef: formatBookingOrderRef(b.orderId) })}
                  style={{
                    marginTop: 10,
                    padding: 0,
                    border: `1px solid ${t.border}`,
                    borderRadius: 8,
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <img
                    src={b.paymentProofUrl}
                    alt="Proof"
                    style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 7 }}
                  />
                  <span style={{ fontSize: 12, color: t.blue, fontWeight: 600, paddingRight: 10 }}>View proof</span>
                </button>
              ) : null}

              {b.status === 'payment_submitted' && (
                <div style={{ marginTop: 12 }}>
                  {rejectId === b.id ? (
                    <>
                      <textarea
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="Note if not received (optional)"
                        rows={2}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          borderRadius: 8,
                          border: `1px solid ${t.border}`,
                          background: t.bgInput,
                          color: t.text,
                          padding: 8,
                          fontFamily: 'inherit',
                          marginBottom: 8,
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          disabled={busyId === b.id}
                          onClick={() => patch(b.id, { status: 'pending', paymentNote: rejectNote })}
                          style={btnGhost}
                        >
                          Confirm not received
                        </button>
                        <button type="button" onClick={() => setRejectId(null)} style={btnGhost}>
                          Back
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        disabled={busyId === b.id}
                        onClick={() => patch(b.id, { status: 'paid' })}
                        style={btnOk}
                      >
                        Confirm paid
                      </button>
                      <button
                        type="button"
                        disabled={busyId === b.id}
                        onClick={() => setRejectId(b.id)}
                        style={btnGhost}
                      >
                        Not received
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {proofModal ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={() => setProofModal(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
              Payment proof — {proofModal.orderRef}
            </div>
            <img
              src={proofModal.url}
              alt="Payment proof"
              style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }}
            />
            <button
              type="button"
              onClick={() => setProofModal(null)}
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                width: 32,
                height: 32,
                borderRadius: 16,
                border: 'none',
                background: '#fff',
                color: '#000',
                fontWeight: 900,
                fontSize: 18,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const btnOk: React.CSSProperties = {
  flex: 1,
  padding: 10,
  borderRadius: 8,
  border: 'none',
  background: darkTheme.green,
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const btnReject: React.CSSProperties = {
  flex: 1,
  padding: 10,
  borderRadius: 8,
  border: 'none',
  background: darkTheme.red,
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const btnGhost: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: `1px solid ${darkTheme.border}`,
  background: 'transparent',
  color: darkTheme.textSec,
  fontFamily: 'inherit',
  cursor: 'pointer',
};
