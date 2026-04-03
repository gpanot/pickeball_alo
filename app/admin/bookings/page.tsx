'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { darkTheme } from '@/lib/theme';
import { readAdminSession } from '@/lib/admin-storage';
import { adminAuthHeaders } from '@/lib/admin-api';
import type { BookingResult, BookingStatus } from '@/lib/types';
import { formatBookingOrderRef, formatVndFull } from '@/lib/formatters';

const t = darkTheme;

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: t.orange,
  booked: t.green,
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
          {(['all', 'pending', 'booked', 'paid', 'canceled'] as const).map((s) => (
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
          placeholder="Search name or phone"
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
                        onClick={() => patch(b.id, { status: 'booked' })}
                        style={btnOk}
                      >
                        Approve
                      </button>
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

              {b.status === 'booked' && (
                <div style={{ marginTop: 12 }}>
                  {rejectId === b.id ? (
                    <>
                      <textarea
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="Cancel note (optional)"
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
                          Confirm cancel
                        </button>
                        <button type="button" onClick={() => setRejectId(null)} style={btnGhost}>
                          Back
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        disabled={busyId === b.id}
                        onClick={() => patch(b.id, { status: 'paid' })}
                        style={btnOk}
                      >
                        Mark paid
                      </button>
                      <button
                        type="button"
                        disabled={busyId === b.id}
                        onClick={() => setRejectId(b.id)}
                        style={btnReject}
                      >
                        Cancel booking
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
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
