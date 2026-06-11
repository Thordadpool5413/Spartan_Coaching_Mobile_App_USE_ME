import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ScrollView, View, Pressable, ActivityIndicator, StyleSheet, Text, Share, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Clipboard from 'expo-clipboard';
import Markdown from 'react-native-markdown-display';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, spacing } from '../theme';
import { H1, Body, Small, SectionLabel, GhostButton } from '../components/UI';
import { getMarkdownStyles, TextSizeKey } from '../components/markdownStyles';
import { getArticle, Article } from '../lib/api';
import { isFavorite, recordActivity, toggleFavorite } from '../lib/local-state';

const TEXT_SIZE_KEY = 'article_text_size';
const SIZE_CYCLE: TextSizeKey[] = ['small', 'medium', 'large'];

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [textSize, setTextSize] = useState<TextSizeKey>('medium');
  const [browserLoading, setBrowserLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const activityLogged = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(TEXT_SIZE_KEY).then((saved: string | null) => {
      if (saved && SIZE_CYCLE.includes(saved as TextSizeKey)) {
        setTextSize(saved as TextSizeKey);
      }
    });
  }, []);

  useEffect(() => {
    if (id) {
      getArticle(id)
        .then(setArticle)
        .catch((e) => setErr(e?.message || 'Failed to load article'));
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    isFavorite('articles', id).then(setSaved).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!article || activityLogged.current) return;
    activityLogged.current = true;
    recordActivity({
      kind: 'article',
      title: article.title,
      detail: article.description,
      route: '/articles',
    }).catch(() => {});
  }, [article]);

  const cycleTextSize = useCallback(() => {
    setTextSize((current) => {
      const next = SIZE_CYCLE[(SIZE_CYCLE.indexOf(current) + 1) % SIZE_CYCLE.length];
      AsyncStorage.setItem(TEXT_SIZE_KEY, next);
      return next;
    });
  }, []);

  const formattedDate = article?.publishDate
    ? new Date(article.publishDate + 'T12:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const mdStyles = getMarkdownStyles(textSize);
  const shareText = article
    ? `${article.title}\n\n${article.description}${article.body ? `\n\n${article.body}` : ''}${article.linkedinUrl ? `\n\nRead more: ${article.linkedinUrl}` : ''}`
    : '';

  const toggleSave = async () => {
    if (!article) return;
    const next = await toggleFavorite('articles', article.id);
    setSaved(next);
    Alert.alert(next ? 'Saved' : 'Removed', next ? 'Article saved for later.' : 'Article removed from saved items.');
  };

  const shareArticle = async () => {
    if (!article) return;
    try {
      if (Platform.OS === 'web' && (navigator as any).share) {
        await (navigator as any).share({ title: article.title, text: shareText });
      } else {
        await Share.share({ title: article.title, message: shareText });
      }
    } catch {
      // no-op
    }
  };

  const copyArticle = async () => {
    if (!article) return;
    try {
      await Clipboard.setStringAsync(shareText);
      Alert.alert('Copied', 'Article text copied to the clipboard.');
    } catch {
      Alert.alert('Could not copy', 'Please try sharing the article instead.');
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={palette.text} />
          <Small style={{ color: palette.text, marginLeft: 6 }}>Articles</Small>
        </Pressable>

        <Pressable onPress={cycleTextSize} style={styles.textSizeBtn} hitSlop={12} accessibilityLabel="Adjust text size">
          <Text style={[styles.aaLabel, textSize === 'large' && styles.aaLarge, textSize === 'small' && styles.aaSmall]}>
            Aa
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
              <Markdown style={mdStyles}>{article.body}</Markdown>
            ) : (
              <Body dim style={{ fontStyle: 'italic', marginTop: spacing.m }}>
                Full article coming soon.
              </Body>
            )}

            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: spacing.l }}>
              <GhostButton
                label={saved ? 'Saved' : 'Save article'}
                onPress={toggleSave}
                icon={<Ionicons name={saved ? 'heart' : 'heart-outline'} size={14} color={palette.text} />}
              />
              <GhostButton
                label="Share"
                onPress={shareArticle}
                icon={<Ionicons name="share-outline" size={14} color={palette.text} />}
              />
              <GhostButton
                label="Copy"
                onPress={copyArticle}
                icon={<Ionicons name="copy-outline" size={14} color={palette.text} />}
              />
            </View>

            {article.linkedinUrl ? (
              <Pressable
                onPress={async () => {
                  if (browserLoading) return;
                  setBrowserLoading(true);
                  try {
                    await WebBrowser.openBrowserAsync(article.linkedinUrl!);
                  } finally {
                    setBrowserLoading(false);
                  }
                }}
                style={styles.linkedinBtn}
                disabled={browserLoading}
              >
                {browserLoading ? (
                  <ActivityIndicator size="small" color={palette.primary} />
                ) : (
                  <Ionicons name="logo-linkedin" size={16} color={palette.primary} />
                )}
                <Small style={{ color: palette.primary, fontWeight: '700' }}>
                  {browserLoading ? 'Opening…' : 'View on LinkedIn'}
                </Small>
                {!browserLoading && <Ionicons name="open-outline" size={14} color={palette.primary} />}
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.l,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
  },
  textSizeBtn: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
  },
  aaLabel: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
  aaSmall: {
    color: palette.textFaint,
    fontSize: 14,
  },
  aaLarge: {
    fontSize: 19,
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
