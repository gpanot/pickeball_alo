export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  title: 28,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

export interface ThemeTokens {
  bg: string;
  bgCard: string;
  bgSurface: string;
  bgInput: string;
  border: string;
  text: string;
  textSec: string;
  textMuted: string;
  accent: string;
  accentBg: string;
  accentBgStrong: string;
  red: string;
  orange: string;
  green: string;
  blue: string;
  shadow: string;
  shadowSm: string;
  pillBg: string;
  pillBorder: string;
  sheetBg: string;
  overlay: string;
}

export const darkTheme: ThemeTokens = {
  bg: '#0a0a0a',
  bgCard: '#161616',
  bgSurface: '#111',
  bgInput: '#1a1a1a',
  border: '#2a2a2a',
  text: '#f0f0f0',
  textSec: '#888',
  textMuted: '#555',
  accent: '#b8f200',
  accentBg: 'rgba(184,242,0,0.08)',
  accentBgStrong: 'rgba(184,242,0,0.15)',
  red: '#ff4757',
  orange: '#ffa502',
  green: '#2ed573',
  blue: '#3498db',
  shadow: '0 2px 20px rgba(0,0,0,0.5)',
  shadowSm: '0 1px 8px rgba(0,0,0,0.3)',
  pillBg: 'rgba(20,20,20,0.92)',
  pillBorder: '#333',
  sheetBg: '#111',
  overlay: 'rgba(0,0,0,0.7)',
};

export const lightTheme: ThemeTokens = {
  bg: '#f5f5f7',
  bgCard: '#fff',
  bgSurface: '#fff',
  bgInput: '#f0f0f2',
  border: '#e0e0e0',
  text: '#1a1a1a',
  textSec: '#666',
  textMuted: '#999',
  accent: '#7cb300',
  accentBg: 'rgba(124,179,0,0.06)',
  accentBgStrong: 'rgba(124,179,0,0.12)',
  red: '#e74c3c',
  orange: '#e67e22',
  green: '#27ae60',
  blue: '#2980b9',
  shadow: '0 2px 20px rgba(0,0,0,0.08)',
  shadowSm: '0 1px 8px rgba(0,0,0,0.04)',
  pillBg: 'rgba(255,255,255,0.95)',
  pillBorder: '#ddd',
  sheetBg: '#fff',
  overlay: 'rgba(0,0,0,0.4)',
};
