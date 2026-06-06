import { StyleSheet } from 'react-native';
import { palette } from '../theme';

export const markdownStyles = StyleSheet.create({
  body: { color: palette.text, fontSize: 15, lineHeight: 23 },
  heading1: { color: palette.text, fontSize: 22, fontWeight: '800', marginTop: 18, marginBottom: 8 },
  heading2: { color: palette.text, fontSize: 19, fontWeight: '800', marginTop: 16, marginBottom: 6 },
  heading3: { color: palette.text, fontSize: 17, fontWeight: '700', marginTop: 14, marginBottom: 4 },
  paragraph: { color: palette.text, marginTop: 0, marginBottom: 10 },
  list_item: { color: palette.text, marginBottom: 4 },
  bullet_list: { marginBottom: 8 },
  ordered_list: { marginBottom: 8 },
  strong: { color: palette.text, fontWeight: '800' },
  em: { color: palette.text, fontStyle: 'italic' },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: palette.primary,
    paddingLeft: 12,
    color: palette.textDim,
    marginVertical: 8,
  },
  code_inline: {
    backgroundColor: palette.bgElev2,
    color: palette.primaryLight,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: palette.bgElev2,
    color: palette.text,
    padding: 12,
    borderRadius: 8,
    fontFamily: 'monospace',
    fontSize: 13,
  },
  hr: { backgroundColor: palette.divider, height: 1, marginVertical: 12 },
  link: { color: palette.primary, textDecorationLine: 'underline' },
});
