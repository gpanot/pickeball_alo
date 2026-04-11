import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { spacing, fontSize, borderRadius, type ThemeTokens } from '@/mobile/lib/theme';
import PhoneVerificationCard from '@/components/PhoneVerificationCard';

type Props = {
  theme: ThemeTokens;
  phone: string;
  verified: boolean;
  onVerified: () => void | Promise<void>;
  editable?: boolean;
  onPhoneChange?: (phone: string) => void;
  placeholder?: string;
};

export default function PhoneFieldVerificationSection({
  theme: t,
  phone,
  verified,
  onVerified,
  editable = false,
  onPhoneChange,
  placeholder = 'Phone number',
}: Props) {
  return (
    <View style={styles.wrap}>
      {editable && onPhoneChange && (
        <View>
          <Text style={[styles.label, { color: t.textMuted }]}>Phone</Text>
          <TextInput
            style={[
              styles.input,
              { color: t.text, backgroundColor: t.bgInput, borderColor: t.border },
            ]}
            value={phone}
            onChangeText={onPhoneChange}
            placeholder={placeholder}
            placeholderTextColor={t.textMuted}
            keyboardType="phone-pad"
          />
        </View>
      )}

      <PhoneVerificationCard
        phone={phone}
        verified={verified}
        onVerified={onVerified}
        theme={t}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    fontSize: 15,
  },
});
