import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/lib/theme';

export interface ProfileAvatarButtonProps {
  userName: string;
  onPress: () => void;
  t: ThemeTokens;
}

function profileInitial(name: string): string {
  const s = name.trim();
  if (!s) return '?';
  return s.charAt(0).toUpperCase();
}

export default function ProfileAvatarButton({ userName, onPress, t }: ProfileAvatarButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open profile"
      onPress={onPress}
      style={[styles.avatar, { backgroundColor: t.accentBgStrong, borderColor: t.accent }]}
    >
      <Text style={[styles.avatarText, { color: t.accent }]}>{profileInitial(userName)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '800', fontSize: 16 },
});
