'use client';

import React from 'react';
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
      <div style={{ padding: '20px', color: t.textSec, fontSize: 14, lineHeight: 1.5 }}>
        <p style={{ margin: '0 0 12px' }}>Pricing not available. Contact the venue for rates.</p>
        {venuePhone ? (
          <a href={`tel:${venuePhone}`} style={{ color: t.blue, fontWeight: 600 }}>
            {venuePhone}
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ padding: '0 20px 20px' }}>
      {pricingTables.map((table, idx) => (
        <div
          key={table.id || idx}
          style={{
            marginBottom: idx < pricingTables.length - 1 ? 20 : 0,
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 16px 10px' }}>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 800,
                color: t.text,
                fontFamily: '"Archivo Black", "DM Sans", sans-serif',
              }}
            >
              {table.name}
            </h3>
            <div style={{ fontSize: 13, color: t.textSec, marginTop: 4 }}>
              {formatDayTypesSubtitle(table.dayTypes)}
            </div>
          </div>
          <div style={{ padding: '0 16px 14px' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      color: t.accent,
                      fontStyle: 'italic',
                      fontWeight: 700,
                      borderBottom: `1px solid ${t.border}`,
                    }}
                  >
                    Time
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '8px 10px',
                      color: t.accent,
                      fontStyle: 'italic',
                      fontWeight: 700,
                      borderBottom: `1px solid ${t.border}`,
                    }}
                  >
                    Walk-in
                  </th>
                  {hasMemberPricing ? (
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '8px 10px',
                        color: t.accent,
                        fontStyle: 'italic',
                        fontWeight: 700,
                        borderBottom: `1px solid ${t.border}`,
                      }}
                    >
                      Member
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, ri) => (
                  <tr
                    key={ri}
                    style={{
                      background: ri % 2 === 0 ? t.bgSurface : t.bgCard,
                    }}
                  >
                    <td
                      style={{
                        padding: '10px',
                        color: t.text,
                        fontWeight: 600,
                        borderBottom: `1px solid ${t.border}`,
                      }}
                    >
                      {row.startTime}–{row.endTime}
                    </td>
                    <td
                      style={{
                        padding: '10px',
                        textAlign: 'right',
                        color: t.text,
                        borderBottom: `1px solid ${t.border}`,
                      }}
                    >
                      {formatK(row.walkIn)}
                    </td>
                    {hasMemberPricing ? (
                      <td
                        style={{
                          padding: '10px',
                          textAlign: 'right',
                          color: t.text,
                          borderBottom: `1px solid ${t.border}`,
                        }}
                      >
                        {row.member != null ? formatK(row.member) : '—'}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
