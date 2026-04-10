import React, { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export type HeroGradientStop = { offset: number; opacity: number };

type Props = {
  /** Stops along the gradient (0–1). Color is fixed #0a0a0a; opacity fades the hero image. */
  stops: HeroGradientStop[];
};

/**
 * Vertical fade over a hero image (top → bottom). Uses react-native-svg so it works without
 * expo-linear-gradient native code (avoids missing view manager in older dev clients).
 */
export default function HeroImageGradient({ stops }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const fillId = `heroGrad${uid}`;

  return (
    <Svg style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} width="100%" height="100%">
      <Defs>
        <LinearGradient id={fillId} x1="0%" y1="0%" x2="0%" y2="100%">
          {stops.map((s, i) => (
            <Stop
              key={i}
              offset={`${Math.round(s.offset * 100)}%`}
              stopColor="#0a0a0a"
              stopOpacity={s.opacity}
            />
          ))}
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${fillId})`} />
    </Svg>
  );
}
