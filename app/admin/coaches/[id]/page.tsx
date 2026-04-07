'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { darkTheme, type ThemeTokens } from '@/lib/theme';
import { readAdminSession } from '@/lib/admin-storage';
import { adminAuthHeaders } from '@/lib/admin-api';

const t: ThemeTokens = darkTheme;

type CoachDetail = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  bio: string | null;
  specialties: string[];
  certifications: string[];
  ratingOverall: number | null;
  ratingOnTime: number | null;
  ratingFriendly: number | null;
  ratingProfessional: number | null;
  ratingRecommend: number | null;
  reviewCount: number;
  hourlyRate1on1: number;
  hourlyRateGroup: number | null;
  subscriptionPlan: string;
  isActive: boolean;
  paymentFlagCount: number;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
};

type SessionRow = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionType: string;
  venueName: string;
  paymentStatus: string;
  coachFee: number;
  participants: { userName: string; paymentStatus: string }[];
};

function fmtVnd(n: number): string {
  return n.toLocaleString('vi-VN') + ' ₫';
}

function ratingBar(label: string, value: number | null): React.ReactNode {
  if (value == null) return null;
  const pct = Math.min(100, Math.max(0, (value / 5) * 100));
  return (
    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ minWidth: 100, fontSize: 13, color: t.textSec }}>{label}</span>
      <div
        style={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          backgroundColor: t.border,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: t.accent,
            borderRadius: 3,
          }}
        />
      </div>
      <span style={{ minWidth: 28, textAlign: 'right', fontSize: 13, fontWeight: 700, color: t.textSec }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

export default function AdminCoachDetailPage() {
  const router = useRouter();
  const params = useParams();
  const coachId = typeof params.id === 'string' ? params.id : params.id?.[0] ?? '';

  const [session, setSession] = useState<ReturnType<typeof readAdminSession>>(null);
  const [coach, setCoach] = useState<CoachDetail | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = readAdminSession();
    if (!s) {
      router.push('/admin');
      return;
    }
    setSession(s);
  }, [router]);

  const loadCoach = useCallback(async () => {
    if (!coachId) return;
    try {
      const res = await fetch(`/api/coaches/${coachId}`);
      if (!res.ok) throw new Error('Failed to load coach');
      setCoach(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }, [coachId]);

  const loadSessions = useCallback(async () => {
    if (!coachId) return;
    try {
      const res = await fetch(`/api/sessions?coachId=${coachId}&limit=50`);
      if (!res.ok) throw new Error('Failed to load sessions');
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch {
      setSessions([]);
    }
  }, [coachId]);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    Promise.all([loadCoach(), loadSessions()]).finally(() => setLoading(false));
  }, [session, loadCoach, loadSessions]);

  if (loading) {
    return (
      <div style={{ padding: 32, color: t.textSec }}>Loading...</div>
    );
  }

  if (error || !coach) {
    return (
      <div style={{ padding: 32 }}>
        <button
          onClick={() => router.push('/admin/coaches')}
          style={{ color: t.accent, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 16 }}
        >
          ← Back to Coaches
        </button>
        <p style={{ color: t.red }}>{error ?? 'Coach not found'}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <button
        onClick={() => router.push('/admin/coaches')}
        style={{ color: t.accent, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 24 }}
      >
        ← Back to Coaches
      </button>

      {/* Coach header */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 24 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            backgroundColor: t.accentBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 800,
            color: t.accent,
            flexShrink: 0,
          }}
        >
          {coach.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: t.text }}>{coach.name}</h2>
          <p style={{ margin: '4px 0', color: t.textSec, fontSize: 14 }}>{coach.phone}</p>
          {coach.email && (
            <p style={{ margin: '2px 0', color: t.textMuted, fontSize: 13 }}>{coach.email}</p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '2px 10px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                backgroundColor: coach.isActive ? t.green : t.red,
                color: '#fff',
              }}
            >
              {coach.isActive ? 'Active' : 'Inactive'}
            </span>
            <span
              style={{
                padding: '2px 10px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                backgroundColor: t.accentBgStrong,
                color: t.accent,
              }}
            >
              {coach.subscriptionPlan}
            </span>
            {coach.paymentFlagCount > 0 && (
              <span
                style={{
                  padding: '2px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: t.orange,
                  color: '#fff',
                }}
              >
                {coach.paymentFlagCount} flag{coach.paymentFlagCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Ratings */}
      {coach.ratingOverall != null && (
        <div
          style={{
            backgroundColor: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 10,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: t.text }}>
            Ratings ({coach.reviewCount} review{coach.reviewCount !== 1 ? 's' : ''})
          </h3>
          {ratingBar('On time', coach.ratingOnTime)}
          {ratingBar('Friendly', coach.ratingFriendly)}
          {ratingBar('Professional', coach.ratingProfessional)}
          {ratingBar('Recommend', coach.ratingRecommend)}
          <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: t.accent }}>
            Overall: {coach.ratingOverall.toFixed(1)} / 5
          </div>
        </div>
      )}

      {/* Info card */}
      <div
        style={{
          backgroundColor: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: 10,
          padding: 16,
          marginBottom: 16,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}
      >
        <div>
          <span style={{ fontSize: 12, color: t.textMuted, textTransform: 'uppercase' }}>1-on-1 Rate</span>
          <p style={{ margin: '4px 0 0', color: t.text, fontWeight: 700 }}>{fmtVnd(coach.hourlyRate1on1)}</p>
        </div>
        {coach.hourlyRateGroup != null && (
          <div>
            <span style={{ fontSize: 12, color: t.textMuted, textTransform: 'uppercase' }}>Group Rate</span>
            <p style={{ margin: '4px 0 0', color: t.text, fontWeight: 700 }}>{fmtVnd(coach.hourlyRateGroup)}</p>
          </div>
        )}
        {coach.specialties.length > 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={{ fontSize: 12, color: t.textMuted, textTransform: 'uppercase' }}>Specialties</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {coach.specialties.map((s) => (
                <span
                  key={s}
                  style={{
                    padding: '2px 10px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: t.accentBg,
                    color: t.textSec,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
        {coach.bio && (
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={{ fontSize: 12, color: t.textMuted, textTransform: 'uppercase' }}>Bio</span>
            <p style={{ margin: '4px 0 0', color: t.textSec, fontSize: 14, lineHeight: 1.5 }}>{coach.bio}</p>
          </div>
        )}
        {coach.bankName && (
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={{ fontSize: 12, color: t.textMuted, textTransform: 'uppercase' }}>Bank</span>
            <p style={{ margin: '4px 0 0', color: t.text, fontSize: 14 }}>
              {coach.bankName} · {coach.bankAccountName} · {coach.bankAccountNumber}
            </p>
          </div>
        )}
      </div>

      {/* Sessions table */}
      <h3 style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 8 }}>
        Sessions ({sessions.length})
      </h3>
      <div
        style={{
          backgroundColor: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${t.border}` }}>
              {['Date', 'Time', 'Venue', 'Type', 'Payment', 'Fee', 'Players'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    fontWeight: 700,
                    color: t.textSec,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: t.textMuted }}>
                  No sessions found
                </td>
              </tr>
            )}
            {sessions.map((s) => (
              <tr key={s.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                <td style={{ padding: '10px 12px', color: t.text, fontWeight: 600 }}>{s.date}</td>
                <td style={{ padding: '10px 12px', color: t.textSec }}>
                  {s.startTime}–{s.endTime}
                </td>
                <td style={{ padding: '10px 12px', color: t.textSec, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.venueName}
                </td>
                <td style={{ padding: '10px 12px', color: t.textSec }}>
                  {s.sessionType === '1on1' ? '1:1' : 'Group'}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 700,
                      backgroundColor:
                        s.paymentStatus === 'paid' || s.paymentStatus === 'confirmed'
                          ? t.green
                          : s.paymentStatus === 'canceled'
                            ? t.red
                            : t.orange,
                      color: '#fff',
                    }}
                  >
                    {s.paymentStatus}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', color: t.accent, fontWeight: 700 }}>
                  {fmtVnd(s.coachFee)}
                </td>
                <td style={{ padding: '10px 12px', color: t.textSec }}>
                  {s.participants.map((p) => p.userName).join(', ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
