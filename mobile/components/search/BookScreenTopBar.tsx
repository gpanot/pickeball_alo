import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import ScreenTopBar from '@/components/ui/ScreenTopBar';
import type { ThemeTokens } from '@/lib/theme';

export interface BookScreenTopBarProps {
  catalogVenueCount?: number | null;
  t: ThemeTokens;
  /** Higher z-index when stacked above map chrome. */
  variant?: 'book' | 'map';
}

/**
 * Book tab header: COURTMAP branding and optional catalog count (no profile — see My Bookings).
 */
export default function BookScreenTopBar({
  catalogVenueCount,
  t,
  variant = 'book',
}: BookScreenTopBarProps) {
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
      </View>
    </ScreenTopBar>
  );
}

const styles = StyleSheet.create({
  barContent: { paddingTop: 10, paddingBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    flexWrap: 'wrap',
    flex: 1,
    minWidth: 0,
  },
  logo: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  venueCount: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
});
