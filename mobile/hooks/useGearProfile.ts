import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GearProfile } from '@/components/gear/gearTypes';
import { GEAR_CACHE_KEY } from '@/components/gear/gearConstants';
import { API_BASE_URL } from '@/mobile/lib/config';

const EMPTY_GEAR: GearProfile = {
  cap: null, shirt: null, paddle: null, shoes: null,
};

function isServerUserId(id: string): boolean {
  return Boolean(id) && !id.startsWith('u_');
}

export function useGearProfile(userId: string) {
  const [gear, setGear] = useState<GearProfile>(EMPTY_GEAR);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = `${GEAR_CACHE_KEY}_${userId}`;
  const apiUrl = `${API_BASE_URL}/api/players/${userId}/gear`;
  const canSync = isServerUserId(userId);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached && !cancelled) {
          setGear(JSON.parse(cached));
          setLoading(false);
        }

        if (canSync) {
          const res = await fetch(apiUrl);
          if (!res.ok) throw new Error('fetch failed');
          const data: GearProfile = await res.json();
          if (!cancelled) {
            setGear(data);
            await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
          }
        }
      } catch {
        if (!cancelled) setError('Could not load gear profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, cacheKey, apiUrl, canSync]);

  const saveGear = useCallback(async (updated: GearProfile): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(updated));
      setGear(updated);

      if (canSync) {
        const res = await fetch(apiUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });
        if (!res.ok) throw new Error('save failed');
      }
      return true;
    } catch {
      setError('Failed to save. Changes saved locally.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [cacheKey, apiUrl, canSync]);

  return { gear, loading, saving, error, saveGear };
}
