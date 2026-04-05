import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ThemeTokens } from '@/lib/theme';

export interface ScreenTopBarProps {
  t: ThemeTokens;
  children: React.ReactNode;
  /** Stack above siblings (e.g. 60 over map chrome, 10 for secondary bars) */
  zIndex?: number;
  borderBottom?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Merged with default inner padding (horizontal 16, top 12, bottom 10) */
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Screen header region that respects the device status bar / notch.
 * Use for any top bar so content sits below the status bar consistently.
 */
export default function ScreenTopBar({
  t,
  children,
  zIndex,
  borderBottom = true,
  style,
  contentStyle,
}: ScreenTopBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.outer,
        {
          paddingTop: insets.top,
          backgroundColor: t.bg,
          borderBottomWidth: borderBottom ? 1 : 0,
          borderBottomColor: t.border,
          ...(zIndex != null ? { zIndex } : {}),
        },
        style,
      ]}
    >
      <View style={[styles.inner, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {},
  inner: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
});
