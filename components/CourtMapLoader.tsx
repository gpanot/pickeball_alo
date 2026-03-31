'use client';

import dynamic from 'next/dynamic';

const CourtMapShell = dynamic(() => import('@/components/CourtMapShell'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        color: '#888',
        background: '#0d0d0d',
      }}
    >
      Loading map…
    </div>
  ),
});

export default function CourtMapLoader() {
  return <CourtMapShell />;
}
