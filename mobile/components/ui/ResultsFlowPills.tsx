import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PinIcon, HeartIcon } from '@/components/Icons';
import type { ThemeTokens } from '@/lib/theme';
import type { ResultsFlowPillContext } from '@/lib/types';

interface ResultsFlowPillsProps {
  context: ResultsFlowPillContext;
  savedCount: number;
  onPrimary: () => void;
  onSaved: () => void;
  t: ThemeTokens;
}

export default function ResultsFlowPills({
  context,
  savedCount,
  onPrimary,
  onSaved,
  t,
}: ResultsFlowPillsProps) {
  const insets = useSafeAreaInsets();
  const mapOrListActive = context === 'map';
  const savedActive = context === 'saved';
  const primaryLabel = context === 'map' ? 'List' : 'Map';

  const pill = (active: boolean) => ({
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 50,
    backgroundColor: active ? t.accent : t.pillBg,
    borderWidth: active ? 0 : 1,
    borderColor: t.pillBorder,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  });

  return (
    <View style={[styles.wrap, { bottom: Math.max(20, insets.bottom) }]}>
      <Pressable onPress={onPrimary} style={pill(mapOrListActive)}>
        <PinIcon color={mapOrListActive ? '#000' : t.text} />
        <Text style={{ color: mapOrListActive ? '#000' : t.text, fontWeight: '700', fontSize: 14 }}>
          {primaryLabel}
        </Text>
      </Pressable>
      <Pressable onPress={onSaved} style={[pill(savedActive), { position: 'relative' }]}>
        <HeartIcon fill={savedActive} color={savedActive ? '#000' : t.text} />
        <Text style={{ color: savedActive ? '#000' : t.text, fontWeight: '700', fontSize: 14 }}>
          Saved
        </Text>
        {savedCount > 0 && !savedActive && (
          <View style={[styles.dot, { backgroundColor: t.red }]}>
            <Text style={styles.dotText}>{savedCount > 99 ? '99+' : savedCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    zIndex: 5000,
  },
  dot: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dotText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
