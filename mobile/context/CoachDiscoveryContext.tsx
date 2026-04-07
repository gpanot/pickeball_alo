import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { searchCoaches, getCoach, getCoachAvailability } from '@/mobile/lib/coach-api';
import type { CoachResult, CoachAvailabilityResult } from '@/mobile/lib/coach-types';

interface CoachDiscoveryState {
  coaches: CoachResult[];
  total: number;
  loading: boolean;
  error: string | null;
  selectedCoach: CoachResult | null;
  selectedCoachAvailability: CoachAvailabilityResult[];
  search: (params: {
    q?: string;
    specialty?: string;
    minRating?: number;
    maxPrice?: number;
    lat?: number;
    lng?: number;
    radius?: number;
    sort?: 'rating' | 'price';
  }) => Promise<void>;
  loadMore: () => Promise<void>;
  selectCoach: (id: string) => Promise<void>;
  loadAvailability: (coachId: string, date?: string) => Promise<void>;
  clearSelection: () => void;
}

const CoachDiscoveryContext = createContext<CoachDiscoveryState | null>(null);

export function CoachDiscoveryProvider({ children }: { children: ReactNode }) {
  const [coaches, setCoaches] = useState<CoachResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<CoachResult | null>(null);
  const [selectedCoachAvailability, setSelectedCoachAvailability] = useState<CoachAvailabilityResult[]>([]);
  const [searchParams, setSearchParams] = useState<Record<string, unknown>>({});

  const search = useCallback(async (params: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    setSearchParams(params);
    try {
      const result = await searchCoaches({ ...params, limit: 20, offset: 0 });
      setCoaches(result.coaches);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || coaches.length >= total) return;
    setLoading(true);
    try {
      const result = await searchCoaches({ ...searchParams, limit: 20, offset: coaches.length });
      setCoaches(prev => [...prev, ...result.coaches]);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load more failed');
    } finally {
      setLoading(false);
    }
  }, [coaches.length, total, loading, searchParams]);

  const selectCoach = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const coach = await getCoach(id);
      setSelectedCoach(coach);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load coach');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAvailability = useCallback(async (coachId: string, date?: string) => {
    try {
      const avail = await getCoachAvailability(coachId, date);
      setSelectedCoachAvailability(avail);
    } catch (err) {
      console.warn('Failed to load availability:', err);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCoach(null);
    setSelectedCoachAvailability([]);
  }, []);

  return (
    <CoachDiscoveryContext.Provider
      value={{
        coaches,
        total,
        loading,
        error,
        selectedCoach,
        selectedCoachAvailability,
        search,
        loadMore,
        selectCoach,
        loadAvailability,
        clearSelection,
      }}
    >
      {children}
    </CoachDiscoveryContext.Provider>
  );
}

export function useCoachDiscovery() {
  const ctx = useContext(CoachDiscoveryContext);
  if (!ctx) throw new Error('useCoachDiscovery must be used within CoachDiscoveryProvider');
  return ctx;
}
