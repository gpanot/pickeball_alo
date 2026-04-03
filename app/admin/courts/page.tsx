'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { darkTheme } from '@/lib/theme';
import { readAdminSession } from '@/lib/admin-storage';
import { adminAuthHeaders, withVenueQuery } from '@/lib/admin-api';
import type { CourtResult, VenueResult } from '@/lib/types';
import type { PricingRow } from '@/lib/pricing';
import { formatVndFull } from '@/lib/formatters';

const t = darkTheme;

type AdminPricingTable = {
  id: string;
  name: string;
  dayTypes: string[];
  rows: PricingRow[];
  sortOrder: number;
};

type DateOv = { id: string; date: string; dayType: string; note: string | null };

const DAY_OPTIONS: { value: string; label: string }[] = [
  { value: 'weekday', label: 'Weekday (Mon–Fri)' },
  { value: 'weekend', label: 'Weekend (Sat–Sun)' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

/** 05:00 … 23:30 in 30-minute steps (matches generated slots). */
const HALF_HOUR_TIMES: string[] = (() => {
  const out: string[] = [];
  for (let mins = 5 * 60; mins <= 23 * 60 + 30; mins += 30) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  return out;
})();

function snapToHalfHour(raw: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!m) return HALF_HOUR_TIMES[0]!;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return HALF_HOUR_TIMES[0]!;
  const total = h * 60 + min;
  const snapped = Math.round(total / 30) * 30;
  const lo = 5 * 60;
  const hi = 23 * 60 + 30;
  const clamped = Math.max(lo, Math.min(hi, snapped));
  const hh = Math.floor(clamped / 60);
  const mm = clamped % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function emptyRow(): PricingRow {
  return { startTime: '05:00', endTime: '07:00', walkIn: 60000, member: null };
}

export default function AdminCourtsPage() {
  const [session, setSession] = useState<ReturnType<typeof readAdminSession>>(null);
  const [venue, setVenue] = useState<VenueResult | null>(null);
  const [hasMember, setHasMember] = useState(false);
  const [use30MinSlots, setUse30MinSlots] = useState(true);
  const [pricingTables, setPricingTables] = useState<AdminPricingTable[]>([]);
  const [overrides, setOverrides] = useState<DateOv[]>([]);
  const [busy, setBusy] = useState(false);
  const [newCourtName, setNewCourtName] = useState('');
  const [editCourtName, setEditCourtName] = useState<Record<string, string>>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftDayTypes, setDraftDayTypes] = useState<string[]>([]);
  const [draftRows, setDraftRows] = useState<PricingRow[]>([]);

  const [ovDate, setOvDate] = useState('');
  const [ovType, setOvType] = useState('holiday');
  const [ovNote, setOvNote] = useState('');

  const reloadAll = useCallback(() => {
    const s = readAdminSession();
    if (!s) return;
    setSession(s);
    const h = adminAuthHeaders(s.token);

    fetch(withVenueQuery('/api/admin/venue', s.venueId), { headers: h })
      .then((r) => r.json())
      .then((v: { hasMemberPricing?: boolean; use30MinSlots?: boolean }) => {
        setHasMember(Boolean(v.hasMemberPricing));
        setUse30MinSlots(v.use30MinSlots !== false);
      });

    fetch(withVenueQuery('/api/admin/pricing', s.venueId), { headers: h })
      .then((r) => r.json())
      .then((rows: AdminPricingTable[]) => setPricingTables(Array.isArray(rows) ? rows : []));

    fetch(withVenueQuery('/api/admin/date-overrides', s.venueId), { headers: h })
      .then((r) => r.json())
      .then((rows: DateOv[]) => setOverrides(Array.isArray(rows) ? rows : []));

    fetch(`/api/venues/${s.venueId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.courts)) setVenue(data);
        else setVenue(null);
      })
      .catch(() => setVenue(null));
  }, []);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  const toggleMember = async () => {
    const s = readAdminSession();
    if (!s) return;
    setBusy(true);
    try {
      const res = await fetch(withVenueQuery('/api/admin/venue', s.venueId), {
        method: 'PUT',
        headers: adminAuthHeaders(s.token),
        body: JSON.stringify({ hasMemberPricing: !hasMember }),
      });
      if (!res.ok) throw new Error();
      setHasMember(!hasMember);
    } catch {
      alert('Could not update');
    } finally {
      setBusy(false);
    }
  };

  const toggle30MinSlots = async () => {
    const s = readAdminSession();
    if (!s) return;
    setBusy(true);
    try {
      const res = await fetch(withVenueQuery('/api/admin/venue', s.venueId), {
        method: 'PUT',
        headers: adminAuthHeaders(s.token),
        body: JSON.stringify({ use30MinSlots: !use30MinSlots }),
      });
      if (!res.ok) throw new Error();
      setUse30MinSlots(!use30MinSlots);
    } catch {
      alert('Could not update');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (tbl: AdminPricingTable) => {
    setEditingId(tbl.id);
    setDraftName(tbl.name);
    setDraftDayTypes([...tbl.dayTypes]);
    setDraftRows(
      tbl.rows.length
        ? tbl.rows.map((r) => ({
            ...r,
            startTime: snapToHalfHour(r.startTime),
            endTime: snapToHalfHour(r.endTime),
          }))
        : [emptyRow()],
    );
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveTable = async () => {
    const s = readAdminSession();
    if (!s || !editingId) return;
    if (!draftName.trim() || draftDayTypes.length === 0) {
      alert('Name and at least one day type required');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        withVenueQuery(`/api/admin/pricing/${editingId}`, s.venueId),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(s.token) },
          body: JSON.stringify({
            name: draftName.trim(),
            dayTypes: draftDayTypes,
            rows: draftRows,
          }),
        },
      );
      if (!res.ok) throw new Error();
      setEditingId(null);
      reloadAll();
    } catch {
      alert('Save failed');
    } finally {
      setBusy(false);
    }
  };

  const deleteTable = async (id: string) => {
    if (!confirm('Delete this pricing table?')) return;
    const s = readAdminSession();
    if (!s) return;
    setBusy(true);
    try {
      const res = await fetch(
        withVenueQuery(`/api/admin/pricing/${id}`, s.venueId),
        { method: 'DELETE', headers: adminAuthHeaders(s.token) },
      );
      if (!res.ok) throw new Error();
      if (editingId === id) setEditingId(null);
      reloadAll();
    } catch {
      alert('Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const addTable = async () => {
    const s = readAdminSession();
    if (!s) return;
    setBusy(true);
    try {
      const res = await fetch(withVenueQuery('/api/admin/pricing', s.venueId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(s.token) },
        body: JSON.stringify({
          name: 'New table',
          dayTypes: ['weekday'],
          rows: [{ startTime: '05:00', endTime: '23:30', walkIn: 80000, member: null }],
          sortOrder: pricingTables.length,
        }),
      });
      if (!res.ok) throw new Error();
      reloadAll();
    } catch {
      alert('Could not add table');
    } finally {
      setBusy(false);
    }
  };

  const addOverride = async () => {
    const s = readAdminSession();
    if (!s || !ovDate) return;
    setBusy(true);
    try {
      const res = await fetch(withVenueQuery('/api/admin/date-overrides', s.venueId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(s.token) },
        body: JSON.stringify({ date: ovDate, dayType: ovType, note: ovNote || null }),
      });
      if (!res.ok) throw new Error();
      setOvDate('');
      setOvNote('');
      reloadAll();
    } catch {
      alert('Could not add override');
    } finally {
      setBusy(false);
    }
  };

  const removeOverride = async (id: string) => {
    const s = readAdminSession();
    if (!s) return;
    setBusy(true);
    try {
      await fetch(withVenueQuery(`/api/admin/date-overrides/${id}`, s.venueId), {
        method: 'DELETE',
        headers: adminAuthHeaders(s.token),
      });
      reloadAll();
    } finally {
      setBusy(false);
    }
  };

  const addCourt = async () => {
    const s = readAdminSession();
    if (!s || !newCourtName.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(withVenueQuery('/api/admin/courts', s.venueId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(s.token) },
        body: JSON.stringify({ name: newCourtName.trim() }),
      });
      if (!res.ok) throw new Error();
      setNewCourtName('');
      reloadAll();
    } catch {
      alert('Could not add court');
    } finally {
      setBusy(false);
    }
  };

  const deleteCourt = async (courtId: string, courtName: string) => {
    if (!confirm(`Delete court “${courtName}”? This removes its slots; existing bookings are unchanged.`)) return;
    const s = readAdminSession();
    if (!s) return;
    clearCourtNameTimer(courtId);
    setEditCourtName((p) => {
      const next = { ...p };
      delete next[courtId];
      return next;
    });
    setBusy(true);
    try {
      const res = await fetch(withVenueQuery(`/api/admin/courts/${courtId}`, s.venueId), {
        method: 'DELETE',
        headers: adminAuthHeaders(s.token),
      });
      if (!res.ok) throw new Error();
      reloadAll();
    } catch {
      alert('Could not delete court');
    } finally {
      setBusy(false);
    }
  };

  const patchCourt = async (
    courtId: string,
    body: Record<string, unknown>,
    opts?: { quiet?: boolean },
  ) => {
    const s = readAdminSession();
    if (!s) return;
    if (!opts?.quiet) setBusy(true);
    try {
      const res = await fetch(
        withVenueQuery(`/api/admin/courts/${courtId}`, s.venueId),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(s.token) },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) throw new Error();
      reloadAll();
    } catch {
      alert('Update failed');
    } finally {
      if (!opts?.quiet) setBusy(false);
    }
  };

  const venueRef = useRef(venue);
  useEffect(() => {
    venueRef.current = venue;
  }, [venue]);

  const editCourtNameRef = useRef(editCourtName);
  useEffect(() => {
    editCourtNameRef.current = editCourtName;
  }, [editCourtName]);

  const courtNameSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    return () => {
      Object.values(courtNameSaveTimers.current).forEach(clearTimeout);
    };
  }, []);

  const clearCourtNameTimer = (courtId: string) => {
    const existing = courtNameSaveTimers.current[courtId];
    if (existing) {
      clearTimeout(existing);
      delete courtNameSaveTimers.current[courtId];
    }
  };

  const saveCourtNameIfChanged = async (courtId: string) => {
    const v = venueRef.current;
    const court = v?.courts.find((c) => c.id === courtId);
    if (!court) return;
    const raw = editCourtNameRef.current[courtId] ?? court.name;
    const trimmed = raw.trim();
    if (!trimmed || trimmed === court.name) return;
    await patchCourt(courtId, { name: trimmed }, { quiet: true });
    setEditCourtName((p) => {
      const next = { ...p };
      delete next[courtId];
      return next;
    });
  };

  const scheduleCourtNameSave = (courtId: string) => {
    clearCourtNameTimer(courtId);
    courtNameSaveTimers.current[courtId] = setTimeout(() => {
      delete courtNameSaveTimers.current[courtId];
      void saveCourtNameIfChanged(courtId);
    }, 500);
  };

  const flushCourtNameSave = (courtId: string) => {
    clearCourtNameTimer(courtId);
    void saveCourtNameIfChanged(courtId);
  };

  if (!session) {
    return <div style={{ color: t.textSec }}>Loading…</div>;
  }

  const card: React.CSSProperties = {
    background: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  };

  const toggleDay = (value: string) => {
    setDraftDayTypes((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value],
    );
  };

  return (
    <div>
      <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>Courts &amp; pricing</h1>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: t.textSec, maxWidth: 720 }}>
        Courts are a simple list. Prices are defined in <strong style={{ color: t.text }}>time bands</strong> per
        pricing table; the app generates 30-minute slots from those bands for each calendar day.
      </p>

      <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>Courts</h2>
      {!venue || !venue.courts ? (
        <div style={{ color: t.textSec }}>Loading courts…</div>
      ) : (
        <div
          style={{
            marginBottom: 24,
            border: `1px solid ${t.border}`,
            borderRadius: 8,
            overflow: 'hidden',
            background: t.bgCard,
          }}
        >
          {venue.courts.map((c: CourtResult, idx: number) => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                borderTop: idx === 0 ? undefined : `1px solid ${t.border}`,
                fontSize: 13,
              }}
            >
              <input
                value={editCourtName[c.id] ?? c.name}
                onChange={(e) => {
                  const v = e.target.value;
                  setEditCourtName((p) => ({ ...p, [c.id]: v }));
                  editCourtNameRef.current = { ...editCourtNameRef.current, [c.id]: v };
                  scheduleCourtNameSave(c.id);
                }}
                onBlur={() => flushCourtNameSave(c.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
                aria-label="Court name"
                style={{
                  width: 120,
                  maxWidth: '32vw',
                  boxSizing: 'border-box',
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: `1px solid ${t.border}`,
                  background: t.bgInput,
                  color: t.text,
                  fontFamily: 'inherit',
                  fontSize: 13,
                }}
              />
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 12,
                  color: t.textSec,
                  whiteSpace: 'nowrap',
                }}
              >
                <input
                  type="checkbox"
                  checked={c.isAvailable}
                  disabled={busy}
                  onChange={(e) => patchCourt(c.id, { isAvailable: e.target.checked })}
                />
                Active
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => void deleteCourt(c.id, c.name)}
                aria-label={`Delete court ${c.name}`}
                title="Delete court"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                  marginLeft: 4,
                  border: 'none',
                  borderRadius: 6,
                  background: 'transparent',
                  color: t.red,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  opacity: busy ? 0.5 : 1,
                }}
              >
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14ZM10 11v6M14 11v6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <span style={{ fontSize: 11, color: t.textMuted, marginLeft: 'auto' }}>
                {c.slots.filter((s) => !s.isBooked).length} open · {c.slots.length} slots
              </span>
            </div>
          ))}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              borderTop: venue.courts.length ? `1px solid ${t.border}` : undefined,
              background: t.bgSurface,
            }}
          >
            <input
              value={newCourtName}
              onChange={(e) => setNewCourtName(e.target.value)}
              placeholder="Add court…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void addCourt();
              }}
              style={{
                width: 120,
                flex: '1 1 100px',
                maxWidth: 200,
                boxSizing: 'border-box',
                padding: '4px 8px',
                borderRadius: 6,
                border: `1px solid ${t.border}`,
                background: t.bgInput,
                color: t.text,
                fontFamily: 'inherit',
                fontSize: 13,
              }}
            />
            <button
              type="button"
              disabled={busy || !newCourtName.trim()}
              onClick={addCourt}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: 'none',
                background: t.blue,
                color: '#fff',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Pricing tables</h2>
      <div style={{ ...card, marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            fontSize: 13,
            color: t.textSec,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, minWidth: 200 }}>Member pricing column</span>
            <button
              type="button"
              disabled={busy}
              onClick={toggleMember}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: `1px solid ${t.border}`,
                background: hasMember ? `${t.green}22` : t.bgInput,
                color: hasMember ? t.green : t.textSec,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {hasMember ? 'ON' : 'OFF'}
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 200 }}>
              <div style={{ fontSize: 14, color: t.text, fontWeight: 600 }}>30 min slot booking</div>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4, maxWidth: 420 }}>
                ON: players pick 30-minute slots; price shown is half the hourly rate from your tables.
                OFF: hourly slots only at the full hourly rate.
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={toggle30MinSlots}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: `1px solid ${t.border}`,
                background: use30MinSlots ? `${t.green}22` : t.bgInput,
                color: use30MinSlots ? t.green : t.textSec,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                alignSelf: 'flex-start',
              }}
            >
              {use30MinSlots ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {pricingTables.map((tbl) => (
        <div key={tbl.id} style={card}>
          {editingId === tbl.id ? (
            <div>
              <label style={{ fontSize: 12, color: t.textSec }}>Table name</label>
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: 10,
                  marginBottom: 12,
                  borderRadius: 8,
                  border: `1px solid ${t.border}`,
                  background: t.bgInput,
                  color: t.text,
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ fontSize: 12, color: t.textSec, marginBottom: 8 }}>Applies to</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {DAY_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={draftDayTypes.includes(opt.value)}
                      onChange={() => toggleDay(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              <div style={{ fontSize: 12, color: t.textSec, marginBottom: 8 }}>
                Time bands in 30-minute steps. Amounts in VND.
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: hasMember ? '1fr 1fr 1fr 1fr auto' : '1fr 1fr 1fr auto',
                  gap: 8,
                  marginBottom: 6,
                  alignItems: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: t.textMuted,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                <span>From</span>
                <span>To</span>
                <span>Walk-in</span>
                {hasMember ? <span>Member</span> : null}
                <span style={{ width: 28 }} aria-hidden />
              </div>
              {draftRows.map((row, ri) => (
                <div
                  key={ri}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: hasMember ? '1fr 1fr 1fr 1fr auto' : '1fr 1fr 1fr auto',
                    gap: 8,
                    marginBottom: 8,
                    alignItems: 'center',
                  }}
                >
                  <select
                    value={HALF_HOUR_TIMES.includes(row.startTime) ? row.startTime : snapToHalfHour(row.startTime)}
                    onChange={(e) => {
                      const next = [...draftRows];
                      next[ri] = { ...row, startTime: e.target.value };
                      setDraftRows(next);
                    }}
                    style={cellSelect}
                    aria-label="From time"
                  >
                    {HALF_HOUR_TIMES.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <select
                    value={HALF_HOUR_TIMES.includes(row.endTime) ? row.endTime : snapToHalfHour(row.endTime)}
                    onChange={(e) => {
                      const next = [...draftRows];
                      next[ri] = { ...row, endTime: e.target.value };
                      setDraftRows(next);
                    }}
                    style={cellSelect}
                    aria-label="To time"
                  >
                    {HALF_HOUR_TIMES.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={row.walkIn}
                    onChange={(e) => {
                      const next = [...draftRows];
                      next[ri] = { ...row, walkIn: Math.round(Number(e.target.value) || 0) };
                      setDraftRows(next);
                    }}
                    style={cellIn}
                    aria-label="Walk-in price"
                  />
                  {hasMember ? (
                    <input
                      type="number"
                      value={row.member ?? ''}
                      placeholder="optional"
                      onChange={(e) => {
                        const next = [...draftRows];
                        const v = e.target.value;
                        next[ri] = {
                          ...row,
                          member: v === '' ? null : Math.round(Number(v) || 0),
                        };
                        setDraftRows(next);
                      }}
                      style={cellIn}
                      aria-label="Member price"
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setDraftRows(draftRows.filter((_, i) => i !== ri))}
                    style={{ background: 'none', border: 'none', color: t.red, cursor: 'pointer' }}
                    aria-label="Remove row"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setDraftRows([...draftRows, emptyRow()])}
                style={{
                  marginBottom: 12,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: `1px dashed ${t.border}`,
                  background: 'transparent',
                  color: t.blue,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                + Add row
              </button>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={saveTable}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 10,
                    border: 'none',
                    background: t.blue,
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 10,
                    border: `1px solid ${t.border}`,
                    background: 'transparent',
                    color: t.textSec,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteTable(tbl.id)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 10,
                    border: 'none',
                    background: `${t.red}22`,
                    color: t.red,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Delete table
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{tbl.name}</div>
                  <div style={{ fontSize: 13, color: t.textSec, marginTop: 4 }}>
                    {tbl.dayTypes.join(', ')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(tbl)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: `1px solid ${t.blue}`,
                    background: 'transparent',
                    color: t.blue,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Edit
                </button>
              </div>
              <table style={{ width: '100%', marginTop: 12, fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: t.textMuted, textAlign: 'left' }}>
                    <th style={{ padding: 6 }}>From</th>
                    <th style={{ padding: 6 }}>To</th>
                    <th style={{ padding: 6 }}>Walk-in</th>
                    {hasMember ? <th style={{ padding: 6 }}>Member</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {tbl.rows.map((r, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${t.border}` }}>
                      <td style={{ padding: 8 }}>{r.startTime}</td>
                      <td style={{ padding: 8 }}>{r.endTime}</td>
                      <td style={{ padding: 8 }}>{formatVndFull(r.walkIn)}</td>
                      {hasMember ? (
                        <td style={{ padding: 8 }}>
                          {r.member != null ? formatVndFull(r.member) : '—'}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        disabled={busy}
        onClick={addTable}
        style={{
          width: '100%',
          padding: 12,
          marginBottom: 28,
          borderRadius: 10,
          border: `1px dashed ${t.border}`,
          background: 'transparent',
          color: t.blue,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        + Add pricing table
      </button>

      <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Holiday &amp; special dates</h2>
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 12, color: t.textSec }}>Date</label>
            <input
              type="date"
              value={ovDate}
              onChange={(e) => setOvDate(e.target.value)}
              style={{
                display: 'block',
                padding: 10,
                borderRadius: 8,
                border: `1px solid ${t.border}`,
                background: t.bgInput,
                color: t.text,
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: t.textSec }}>Treat as</label>
            <select
              value={ovType}
              onChange={(e) => setOvType(e.target.value)}
              style={{
                display: 'block',
                padding: 10,
                borderRadius: 8,
                border: `1px solid ${t.border}`,
                background: t.bgInput,
                color: t.text,
                fontFamily: 'inherit',
              }}
            >
              <option value="holiday">Holiday</option>
              <option value="weekend">Weekend pricing</option>
              <option value="weekday">Weekday pricing</option>
            </select>
          </div>
          <input
            value={ovNote}
            onChange={(e) => setOvNote(e.target.value)}
            placeholder="Note (optional)"
            style={{
              flex: '1 1 200px',
              padding: 10,
              borderRadius: 8,
              border: `1px solid ${t.border}`,
              background: t.bgInput,
              color: t.text,
              fontFamily: 'inherit',
            }}
          />
          <button
            type="button"
            disabled={busy || !ovDate}
            onClick={addOverride}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              background: t.blue,
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Add
          </button>
        </div>
      </div>
      {overrides.map((o) => (
        <div
          key={o.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 12px',
            borderRadius: 8,
            border: `1px solid ${t.border}`,
            marginBottom: 8,
            fontSize: 14,
          }}
        >
          <span>
            {o.date} · <strong>{o.dayType}</strong>
            {o.note ? ` — ${o.note}` : ''}
          </span>
          <button
            type="button"
            onClick={() => removeOverride(o.id)}
            style={{ background: 'none', border: 'none', color: t.red, cursor: 'pointer' }}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

const cellIn: React.CSSProperties = {
  padding: 8,
  borderRadius: 6,
  border: `1px solid ${darkTheme.border}`,
  background: darkTheme.bgInput,
  color: darkTheme.text,
  fontFamily: 'inherit',
  fontSize: 13,
};

const cellSelect: React.CSSProperties = {
  padding: 8,
  paddingRight: 28,
  borderRadius: 6,
  border: `1px solid ${darkTheme.border}`,
  backgroundColor: darkTheme.bgInput,
  color: darkTheme.text,
  fontFamily: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
  WebkitAppearance: 'none' as const,
  appearance: 'none' as const,
  backgroundImage: `linear-gradient(45deg, transparent 50%, ${darkTheme.textSec} 50%), linear-gradient(135deg, ${darkTheme.textSec} 50%, transparent 50%)`,
  backgroundPosition: 'calc(100% - 14px) 50%, calc(100% - 9px) 50%',
  backgroundSize: '5px 5px, 5px 5px',
  backgroundRepeat: 'no-repeat',
};
