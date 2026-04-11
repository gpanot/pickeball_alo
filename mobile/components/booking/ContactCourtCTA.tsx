import React from 'react';
import { View, Text, Pressable, Linking, StyleSheet, Alert, Platform } from 'react-native';
import { PhoneIcon } from '@/components/Icons';
import type { ThemeTokens } from '@/lib/theme';

interface ContactCourtCTAProps {
  bookingRef: string;
  courtName: string;
  courtPhone?: string | null;
  courtZalo?: string | null;
  t: ThemeTokens;
  message?: string;
}

export default function ContactCourtCTA({
  bookingRef,
  courtName,
  courtPhone,
  courtZalo,
  t,
  message,
}: ContactCourtCTAProps) {
  const suggestedMessage =
    message ?? `Hi, I need help with my booking #${bookingRef} at ${courtName}`;

  const openPhone = () => {
    if (!courtPhone) return;
    Linking.openURL(`tel:${courtPhone}`).catch(() =>
      Alert.alert('Cannot open phone', 'Phone calls are not supported on this device.'),
    );
  };

  const openZalo = () => {
    if (!courtZalo) return;
    const webUrl = `https://zalo.me/${courtZalo}`;
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Linking.canOpenURL('zalo://').then((supported) => {
        Linking.openURL(supported ? `zalo://chat?phone=${courtZalo}` : webUrl).catch(() =>
          Linking.openURL(webUrl),
        );
      });
    } else {
      Linking.openURL(webUrl);
    }
  };

  const hasAnyContact = !!courtPhone || !!courtZalo;
  if (!hasAnyContact) return null;

  return (
    <View style={[styles.root, { backgroundColor: t.bgCard, borderColor: t.border }]}>
      <Text style={[styles.hint, { color: t.textSec }]}>{suggestedMessage}</Text>
      <View style={styles.row}>
        {courtPhone ? (
          <Pressable
            onPress={openPhone}
            style={[styles.btn, { backgroundColor: t.accent }]}
          >
            <PhoneIcon size={16} color="#000" />
            <Text style={styles.btnLabel}>Call</Text>
          </Pressable>
        ) : null}
        {courtZalo ? (
          <Pressable
            onPress={openZalo}
            style={[styles.btn, { backgroundColor: '#0068FF' }]}
          >
            <Text style={[styles.btnLabel, { color: '#fff' }]}>Zalo</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  btnLabel: {
    fontWeight: '700',
    fontSize: 14,
    color: '#000',
  },
});
