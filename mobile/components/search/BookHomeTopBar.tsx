import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import ScreenTopBar from '@/components/ui/ScreenTopBar';
import type { ThemeTokens } from '@/lib/theme';

export interface BookHomeTopBarProps {
  catalogVenueCount?: number | null;
  userName: string;
  onOpenProfile: () => void;
  t: ThemeTokens;
  variant?: 'book' | 'map';
}

function profileInitial(name: string): string {
  const s = name.trim();
  if (!s) return '?';
  return s.charAt(0).toUpperCase();
}

export default function BookHomeTopBar({
  catalogVenueCount,
  userName,
  onOpenProfile,
  t,
  variant = 'book',
}: BookHomeTopBarProps) {
  return (
    <ScreenTopBar
      t={t}
      zIndex={variant === 'map' ? 60 : undefined}
      contentStyle={styles.barContent}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={[styles.logo, { color: t.text, fontFamily: 'ArchivoBlack_400Regular' }]}>
            <Text style={{ color: t.accent }}>COURT</Text>MAP
          </Text>
          {catalogVenueCount != null && (
            <Text style={[styles.venueCount, { color: t.textMuted }]}>
              VENUES {catalogVenueCount}
            </Text>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={onOpenProfile}
          style={[styles.avatar, { backgroundColor: t.accentBgStrong, borderColor: t.accent }]}
        >
          <Text style={[styles.avatarText, { color: t.accent }]}>{profileInitial(userName)}</Text>
        </Pressable>
      </View>
    </ScreenTopBar>
  );
}

const styles = StyleSheet.create({
  barContent: { paddingTop: 10, paddingBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: { flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', flex: 1, minWidth: 0 },
  logo: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  venueCount: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
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
