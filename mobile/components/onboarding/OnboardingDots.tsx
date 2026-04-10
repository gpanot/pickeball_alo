import React from 'react';
import { View, StyleSheet } from 'react-native';

interface Props {
  currentSlide: number;
  totalSlides: number;
}

export default function OnboardingDots({ currentSlide, totalSlides }: Props) {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSlides }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === currentSlide ? styles.active : styles.inactive,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  active: {
    width: 20,
    backgroundColor: '#b8f200',
  },
  inactive: {
    width: 6,
    backgroundColor: '#333',
  },
});
