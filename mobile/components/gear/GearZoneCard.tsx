import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { GearZoneConfig } from './gearTypes';

type Props = {
  zone: GearZoneConfig;
  value: string | null;
  onPress: () => void;
};

export function GearZoneCard({ zone, value, onPress }: Props) {
  const selected = value !== null;
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.iconBox, selected && styles.iconBoxSelected]}>
        <Text style={styles.emoji}>{zone.emoji}</Text>
      </View>
      <View style={styles.textCol}>
        <Text style={styles.label}>{zone.label}</Text>
        <Text style={[styles.value, selected && styles.valueSelected]} numberOfLines={1}>
          {value ?? 'Select'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22,22,22,0.85)',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  cardSelected: { borderColor: '#B8F200' },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(40,40,40,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxSelected: { backgroundColor: 'rgba(26,34,0,0.9)' },
  emoji: { fontSize: 20 },
  textCol: { flex: 1 },
  label: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  value: { fontSize: 13, fontWeight: '500', color: '#666' },
  valueSelected: { color: '#B8F200' },
});
