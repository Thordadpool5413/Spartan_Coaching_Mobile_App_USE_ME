import React, { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, spacing } from '../theme';
import { Card, H1, H3, Body, Small, SectionLabel } from '../components/UI';
import { getArticles, Article } from '../lib/api';

export default function ArticlesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Article[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    getArticles().then((d) => setItems(d.articles)).catch((e) => setErr(e?.message || 'Failed to load'));
  }, []);
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <SectionLabel>Articles & Insights</SectionLabel>
        <H1 style={{ marginBottom: spacing.s }}>Field-tested writing on hospice growth</H1>
        <Body dim style={{ marginBottom: spacing.l }}>
          Long-form pieces from Nick Lynch on building real referral relationships, fixing stuck census numbers, and coaching teams that execute.
        </Body>
        {!items && !err && <ActivityIndicator color={palette.primary} />}
        {err && <Body dim>{err}</Body>}
        {items?.map((a) => (
          <Pressable
            key={a.id}
            testID={`article-${a.id}`}
            onPress={() => router.push({ pathname: '/article-detail', params: { id: a.id } })}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginBottom: spacing.m })}
          >
            <Card>
              {a.featured && (
                <View style={styles.badge}>
                  <Ionicons name="star" size={10} color="#fff" />
                  <Small style={{ color: '#fff', fontWeight: '800', fontSize: 10 }}>FEATURED</Small>
                </View>
              )}
              <H3 style={{ marginBottom: spacing.s }}>{a.title}</H3>
              <Body dim style={{ fontSize: 14, marginBottom: spacing.s }}>{a.description}</Body>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Small style={{ color: palette.primary, fontWeight: '700' }}>Read Article</Small>
                <Ionicons name="chevron-forward" size={13} color={palette.primary} />
              </View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
});
