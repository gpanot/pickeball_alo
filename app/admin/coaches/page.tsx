'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { darkTheme, type ThemeTokens } from '@/lib/theme';
import { readAdminSession, clearAdminSession } from '@/lib/admin-storage';
import { adminAuthHeaders } from '@/lib/admin-api';

const t: ThemeTokens = darkTheme;

type CoachPublic = {
  id: string;
  name: string;
  phone: string;
  ratingOverall: number | null;
};

type CoachCourtLinkRow = {
  id: string;
  coachId: string;
  venueId: string;
  courtIds: string[];
  isActive: boolean;
  coach: CoachPublic;
};

type CoachSessionBrief = {
  id: string;
  coachId: string;
  date: string;
};

export default function AdminCoachesPage() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof readAdminSession>>(null);
  const [links, setLinks] = useState<CoachCourtLinkRow[]>([]);
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleAuthFail = useCallback(() => {
    clearAdminSession();
    router.replace('/admin');
  }, [router]);

  const load = useCallback(() => {
    const s = readAdminSession();
    if (!s) {
      setSession(null);
      setLoading(false);
      return;
    }
    setSession(s);
    setLoading(true);

    const base = `/api/admin/venues/${encodeURIComponent(s.venueId)}`;
    const h = adminAuthHeaders(s.token);

    Promise.all([
      fetch(`${base}/coaches`, { headers: h }).then((r) => {
        if (r.status === 401) {
          handleAuthFail();
          return null;
        }
        if (!r.ok) throw new Error('coaches');
        return r.json() as Promise<CoachCourtLinkRow[]>;
      }),
      fetch(`${base}/sessions?limit=500`, { headers: h }).then((r) => {
        if (r.status === 401) {
          handleAuthFail();
          return null;
        }
        if (!r.ok) throw new Error('sessions');
        return r.json() as Promise<{ sessions: CoachSessionBrief[] }>;
      }),
    ])
      .then(([coachRows, sessPayload]) => {
        if (!coachRows || !sessPayload) return;
        setLinks(Array.isArray(coachRows) ? coachRows : []);
        const sessions = Array.isArray(sessPayload.sessions) ? sessPayload.sessions : [];
        const counts: Record<string, number> = {};
        for (const row of sessions) {
          counts[row.coachId] = (counts[row.coachId] ?? 0) + 1;
        }
        setSessionCounts(counts);
      })
      .catch(() => {
        setLinks([]);
        setSessionCounts({});
      })
      .finally(() => setLoading(false));
  }, [handleAuthFail]);

  useEffect(() => {
    const s = readAdminSession();
    setSession(s);
    load();
  }, [load]);

  const sendInvite = async () => {
    if (!session) return;
    const coachPhone = invitePhone.trim();
    if (!coachPhone) {
      setInviteMsg({ type: 'err', text: 'Enter a phone number.' });
      return;
    }
    setInviteBusy(true);
    setInviteMsg(null);
    try {
      const res = await fetch(`/api/admin/venues/${encodeURIComponent(session.venueId)}/coaches`, {
        method: 'POST',
        headers: adminAuthHeaders(session.token),
        body: JSON.stringify({ coachPhone }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) {
        handleAuthFail();
        return;
      }
      if (!res.ok) {
        setInviteMsg({ type: 'err', text: data.error ?? 'Invite failed.' });
        return;
      }
      setInviteMsg({ type: 'ok', text: 'Invite sent.' });
      setInvitePhone('');
      load();
    } catch {
      setInviteMsg({ type: 'err', text: 'Network error.' });
    } finally {
      setInviteBusy(false);
    }
  };

  if (!session && !loading) return null;

  return (
    <div>
      <style>{`
        @keyframes cm-admin-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, color: t.accent }}>Coaches</h1>
        <button
          type="button"
          onClick={() => {
            setInviteOpen(true);
            setInviteMsg(null);
          }}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: 'none',
            background: t.accent,
            color: '#0a0a0a',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Invite Coach
        </button>
      </div>

      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 48,
            color: t.textSec,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              border: `3px solid ${t.border}`,
              borderTopColor: t.accent,
              borderRadius: '50%',
              animation: 'cm-admin-spin 0.75s linear infinite',
            }}
          />
          <span>Loading coaches…</span>
        </div>
      ) : links.length === 0 ? (
        <div
          style={{
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 32,
            textAlign: 'center',
            color: t.textSec,
          }}
        >
          No coaches linked to this venue yet. Use <strong style={{ color: t.text }}>Invite Coach</strong> to add one by
          phone number.
        </div>
      ) : (
        <div
          style={{
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 16,
            overflowX: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: t.accent, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <th style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}` }}>Name</th>
                <th style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}` }}>Phone</th>
                <th style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}` }}>Rating</th>
                <th style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}` }}>Sessions</th>
                <th style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}` }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {links.map((row, i) => {
                const bg = i % 2 === 0 ? 'transparent' : `${t.bgSurface}`;
                const rating =
                  row.coach.ratingOverall != null && !Number.isNaN(row.coach.ratingOverall)
                    ? row.coach.ratingOverall.toFixed(1)
                    : '—';
                const sessN = sessionCounts[row.coachId] ?? 0;
                return (
                  <tr
                    key={row.id}
                    onClick={() => {}}
                    style={{
                      background: bg,
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, color: t.text, fontWeight: 600 }}>
                      {row.coach.name}
                    </td>
                    <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, color: t.blue }}>
                      <a href={`tel:${row.coach.phone}`} style={{ color: t.blue }} onClick={(e) => e.stopPropagation()}>
                        {row.coach.phone}
                      </a>
                    </td>
                    <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, color: t.text }}>{rating}</td>
                    <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, color: t.text }}>{sessN}</td>
                    <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}` }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: row.isActive ? t.green : t.textMuted,
                        }}
                      >
                        {row.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {inviteOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: t.overlay,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => !inviteBusy && setInviteOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 400,
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: 20,
              boxShadow: t.shadow,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 16px', fontSize: 18, color: t.accent }}>Invite coach</h2>
            <label style={{ display: 'block', fontSize: 12, color: t.textSec, marginBottom: 6 }}>Phone number</label>
            <input
              type="tel"
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
              placeholder="+84…"
              disabled={inviteBusy}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: 12,
                borderRadius: 10,
                border: `1px solid ${t.border}`,
                background: t.bgInput,
                color: t.text,
                fontFamily: 'inherit',
                marginBottom: 16,
              }}
            />
            {inviteMsg ? (
              <div
                style={{
                  marginBottom: 12,
                  fontSize: 13,
                  color: inviteMsg.type === 'ok' ? t.green : t.red,
                }}
              >
                {inviteMsg.text}
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                disabled={inviteBusy}
                onClick={() => setInviteOpen(false)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: `1px solid ${t.border}`,
                  background: 'transparent',
                  color: t.textSec,
                  fontFamily: 'inherit',
                  cursor: inviteBusy ? 'wait' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={inviteBusy}
                onClick={() => void sendInvite()}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: t.accent,
                  color: '#0a0a0a',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: inviteBusy ? 'wait' : 'pointer',
                }}
              >
                {inviteBusy ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
