/**
 * Spartan Coaching Design Tokens
 * Premium dark-first aesthetic. Red primary accent, deep blacks, cinematic depth.
 */

export const palette = {
  bg: '#09090b',
  bgElev1: '#111113',
  bgElev2: '#18181b',
  bgElev3: '#202024',
  card: '#111113',
  cardBorder: '#27272a',
  cardBorderStrong: '#3f3f46',

  text: '#fafafa',
  textDim: '#a1a1aa',
  textMuted: '#71717a',
  textFaint: '#52525b',

  primary: '#ef4444',
  primaryDark: '#b91c1c',
  primaryLight: '#fca5a5',
  primaryGlow: 'rgba(239, 68, 68, 0.28)',
  primaryTint: 'rgba(239, 68, 68, 0.10)',
  primarySubtle: 'rgba(239, 68, 68, 0.06)',

  success: '#10b981',
  successDim: 'rgba(16, 185, 129, 0.15)',
  warn: '#f59e0b',
  warnDim: 'rgba(245, 158, 11, 0.15)',
  error: '#ef4444',

  divider: '#27272a',
  glassEdge: 'rgba(255,255,255,0.07)',
  glassEdgeTop: 'rgba(255,255,255,0.10)',
  glassBg: 'rgba(9,9,11,0.82)',

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
  xxl: 32,
  pill: 999,
};

export const font = {
  display: undefined,
  body: undefined,
  mono: undefined,
};

export const typography = {
  hero: { fontSize: 40, fontWeight: '900' as const, letterSpacing: -1.5, lineHeight: 44 },
  h1: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -1.0, lineHeight: 36 },
  h2: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.6, lineHeight: 30 },
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
    shadowOpacity: 0.40,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.50,
    shadowRadius: 20,
    elevation: 8,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 32,
    elevation: 14,
  },
  glow: {
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.50,
    shadowRadius: 24,
    elevation: 12,
  },
  glowButton: {
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 10,
  },
};
