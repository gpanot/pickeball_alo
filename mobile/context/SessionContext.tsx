import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  createSession,
  getSession,
  listSessions,
  cancelSession,
  submitPaymentProof,
  joinGroupSession,
} from '@/mobile/lib/coach-api';
import type { CoachSessionResult } from '@/mobile/lib/coach-types';

interface SessionState {
  sessions: CoachSessionResult[];
  total: number;
  loading: boolean;
  error: string | null;
  currentSession: CoachSessionResult | null;
  loadSessions: (params: { userId?: string; coachId?: string; status?: string }) => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  bookSession: (params: {
    coachId: string;
    venueId: string;
    date: string;
    startTime: string;
    endTime: string;
    sessionType: '1on1' | 'group';
    userId: string;
    userName: string;
    userPhone: string;
    paymentMethod?: string;
  }) => Promise<CoachSessionResult>;
  cancel: (id: string) => Promise<void>;
  submitPayment: (sessionId: string, userId: string, proofUrl: string) => Promise<void>;
  joinSession: (sessionId: string, userId: string, userName: string, userPhone: string) => Promise<void>;
  clearCurrent: () => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<CoachSessionResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<CoachSessionResult | null>(null);

  const loadSessions = useCallback(async (params: { userId?: string; coachId?: string; status?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listSessions(params);
      const nextSessions = Array.isArray(result.sessions) ? result.sessions : [];
      setSessions(nextSessions);
      setTotal(typeof result.total === 'number' ? result.total : nextSessions.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
      setSessions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSession = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const session = await getSession(id);
      setCurrentSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, []);

  const bookSession = useCallback(async (params: Parameters<typeof createSession>[0]) => {
    setLoading(true);
    setError(null);
    try {
      const session = await createSession(params);
      setCurrentSession(session);
      setSessions(prev => [session, ...prev]);
      setTotal(prev => prev + 1);
      return session;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Booking failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancel = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const updated = await cancelSession(id);
      setCurrentSession(updated);
      setSessions(prev => prev.map(s => (s.id === id ? updated : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const submitPayment = useCallback(async (sessionId: string, userId: string, proofUrl: string) => {
    try {
      await submitPaymentProof(sessionId, userId, proofUrl);
      const updated = await getSession(sessionId);
      setCurrentSession(updated);
      setSessions(prev => prev.map(s => (s.id === sessionId ? updated : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    }
  }, []);

  const joinSession = useCallback(async (sessionId: string, userId: string, userName: string, userPhone: string) => {
    try {
      await joinGroupSession(sessionId, { userId, userName, userPhone });
      const updated = await getSession(sessionId);
      setCurrentSession(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Join failed');
      throw err;
    }
  }, []);

  const clearCurrent = useCallback(() => setCurrentSession(null), []);

  return (
    <SessionContext.Provider
      value={{
        sessions,
        total,
        loading,
        error,
        currentSession,
        loadSessions,
        loadSession,
        bookSession,
        cancel,
        submitPayment,
        joinSession,
        clearCurrent,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
