import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { listCredits, purchaseCredits } from '@/mobile/lib/coach-api';
import type { CreditResult } from '@/mobile/lib/coach-types';

interface CreditState {
  credits: CreditResult[];
  loading: boolean;
  error: string | null;
  loadCredits: (userId: string) => Promise<void>;
  purchase: (params: {
    coachId: string;
    userId: string;
    userName: string;
    userPhone: string;
    creditPackId: string;
  }) => Promise<CreditResult>;
  getAvailableCredits: (coachId: string) => CreditResult | undefined;
}

const CreditContext = createContext<CreditState | null>(null);

export function CreditProvider({ children }: { children: ReactNode }) {
  const [credits, setCredits] = useState<CreditResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCredits = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCredits(userId);
      setCredits(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credits');
    } finally {
      setLoading(false);
    }
  }, []);

  const purchase = useCallback(async (params: Parameters<typeof purchaseCredits>[0]) => {
    setLoading(true);
    setError(null);
    try {
      const credit = await purchaseCredits(params);
      setCredits(prev => [credit, ...prev]);
      return credit;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Purchase failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAvailableCredits = useCallback(
    (coachId: string) => {
      const now = new Date().toISOString();
      return credits.find(
        c =>
          c.coachId === coachId &&
          c.remainingCredits > 0 &&
          c.paymentStatus === 'confirmed' &&
          c.expiresAt > now,
      );
    },
    [credits],
  );

  return (
    <CreditContext.Provider value={{ credits, loading, error, loadCredits, purchase, getAvailableCredits }}>
      {children}
    </CreditContext.Provider>
  );
}

export function useCredits() {
  const ctx = useContext(CreditContext);
  if (!ctx) throw new Error('useCredits must be used within CreditProvider');
  return ctx;
}
