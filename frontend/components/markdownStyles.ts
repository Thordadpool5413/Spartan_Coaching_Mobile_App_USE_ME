import { palette, spacing } from '../theme';

export const markdownStyles = {
  body: {
    color: palette.textDim,
    fontSize: 17,
    lineHeight: 28,
    backgroundColor: 'transparent',
  },

  heading1: {
    color: palette.text,
    fontSize: 26,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    lineHeight: 32,
    marginTop: spacing.xxl,
    marginBottom: spacing.m,
  },
  heading2: {
    color: palette.text,
    fontSize: 21,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
    lineHeight: 27,
    marginTop: spacing.xxl,
    marginBottom: spacing.s,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: palette.primary,
  },
  heading3: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    lineHeight: 24,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  heading4: {
    color: palette.textDim,
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    lineHeight: 20,
    marginTop: spacing.l,
    marginBottom: spacing.xs,
  },

  paragraph: {
    color: palette.textDim,
    fontSize: 17,
    lineHeight: 28,
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
    fontSize: 17,
    lineHeight: 26,
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
    fontSize: 14,
    fontFamily: 'monospace',
  },
  code_block: {
    backgroundColor: palette.bgElev2,
    color: palette.text,
    padding: 16,
    borderRadius: 8,
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
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
    fontSize: 13,
    lineHeight: 20,
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
    fontSize: 13,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.cardBorder,
  },
  td: {
    color: palette.textDim,
    fontSize: 14,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
  tr: {
    flexDirection: 'row' as const,
  },
};
