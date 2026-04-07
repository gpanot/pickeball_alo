'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { darkTheme, type ThemeTokens } from '@/lib/theme';
import { readAdminSession, clearAdminSession } from '@/lib/admin-storage';

const t: ThemeTokens = darkTheme;
const ADMIN_ACCENT = t.blue;

const CONTENT_MAX = 1100;

function isLoginPath(pathname: string | null) {
  return pathname === '/admin' || pathname === '/admin/';
}

const NAV_LINKS = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/venue', label: 'Venue' },
  { href: '/admin/courts', label: 'Courts' },
  { href: '/admin/payments', label: 'Payments' },
  { href: '/admin/coaches', label: 'Coaches' },
  { href: '/admin/reports', label: 'Reports' },
] as const;

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [headerName, setHeaderName] = useState('CourtMap');

  useEffect(() => {
    const session = readAdminSession();
    const login = isLoginPath(pathname);

    if (!login && !session) {
      router.replace('/admin');
      return;
    }
    if (login && session) {
      router.replace('/admin/dashboard');
      return;
    }
    if (session) setHeaderName(session.venueName);
    setReady(true);
  }, [pathname, router]);

  if (!ready && !isLoginPath(pathname)) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: t.bg,
          color: t.text,
          fontFamily: '"DM Sans", sans-serif',
        }}
      />
    );
  }

  if (isLoginPath(pathname)) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: t.bg,
          color: t.text,
          fontFamily: '"DM Sans", sans-serif',
        }}
      >
        <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh' }}>{children}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: t.bg,
        color: t.text,
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: t.bgSurface,
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <div
          style={{
            maxWidth: CONTENT_MAX,
            margin: '0 auto',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: ADMIN_ACCENT }}>
              COURTMAP ADMIN
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {headerName}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              clearAdminSession();
              router.push('/admin');
            }}
            style={{
              flexShrink: 0,
              background: 'transparent',
              border: `1px solid ${t.border}`,
              color: t.textSec,
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Log out
          </button>
        </div>

        <nav
          style={{
            maxWidth: CONTENT_MAX,
            margin: '0 auto',
            padding: '0 20px 12px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 4,
          }}
          aria-label="Admin sections"
        >
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: active ? '#fff' : t.textSec,
                  background: active ? ADMIN_ACCENT : 'transparent',
                  border: active ? 'none' : `1px solid ${t.border}`,
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main
        style={{
          maxWidth: CONTENT_MAX,
          margin: '0 auto',
          padding: '20px 20px 40px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </main>
    </div>
  );
}

/** Optional secondary links inside a page (e.g. back to list). */
export function AdminNavLinks() {
  return null;
}
