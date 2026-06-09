import { palette, spacing } from '../theme';

export type TextSizeKey = 'small' | 'medium' | 'large';

const SCALE: Record<TextSizeKey, number> = {
  small: 0.85,
  medium: 1.0,
  large: 1.2,
};

export function getMarkdownStyles(sizeKey: TextSizeKey = 'medium') {
  const s = SCALE[sizeKey];

  return {
    body: {
      color: palette.textDim,
      fontSize: Math.round(17 * s),
      lineHeight: Math.round(28 * s),
      backgroundColor: 'transparent',
    },

    heading1: {
      color: palette.text,
      fontSize: Math.round(26 * s),
      fontWeight: '800' as const,
      letterSpacing: -0.5,
      lineHeight: Math.round(32 * s),
      marginTop: spacing.xxl,
      marginBottom: spacing.m,
    },
    heading2: {
      color: palette.text,
      fontSize: Math.round(21 * s),
      fontWeight: '800' as const,
      letterSpacing: -0.3,
      lineHeight: Math.round(27 * s),
      marginTop: spacing.xxl,
      marginBottom: spacing.s,
      paddingLeft: 12,
      borderLeftWidth: 3,
      borderLeftColor: palette.primary,
    },
    heading3: {
      color: palette.text,
      fontSize: Math.round(18 * s),
      fontWeight: '700' as const,
      letterSpacing: -0.2,
      lineHeight: Math.round(24 * s),
      marginTop: spacing.xl,
      marginBottom: spacing.xs,
    },
    heading4: {
      color: palette.textDim,
      fontSize: Math.round(15 * s),
      fontWeight: '700' as const,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
      lineHeight: Math.round(20 * s),
      marginTop: spacing.l,
      marginBottom: spacing.xs,
    },

    paragraph: {
      color: palette.textDim,
      fontSize: Math.round(17 * s),
      lineHeight: Math.round(28 * s),
      marginTop: 0,
      marginBottom: spacing.l,
    },

    bullet_list: {
      marginBottom: spacing.l,
      marginTop: 0,
    },
    ordered_list: {
      marginBottom: spacing.l,
      marginTop: 0,
    },
    list_item: {
      color: palette.textDim,
      fontSize: Math.round(17 * s),
      lineHeight: Math.round(26 * s),
      marginBottom: spacing.s,
    },
    bullet_list_icon: {
      color: palette.primary,
      marginTop: 8,
    },
    ordered_list_icon: {
      color: palette.primary,
      fontWeight: '700' as const,
      marginTop: 2,
    },

    strong: {
      color: palette.text,
      fontWeight: '700' as const,
    },
    em: {
      color: palette.textDim,
      fontStyle: 'italic' as const,
    },

    blockquote: {
      backgroundColor: 'rgba(239, 68, 68, 0.06)',
      borderLeftWidth: 4,
      borderLeftColor: palette.primary,
      paddingLeft: 16,
      paddingRight: 12,
      paddingVertical: 12,
      marginVertical: spacing.m,
      borderRadius: 4,
    },

    code_inline: {
      backgroundColor: palette.bgElev3,
      color: palette.primaryLight,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
      fontSize: Math.round(14 * s),
      fontFamily: 'monospace',
    },
    code_block: {
      backgroundColor: palette.bgElev2,
      color: palette.text,
      padding: 16,
      borderRadius: 8,
      fontFamily: 'monospace',
      fontSize: Math.round(13 * s),
      lineHeight: Math.round(20 * s),
      marginVertical: spacing.m,
      borderWidth: 1,
      borderColor: palette.cardBorder,
    },
    fence: {
      backgroundColor: palette.bgElev2,
      color: palette.text,
      padding: 16,
      borderRadius: 8,
      fontFamily: 'monospace',
      fontSize: Math.round(13 * s),
      lineHeight: Math.round(20 * s),
      marginVertical: spacing.m,
      borderWidth: 1,
      borderColor: palette.cardBorder,
    },

    hr: {
      backgroundColor: palette.divider,
      height: 1,
      marginVertical: spacing.xxl,
    },

    link: {
      color: palette.primary,
      textDecorationLine: 'underline' as const,
    },

    image: {
      borderRadius: 8,
      marginVertical: spacing.m,
    },

    table: {
      borderWidth: 1,
      borderColor: palette.cardBorder,
      borderRadius: 8,
      marginVertical: spacing.m,
      overflow: 'hidden' as const,
    },
    thead: {
      backgroundColor: palette.bgElev2,
    },
    th: {
      color: palette.text,
      fontWeight: '700' as const,
      fontSize: Math.round(13 * s),
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: palette.cardBorder,
    },
    td: {
      color: palette.textDim,
      fontSize: Math.round(14 * s),
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: palette.divider,
    },
    tr: {
      flexDirection: 'row' as const,
    },
  };
}

export const markdownStyles = getMarkdownStyles('medium');
