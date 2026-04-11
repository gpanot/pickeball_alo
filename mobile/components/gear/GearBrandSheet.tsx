import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  FlatList, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { GearZoneConfig } from './gearTypes';
import { GEAR_BRANDS, OTHER_BRAND_KEY } from './gearConstants';

const AUTO_CONFIRM_MS = 500;

type Props = {
  zone: GearZoneConfig | null;
  currentValue: string | null;
  onConfirm: (brand: string) => void;
  onClose: () => void;
};

export function GearBrandSheet({ zone, currentValue, onConfirm, onClose }: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tempPick, setTempPick] = useState<string | null>(null);
  const [otherText, setOtherText] = useState('');

  const clearConfirmTimer = useCallback(() => {
    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearConfirmTimer();
    if (zone) {
      sheetRef.current?.expand();
      const brands = GEAR_BRANDS[zone.key];
      const isOther = currentValue && !brands.includes(currentValue);
      setTempPick(isOther ? OTHER_BRAND_KEY : (currentValue ?? null));
      setOtherText(isOther ? currentValue! : '');
    } else {
      sheetRef.current?.close();
      setTempPick(null);
      setOtherText('');
    }
    return clearConfirmTimer;
  }, [zone, currentValue, clearConfirmTimer]);

  const scheduleConfirm = useCallback(
    (finalBrand: string) => {
      clearConfirmTimer();
      confirmTimerRef.current = setTimeout(() => {
        confirmTimerRef.current = null;
        onConfirm(finalBrand);
      }, AUTO_CONFIRM_MS);
    },
    [clearConfirmTimer, onConfirm],
  );

  const brands = zone ? [...GEAR_BRANDS[zone.key], OTHER_BRAND_KEY] : [];

  const renderItem = useCallback(
    ({ item }: { item: string }) => {
      const isOtherBtn = item === OTHER_BRAND_KEY;
      const picked = tempPick === item;
      return (
        <TouchableOpacity
          style={[styles.brandBtn, picked && styles.brandBtnPicked]}
          onPress={() => {
            setTempPick(item);
            if (!isOtherBtn) {
              setOtherText('');
              scheduleConfirm(item);
            } else {
              clearConfirmTimer();
              setOtherText('');
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.brandName, picked && styles.brandNamePicked]}>
            {isOtherBtn ? 'Another brand' : item}
          </Text>
          {picked && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
      );
    },
    [tempPick, scheduleConfirm, clearConfirmTimer],
  );

  const onOtherTextChange = (text: string) => {
    setOtherText(text);
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      scheduleConfirm(trimmed);
    } else {
      clearConfirmTimer();
    }
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={['55%', '75%']}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {zone ? `${zone.emoji}  ${zone.label} brand` : ''}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={brands}
            keyExtractor={i => i}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          />

          {tempPick === OTHER_BRAND_KEY && (
            <View style={styles.otherRow}>
              <TextInput
                style={styles.otherInput}
                placeholder="Type brand name..."
                placeholderTextColor="#555"
                value={otherText}
                onChangeText={onOtherTextChange}
                maxLength={20}
                autoFocus
                returnKeyType="done"
              />
            </View>
          )}
        </KeyboardAvoidingView>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: '#111' },
  handle: { backgroundColor: '#333' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  title: { fontSize: 16, fontWeight: '600', color: '#fff' },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#888', fontSize: 18, lineHeight: 20 },
  grid: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 },
  row: { gap: 10, marginBottom: 10 },
  brandBtn: {
    flex: 1,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  brandBtnPicked: { borderColor: '#B8F200', backgroundColor: '#0f1a00' },
  brandName: { fontSize: 14, fontWeight: '500', color: '#ccc' },
  brandNamePicked: { color: '#B8F200' },
  checkmark: { fontSize: 12, color: '#B8F200' },
  otherRow: { paddingHorizontal: 20, paddingBottom: 20 },
  otherInput: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: '#fff',
  },
});
