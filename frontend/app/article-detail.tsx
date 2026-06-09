import React, { useEffect, useState } from 'react';
import { ScrollView, View, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Markdown from 'react-native-markdown-display';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, spacing } from '../theme';
import { H1, Body, Small, SectionLabel } from '../components/UI';
import { markdownStyles } from '../components/markdownStyles';
import { getArticle, Article } from '../lib/api';

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      getArticle(id)
        .then(setArticle)
        .catch((e) => setErr(e?.message || 'Failed to load article'));
    }
  }, [id]);

  const formattedDate = article?.publishDate
    ? new Date(article.publishDate + 'T12:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
        <Ionicons name="arrow-back" size={22} color={palette.text} />
        <Small style={{ color: palette.text, marginLeft: 6 }}>Articles</Small>
      </Pressable>

      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }}>
        {!article && !err && <ActivityIndicator color={palette.primary} style={{ marginTop: spacing.xl }} />}
        {err && <Body dim>{err}</Body>}

        {article && (
          <>
            <SectionLabel style={{ marginBottom: spacing.xs }}>Articles & Insights</SectionLabel>

            {article.featured && (
              <View style={styles.badge}>
                <Ionicons name="star" size={10} color="#fff" />
                <Small style={{ color: '#fff', fontWeight: '800', fontSize: 10 }}>FEATURED</Small>
              </View>
            )}

            <H1 style={{ marginBottom: spacing.s }}>{article.title}</H1>
            <Small style={{ color: palette.textFaint, marginBottom: spacing.l }}>{formattedDate}</Small>

            {article.body ? (
              <Markdown style={markdownStyles}>{article.body}</Markdown>
            ) : (
              <Body dim style={{ fontStyle: 'italic', marginTop: spacing.m }}>
                Full article coming soon.
              </Body>
            )}

            {article.linkedinUrl ? (
              <Pressable
                onPress={() => WebBrowser.openBrowserAsync(article.linkedinUrl!)}
                style={styles.linkedinBtn}
              >
                <Ionicons name="logo-linkedin" size={16} color={palette.primary} />
                <Small style={{ color: palette.primary, fontWeight: '700' }}>View on LinkedIn</Small>
                <Ionicons name="open-outline" size={14} color={palette.primary} />
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: palette.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.s,
  },
  linkedinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xl,
    paddingVertical: spacing.m,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
  },
});
