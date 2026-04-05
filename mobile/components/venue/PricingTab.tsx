import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import type { ThemeTokens } from '@/lib/theme';
import type { StructuredPricingTable } from '@/lib/types';
import { formatDayTypesSubtitle } from '@/lib/pricing';

interface PricingTabProps {
  pricingTables: StructuredPricingTable[];
  hasMemberPricing?: boolean;
  venuePhone: string | null;
  t: ThemeTokens;
}

function formatK(vnd: number): string {
  if (vnd >= 1000) return `${Math.round(vnd / 1000)}k`;
  return String(vnd);
}

export default function PricingTab({
  pricingTables,
  hasMemberPricing = false,
  venuePhone,
  t,
}: PricingTabProps) {
  if (!pricingTables.length) {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ color: t.textSec, fontSize: 14, lineHeight: 22, marginBottom: 12 }}>
          Pricing not available. Contact the venue for rates.
        </Text>
        {venuePhone ? (
          <Pressable onPress={() => void Linking.openURL(`tel:${venuePhone}`)}>
            <Text style={{ color: t.blue, fontWeight: '600', fontSize: 14 }}>{venuePhone}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
      {pricingTables.map((table, idx) => (
        <View
          key={table.id || idx}
          style={[
            styles.card,
            { backgroundColor: t.bgCard, borderColor: t.border },
            { marginBottom: idx < pricingTables.length - 1 ? 20 : 0 },
          ]}
        >
          <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
            <Text style={[styles.tableTitle, { color: t.text, fontFamily: 'ArchivoBlack_400Regular' }]}>
              {table.name}
            </Text>
            <Text style={{ fontSize: 13, color: t.textSec, marginTop: 4 }}>
              {formatDayTypesSubtitle(table.dayTypes)}
            </Text>
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
            <View style={[styles.row, { borderBottomColor: t.border }]}>
              <Text style={[styles.th, { color: t.accent, flex: 1 }]}>Time</Text>
              <Text style={[styles.th, { color: t.accent, flex: 1, textAlign: 'right' }]}>Walk-in</Text>
              {hasMemberPricing ? (
                <Text style={[styles.th, { color: t.accent, flex: 1, textAlign: 'right' }]}>Member</Text>
              ) : null}
            </View>
            {table.rows.map((row, ri) => (
              <View
                key={ri}
                style={[
                  styles.row,
                  {
                    backgroundColor: ri % 2 === 0 ? t.bgSurface : t.bgCard,
                    borderBottomColor: t.border,
                  },
                ]}
              >
                <Text style={[styles.td, { color: t.text, flex: 1, fontWeight: '600' }]}>
                  {row.startTime}–{row.endTime}
                </Text>
                <Text style={[styles.td, { color: t.text, flex: 1, textAlign: 'right' }]}>
                  {formatK(row.walkIn)}
                </Text>
                {hasMemberPricing ? (
                  <Text style={[styles.td, { color: t.text, flex: 1, textAlign: 'right' }]}>
                    {row.member != null ? formatK(row.member) : '—'}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  tableTitle: { fontSize: 16, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  th: { fontStyle: 'italic', fontWeight: '700', fontSize: 13, paddingVertical: 8 },
  td: { fontSize: 13, paddingVertical: 10 },
});
