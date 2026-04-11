import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, Pressable,
  TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GearBubble, GearDot } from './GearBubble';
import { GearBrandSheet } from './GearBrandSheet';
import { GEAR_ZONES, GEAR_AVATAR } from './gearConstants';
import { GearProfile, GearZoneConfig, GearZoneKey, PlayerGender } from './gearTypes';

type BubblePosition = {
  top: string;
  left?: string;
  right?: string;
  alignItems: 'flex-start' | 'flex-end';
  dotOffset: { top: number; left?: number; right?: number };
};

const ZONE_POSITIONS: Record<
  GearZoneKey,
  BubblePosition & { flipRow?: boolean; connectorWidth?: number }
> = {
  cap: {
    top: '18%',
    right: '8%',
    alignItems: 'flex-end',
    dotOffset: { top: -4, left: -8 },
  },
  shirt: {
    top: '30%',
    left: '4%',
    alignItems: 'flex-start',
    dotOffset: { top: -4, right: -8 },
    flipRow: true,
  },
  paddle: {
    top: '38%',
    right: '6%',
    alignItems: 'flex-end',
    dotOffset: { top: -4, left: -8 },
    flipRow: false,
  },
  shoes: {
    top: '62%',
    right: '8%',
    alignItems: 'flex-end',
    dotOffset: { top: -4, left: -8 },
    connectorWidth: 100,
  },
};

type Props = {
  userId: string;
  gender: PlayerGender;
  initialGear: GearProfile;
  saving: boolean;
  error: string | null;
  onSave: (gear: GearProfile) => void;
  onBack: () => void;
  onSkip?: () => void;
  isOnboarding?: boolean;
  savedConfirmation?: boolean;
};

export function GearSetupScreen({
  gender, initialGear, saving, error, onSave, onBack, onSkip, isOnboarding = false,
  savedConfirmation = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const [gear, setGear] = useState<GearProfile>(initialGear);
  const [activeZone, setActiveZone] = useState<GearZoneConfig | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const allDone = Object.values(gear).filter(v => v !== null).length === 4;

  useEffect(() => {
    if (savedConfirmation) setHasUnsavedChanges(false);
  }, [savedConfirmation]);

  const handleConfirm = (brand: string) => {
    if (!activeZone) return;
    setGear(prev => ({ ...prev, [activeZone.key]: brand }));
    setHasUnsavedChanges(true);
    setActiveZone(null);
  };

  const showSave =
    isOnboarding || !allDone || hasUnsavedChanges || saving;

  return (
    <View style={styles.root}>
      {/* Full-bleed avatar background */}
      <Image source={GEAR_AVATAR[gender]} style={styles.bgImage} resizeMode="cover" />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.topBarTitle}>My Gear</Text>
        {showSave ? (
          <TouchableOpacity
            onPress={() => onSave(gear)}
            disabled={!allDone || saving}
            activeOpacity={0.7}
            style={[styles.saveBtn, (!allDone || saving) && styles.saveBtnDisabled]}
          >
            {saving
              ? <ActivityIndicator color="#0A0A0A" size="small" />
              : <Text style={styles.saveBtnText}>
                  {isOnboarding ? 'Start' : 'Save'}
                </Text>
            }
          </TouchableOpacity>
        ) : (
          <View style={styles.saveBtnPlaceholder} />
        )}
      </View>

      {/* Save confirmation toast */}
      {savedConfirmation && (
        <View style={[styles.toast, { top: insets.top + 56 }]}>
          <Ionicons name="checkmark-circle" size={18} color="#B8F200" />
          <Text style={styles.toastText}>Gear saved!</Text>
        </View>
      )}

      {/* Body-anchored bubbles */}
      {GEAR_ZONES.map(zone => {
        const pos = ZONE_POSITIONS[zone.key];
        const selected = gear[zone.key] !== null;
        const flip = (pos as any).flipRow === true;
        const lineW = (pos as any).connectorWidth ?? 20;
        return (
          <View
            key={zone.key}
            style={[
              styles.bubbleAnchor,
              {
                top: pos.top as any,
                ...(pos.left ? { left: pos.left as any } : {}),
                ...(pos.right ? { right: pos.right as any } : {}),
                alignItems: pos.alignItems,
              },
            ]}
            pointerEvents="box-none"
          >
            <View style={styles.bubbleRow}>
              {flip ? (
                <>
                  <GearBubble
                    zone={zone}
                    value={gear[zone.key]}
                    onPress={() => setActiveZone(zone)}
                  />
                  <View style={[styles.connectorLine, { width: lineW }]} />
                  <GearDot selected={selected} />
                </>
              ) : (
                <>
                  <GearDot selected={selected} />
                  <View style={[styles.connectorLine, { width: lineW }]} />
                  <GearBubble
                    zone={zone}
                    value={gear[zone.key]}
                    onPress={() => setActiveZone(zone)}
                  />
                </>
              )}
            </View>
          </View>
        );
      })}

      {/* Bottom progress + skip */}
      <View style={[styles.bottomArea, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.progressRow}>
          {GEAR_ZONES.map(z => (
            <View
              key={z.key}
              style={[styles.progressDot, gear[z.key] !== null && styles.progressDotDone]}
            />
          ))}
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
        {isOnboarding && onSkip && (
          <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Brand picker — must be above bubbles */}
      <View style={styles.sheetWrapper} pointerEvents="box-none">
        <GearBrandSheet
          zone={activeZone}
          currentValue={activeZone ? gear[activeZone.key] : null}
          onConfirm={handleConfirm}
          onClose={() => setActiveZone(null)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30,30,30,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  saveBtn: {
    backgroundColor: '#B8F200',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#0A0A0A' },
  saveBtnPlaceholder: { minWidth: 72, height: 36 },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15,15,15,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(184,242,0,0.3)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    zIndex: 15,
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  sheetWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  bubbleAnchor: {
    position: 'absolute',
    zIndex: 5,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectorLine: {
    width: 20,
    height: 1.5,
    backgroundColor: 'rgba(184,242,0,0.35)',
  },
  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    zIndex: 5,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
  },
  progressDot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(60,60,60,0.6)' },
  progressDotDone: { backgroundColor: '#B8F200' },
  errorText: { color: '#E24B4A', fontSize: 13, paddingTop: 8, textAlign: 'center' },
  skipBtn: { alignItems: 'center', paddingTop: 12 },
  skipText: { color: '#888', fontSize: 14 },
});
