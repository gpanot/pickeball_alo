import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface WelcomeFeature {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
  headline: string;
  subheadline: string;
  features: WelcomeFeature[];
  footnote?: string;
  buttonLabel?: string;
}

export default function WelcomePopup({
  visible,
  onDismiss,
  headline,
  subheadline,
  features,
  footnote,
  buttonLabel = 'Got it',
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.subheadline}>{subheadline}</Text>

          <View style={styles.features}>
            {features.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name={f.icon} size={22} color="#b8f200" />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureSubtitle}>{f.subtitle}</Text>
                </View>
              </View>
            ))}
          </View>

          {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}

          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [styles.button, { opacity: pressed ? 0.88 : 1 }]}
          >
            <Text style={styles.buttonText}>{buttonLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#161616',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    gap: 20,
  },
  headline: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f0f0f0',
    lineHeight: 30,
  },
  subheadline: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
    marginTop: -8,
  },
  features: {
    gap: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(184,242,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f0f0f0',
  },
  featureSubtitle: {
    fontSize: 13,
    color: '#888',
  },
  footnote: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
  },
  button: {
    height: 52,
    backgroundColor: '#b8f200',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});
