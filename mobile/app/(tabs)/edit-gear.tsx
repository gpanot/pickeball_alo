import React, { useState, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { GearSetupScreen } from '@/components/gear/GearSetupScreen';
import { useGearProfile } from '@/hooks/useGearProfile';
import { useCourtMap } from '@/context/CourtMapContext';
import type { GearProfile } from '@/components/gear/gearTypes';
import { playerGenderFromStored } from '@/components/gear/gearConstants';

export default function EditGearScreen() {
  const router = useRouter();
  const { userId, userGender } = useCourtMap();
  const { gear, loading, saving, error, saveGear } = useGearProfile(userId);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async (updated: GearProfile) => {
    const ok = await saveGear(updated);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [saveGear]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#B8F200" />
      </View>
    );
  }

  return (
    <GearSetupScreen
      userId={userId}
      gender={playerGenderFromStored(userGender)}
      initialGear={gear}
      saving={saving}
      error={error}
      onSave={handleSave}
      onBack={() => router.back()}
      isOnboarding={false}
      savedConfirmation={saved}
    />
  );
}
