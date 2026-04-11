import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { spacing, fontSize, borderRadius, type ThemeTokens } from '@/mobile/lib/theme';

interface PhoneVerificationCardProps {
  phone: string;
  verified: boolean;
  onVerified: () => void | Promise<void>;
  theme: ThemeTokens;
}

export default function PhoneVerificationCard({ phone, verified, onVerified, theme: t }: PhoneVerificationCardProps) {
  const [showOtpFlow, setShowOtpFlow] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [sendingDots, setSendingDots] = useState('');
  const [mockOtpCode, setMockOtpCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, []);

  const startVerification = useCallback(() => {
    if (!phone.trim()) {
      Alert.alert('Missing phone', 'Please add your phone number first.');
      return;
    }
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setMockOtpCode(code);
    setOtpInput('');
    setOtpError('');
    setShowOtpFlow(false);
    setIsSendingCode(true);
    setSendingDots('.');
    revealTimerRef.current = setTimeout(() => {
      setIsSendingCode(false);
      setShowOtpFlow(true);
      revealTimerRef.current = null;
    }, 1100);
  }, [phone]);

  useEffect(() => {
    if (!isSendingCode) return;
    const timer = setInterval(() => {
      setSendingDots((prev) => (prev.length >= 3 ? '.' : `${prev}.`));
    }, 220);
    return () => clearInterval(timer);
  }, [isSendingCode]);

  const handleOtpChange = useCallback(
    (raw: string) => {
      const digits = raw.replace(/\D/g, '').slice(0, 6);
      setOtpInput(digits);
      setOtpError('');

      if (digits.length === 6) {
        if (digits === mockOtpCode) {
          setShowOtpFlow(false);
          try {
            const result = onVerified();
            if (result && typeof (result as Promise<void>).catch === 'function') {
              (result as Promise<void>).catch(() => {});
            }
          } catch { /* best-effort API sync */ }
        } else {
          setOtpError('Code does not match. Try again.');
        }
      }
    },
    [mockOtpCode, onVerified],
  );

  return (
    <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
      <Text style={[styles.sectionTitle, { color: t.text }]}>Phone</Text>
      <View style={styles.phoneRow}>
        <Text style={[styles.phoneNumber, { color: t.text }]}>{phone || 'No phone'}</Text>
        {verified ? (
          <View style={[styles.verifiedBadge, { backgroundColor: t.green }]}>
            <Text style={[styles.verifiedText, { color: t.bg }]}>Verified</Text>
          </View>
        ) : (
          <Pressable
            onPress={startVerification}
            style={({ pressed }) => [styles.validateBtn, { backgroundColor: t.accent, opacity: pressed ? 0.82 : 1 }]}
          >
            <Text style={[styles.validateBtnText, { color: t.bg }]}>Validate</Text>
          </Pressable>
        )}
      </View>
      {isSendingCode && !verified && (
        <View style={[styles.otpBlock, { borderColor: t.border }]}>
          <View style={styles.sendingRow}>
            <ActivityIndicator color={t.accent} />
            <Text style={[styles.otpHint, { color: t.textMuted }]}>Sending verification code{sendingDots}</Text>
          </View>
        </View>
      )}
      {showOtpFlow && !verified && (
        <View style={[styles.otpBlock, { borderColor: t.border }]}>
          <Text style={[styles.otpHint, { color: t.textMuted }]}>Your verification code:</Text>
          <View style={[styles.otpCodeBox, { backgroundColor: t.bgInput, borderColor: t.border }]}>
            <Text style={[styles.otpCodeDisplay, { color: t.accent }]}>{mockOtpCode}</Text>
          </View>
          <Text style={[styles.otpHint, { color: t.textMuted, marginTop: spacing.md }]}>
            Enter the code above to verify your number:
          </Text>
          <TextInput
            value={otpInput}
            onChangeText={handleOtpChange}
            style={[styles.otpInput, { color: t.text, backgroundColor: t.bgInput, borderColor: otpError ? t.red : t.border }]}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={t.textMuted}
          />
          {otpError !== '' && (
            <Text style={[styles.otpErrorText, { color: t.red }]}>{otpError}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '800' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  phoneNumber: { fontSize: fontSize.md, fontWeight: '600' },
  verifiedBadge: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: borderRadius.full },
  verifiedText: { fontSize: fontSize.xs, fontWeight: '700' },
  validateBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: borderRadius.full },
  validateBtnText: { fontSize: fontSize.sm, fontWeight: '700' },
  otpBlock: { borderTopWidth: 1, paddingTop: spacing.md, gap: spacing.xs },
  sendingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  otpHint: { fontSize: fontSize.sm },
  otpCodeBox: { alignSelf: 'center', borderWidth: 1, borderRadius: borderRadius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, marginVertical: spacing.sm },
  otpCodeDisplay: { fontSize: fontSize['2xl'], fontWeight: '800', letterSpacing: 8, textAlign: 'center' },
  otpInput: { borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: fontSize.xl, fontWeight: '700', textAlign: 'center', letterSpacing: 6 },
  otpErrorText: { fontSize: fontSize.xs, fontWeight: '600', marginTop: spacing.xs },
});
