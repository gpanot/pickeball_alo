import type { ReactNode } from 'react';
import AdminShell from './AdminShell';

/** Body uses overflow:hidden for the main app; admin pages need their own scroll region. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
