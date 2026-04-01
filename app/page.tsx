'use client';

import dynamic from 'next/dynamic';

const CourtMapApp = dynamic(() => import('@/components/CourtMapApp'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%', maxWidth: 430, margin: '0 auto', height: '100vh',
      background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 12, fontFamily: 'system-ui',
    }}>
      <div style={{ fontSize: 44 }}>🏓</div>
      <div style={{ color: '#b8f200', fontWeight: 800, fontSize: 20, letterSpacing: -1 }}>
        COURTMAP
      </div>
    </div>
  ),
});

export default function Home() {
  return <CourtMapApp />;
}
