import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { spacing, fontSize, borderRadius, type ThemeTokens } from '@/mobile/lib/theme';
import { formatVndFull } from '@/mobile/lib/formatters';

export type VietQRBlockProps = {
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBin?: string | null;
  amount: number;
  memo: string;
  onPaid: () => void;
  theme: ThemeTokens;
};

function buildCoachQrUrl(p: {
  bankBin: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  memo: string;
}): string {
  const addInfo = encodeURIComponent(p.memo.slice(0, 50));
  const accountName = encodeURIComponent(p.accountName.trim());
  const bin = p.bankBin.trim();
  const acct = p.accountNumber.trim();
  const amount = Math.max(0, Math.round(p.amount));
  return `https://img.vietqr.io/image/${bin}-${acct}-compact.png?amount=${amount}&addInfo=${addInfo}&accountName=${accountName}`;
}

export function VietQRBlock({
  bankName,
  bankAccountName,
  bankAccountNumber,
  bankBin,
  amount,
  memo,
  onPaid,
  theme,
}: VietQRBlockProps) {
  const [copiedField, setCopiedField] = useState<'account' | 'memo' | null>(null);
  const [qrError, setQrError] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setQrError(false);
  }, [bankBin, bankAccountNumber, amount, memo]);

  const qrUrl = useMemo(() => {
    if (!bankBin?.trim() || !bankAccountNumber?.trim()) return null;
    return buildCoachQrUrl({
      bankBin,
      accountNumber: bankAccountNumber,
      accountName: bankAccountName,
      amount,
      memo,
    });
  }, [bankBin, bankAccountNumber, bankAccountName, amount, memo]);

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
      {qrUrl && !qrError ? (
        <View style={styles.qrSection}>
          <View style={styles.qrWhite}>
            <Image
              source={{ uri: qrUrl }}
              style={styles.qrImage}
              resizeMode="contain"
              onError={() => setQrError(true)}
              accessibilityLabel="VietQR payment code"
            />
          </View>
          <Text style={[styles.qrHint, { color: theme.textMuted }]}>
            Scan with your banking app
          </Text>
        </View>
      ) : null}

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
  qrSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  qrWhite: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.md,
    padding: 8,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  qrHint: {
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
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
