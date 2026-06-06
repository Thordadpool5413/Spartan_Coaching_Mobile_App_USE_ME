/**
 * Spartan Coaching Design Tokens
 * Premium dark-first aesthetic. Red primary accent, deep blacks, gold subtle highlights.
 */

export const palette = {
  bg: '#0a0a0b',
  bgElev1: '#121214',
  bgElev2: '#1a1a1d',
  bgElev3: '#222227',
  card: '#141417',
  cardBorder: '#26262c',
  cardBorderStrong: '#34343c',

  text: '#f5f5f7',
  textDim: '#a3a3ad',
  textMuted: '#71717a',
  textFaint: '#52525b',

  primary: '#ef4444', // Spartan red
  primaryDark: '#b91c1c',
  primaryLight: '#fca5a5',
  primaryGlow: 'rgba(239, 68, 68, 0.30)',
  primaryTint: 'rgba(239, 68, 68, 0.10)',

  success: '#10b981',
  successDim: 'rgba(16, 185, 129, 0.15)',
  warn: '#f59e0b',
  warnDim: 'rgba(245, 158, 11, 0.15)',

  divider: '#26262c',

  // Pillar accents
  discipline: '#3b82f6',
  empathy: '#a855f7',
  strategy: '#f97316',

  // Subject accents
  discovery: '#3b82f6',
  connecting: '#a855f7',
  guiding: '#f97316',
  commitment: '#16a34a',
};

export const spacing = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
  section: 56,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const font = {
  // We use system fonts: SF Pro on iOS, Roboto on Android
  display: undefined, // system bold
  body: undefined,
  mono: undefined,
};

export const typography = {
  hero: { fontSize: 40, fontWeight: '900' as const, letterSpacing: -1.2, lineHeight: 44 },
  h1: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.8, lineHeight: 36 },
  h2: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.5, lineHeight: 30 },
  h3: { fontSize: 19, fontWeight: '700' as const, letterSpacing: -0.3, lineHeight: 26 },
  bodyLg: { fontSize: 17, fontWeight: '400' as const, lineHeight: 26 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  small: { fontSize: 13, fontWeight: '400' as const, lineHeight: 19 },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.5 },
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.2, lineHeight: 14 },
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  glow: {
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
};
