import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Image } from 'react-native';
import { ClockIcon, PhoneIcon, PinIcon, FacebookIcon, InstagramIcon, TikTokIcon, GoogleIcon } from '@/components/Icons';
import { AMENITY_ICONS } from '@/lib/formatters';
import type { ThemeTokens } from '@/lib/theme';
import type { VenueResult } from '@/lib/types';

interface InfoTabProps {
  venue: VenueResult;
  t: ThemeTokens;
}

export default function InfoTab({ venue, t }: InfoTabProps) {
  const socialLinks = [
    { url: venue.facebookUrl, Icon: FacebookIcon, label: 'Facebook' },
    { url: venue.instagramUrl, Icon: InstagramIcon, label: 'Instagram' },
    { url: venue.tiktokUrl, Icon: TikTokIcon, label: 'TikTok' },
    { url: venue.googleUrl, Icon: GoogleIcon, label: 'Google Maps' },
  ].filter((l) => l.url);

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View style={{ marginBottom: 20 }}>
        {venue.hours ? (
          <View style={styles.row}>
            <ClockIcon color={t.accent} />
            <Text style={[styles.line, { color: t.text, fontWeight: '600' }]}>{venue.hours}</Text>
          </View>
        ) : null}
        {venue.phone ? (
          <Pressable onPress={() => void Linking.openURL(`tel:${venue.phone}`)} style={styles.row}>
            <PhoneIcon color={t.accent} />
            <Text style={[styles.line, { color: t.text, fontWeight: '600' }]}>{venue.phone}</Text>
          </Pressable>
        ) : null}
        <View style={styles.row}>
          <PinIcon color={t.accent} />
          <Text style={[styles.line, { color: t.text }]}>{venue.address}</Text>
        </View>
      </View>

      {socialLinks.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          {socialLinks.map((link) => (
            <Pressable
              key={link.label}
              onPress={() => void Linking.openURL(link.url!)}
              style={[styles.social, { backgroundColor: t.bgCard, borderColor: t.border }]}
            >
              <link.Icon color={t.textSec} />
            </Pressable>
          ))}
        </View>
      )}

      <Text style={[styles.section, { color: t.textMuted }]}>Amenities</Text>
      <View style={styles.amenityGrid}>
        {venue.amenities.map((a) => (
          <View key={a} style={[styles.amenity, { backgroundColor: t.bgCard, borderColor: t.border }]}>
            <Text style={{ fontSize: 20, marginBottom: 4 }}>{AMENITY_ICONS[a] || '✨'}</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: t.text }}>{a}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingBottom: 20 }}>
        {venue.tags.map((tag) => (
          <View
            key={tag}
            style={[styles.tag, { backgroundColor: t.accentBg, borderColor: t.accentBgStrong }]}
          >
            <Text style={{ fontSize: 12, color: t.accent, fontWeight: '600' }}>{tag}</Text>
          </View>
        ))}
      </View>

      {venue.payments && venue.payments.length > 0 && (
        <>
          <Text style={[styles.section, { color: t.textMuted }]}>Payment</Text>
          <View style={{ gap: 10, paddingBottom: 20 }}>
            {venue.payments.map((p) => (
              <View
                key={p.id}
                style={[styles.payCard, { backgroundColor: t.bgCard, borderColor: t.border }]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: t.text }}>{p.bank}</Text>
                  <Text style={{ fontSize: 13, color: t.textSec, marginTop: 2 }}>{p.accountName}</Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: t.text,
                      marginTop: 4,
                      letterSpacing: 1,
                    }}
                  >
                    {p.accountNumber}
                  </Text>
                </View>
                {p.qrImageUrl ? (
                  <Image
                    source={{ uri: p.qrImageUrl }}
                    style={[styles.qr, { borderColor: t.border }]}
                  />
                ) : null}
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  line: { fontSize: 14, flex: 1 },
  social: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  amenity: {
    width: '31%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  tag: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  payCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  qr: { width: 72, height: 72, borderRadius: 8, borderWidth: 1, backgroundColor: '#fff' },
});
