import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { spacing, fontSize, borderRadius, type ThemeTokens } from '@/mobile/lib/theme';
import { formatVndFull } from '@/mobile/lib/formatters';

export type VietQRBlockProps = {
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  amount: number;
  memo: string;
  onPaid: () => void;
  theme: ThemeTokens;
};

export function VietQRBlock({
  bankName,
  bankAccountName,
  bankAccountNumber,
  amount,
  memo,
  onPaid,
  theme,
}: VietQRBlockProps) {
  const [copiedField, setCopiedField] = useState<'account' | 'memo' | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const flashCopied = useCallback((field: 'account' | 'memo') => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    setCopiedField(field);
    copyTimerRef.current = setTimeout(() => {
      setCopiedField(null);
      copyTimerRef.current = null;
    }, 2000);
  }, []);

  const copyAccount = useCallback(async () => {
    await Clipboard.setStringAsync(bankAccountNumber);
    flashCopied('account');
  }, [bankAccountNumber, flashCopied]);

  const copyMemo = useCallback(async () => {
    await Clipboard.setStringAsync(memo);
    flashCopied('memo');
  }, [memo, flashCopied]);

  return (
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <Text style={[styles.label, { color: theme.textSec }]}>Bank</Text>
      <Text style={[styles.value, { color: theme.text }]}>{bankName}</Text>

      <Text style={[styles.label, styles.labelSpaced, { color: theme.textSec }]}>Account name</Text>
      <Text style={[styles.value, { color: theme.text }]}>{bankAccountName}</Text>

      <Text style={[styles.label, styles.labelSpaced, { color: theme.textSec }]}>Account number</Text>
      <View style={styles.row}>
        <Text style={[styles.value, styles.mono, { color: theme.text, flex: 1 }]}>{bankAccountNumber}</Text>
        <Pressable
          onPress={copyAccount}
          style={({ pressed }) => [
            styles.copyBtn,
            { borderColor: theme.border, backgroundColor: pressed ? theme.bgInput : theme.bgSurface },
          ]}
        >
          <Text style={[styles.copyBtnText, { color: theme.accent }]}>Copy</Text>
        </Pressable>
      </View>
      {copiedField === 'account' ? (
        <Text style={[styles.copied, { color: theme.green }]}>Copied!</Text>
      ) : null}

      <Text style={[styles.label, styles.labelSpaced, { color: theme.textSec }]}>Amount</Text>
      <Text style={[styles.amount, { color: theme.accent }]}>{formatVndFull(amount)}</Text>

      <Text style={[styles.label, styles.labelSpaced, { color: theme.textSec }]}>Transfer memo</Text>
      <View style={styles.row}>
        <Text style={[styles.value, { color: theme.text, flex: 1 }]} numberOfLines={3}>
          {memo}
        </Text>
        <Pressable
          onPress={copyMemo}
          style={({ pressed }) => [
            styles.copyBtn,
            { borderColor: theme.border, backgroundColor: pressed ? theme.bgInput : theme.bgSurface },
          ]}
        >
          <Text style={[styles.copyBtnText, { color: theme.accent }]}>Copy</Text>
        </Pressable>
      </View>
      {copiedField === 'memo' ? (
        <Text style={[styles.copied, { color: theme.green }]}>Copied!</Text>
      ) : null}

      <Pressable
        onPress={onPaid}
        style={({ pressed }) => [
          styles.paidBtn,
          { backgroundColor: theme.green, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <Text style={[styles.paidBtnText, { color: theme.bg }]}>I have paid</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  label: {
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelSpaced: {
    marginTop: spacing.md,
  },
  value: {
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
  mono: {
    fontVariant: ['tabular-nums'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  copyBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  copyBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  copied: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  amount: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  paidBtn: {
    marginTop: spacing['2xl'],
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  paidBtnText: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
});
