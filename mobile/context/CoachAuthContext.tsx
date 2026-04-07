import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { coachLogin, coachRegister, getCoach } from '@/mobile/lib/coach-api';
import type { CoachResult } from '@/mobile/lib/coach-types';

const TOKEN_KEY = 'coach_jwt_token';
const COACH_KEY = 'coach_profile';

interface CoachAuthState {
  token: string | null;
  coach: CoachResult | null;
  loading: boolean;
  error: string | null;
  isLoggedIn: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (params: {
    name: string;
    phone: string;
    password: string;
    email?: string;
    hourlyRate1on1: number;
    hourlyRateGroup?: number;
    bio?: string;
    specialties?: string[];
    languages?: string[];
    focusLevels?: string[];
    groupSizes?: string[];
    experienceBand?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const CoachAuthContext = createContext<CoachAuthState | null>(null);

export function CoachAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [coach, setCoach] = useState<CoachResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const savedCoach = await AsyncStorage.getItem(COACH_KEY);
        if (savedToken && savedCoach) {
          setToken(savedToken);
          setCoach(JSON.parse(savedCoach));
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await coachLogin(phone, password);
      setToken(result.token);

      // Login may return a subset; hydrate full profile
      let fullCoach = result.coach;
      try {
        fullCoach = await getCoach(result.coach.id);
      } catch {
        // fall back to partial
      }

      setCoach(fullCoach);
      await AsyncStorage.setItem(TOKEN_KEY, result.token);
      await AsyncStorage.setItem(COACH_KEY, JSON.stringify(fullCoach));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (params: Parameters<typeof coachRegister>[0]) => {
    setLoading(true);
    setError(null);
    try {
      const result = await coachRegister(params);
      setToken(result.token);

      // Register returns a subset; hydrate full profile from API
      let fullCoach = result.coach;
      try {
        fullCoach = await getCoach(result.coach.id);
      } catch {
        // fall back to partial coach from register
      }

      setCoach(fullCoach);
      await AsyncStorage.setItem(TOKEN_KEY, result.token);
      await AsyncStorage.setItem(COACH_KEY, JSON.stringify(fullCoach));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      console.error('Coach registration failed', {
        message: msg,
        phone: params.phone,
        name: params.name,
      });
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setToken(null);
    setCoach(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, COACH_KEY]);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!coach) return;
    try {
      const updated = await getCoach(coach.id);
      setCoach(updated);
      await AsyncStorage.setItem(COACH_KEY, JSON.stringify(updated));
    } catch {
      // silent fail
    }
  }, [coach]);

  return (
    <CoachAuthContext.Provider
      value={{
        token,
        coach,
        loading,
        error,
        isLoggedIn: !!token && !!coach,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </CoachAuthContext.Provider>
  );
}

export function useCoachAuth() {
  const ctx = useContext(CoachAuthContext);
  if (!ctx) throw new Error('useCoachAuth must be used within CoachAuthProvider');
  return ctx;
}
