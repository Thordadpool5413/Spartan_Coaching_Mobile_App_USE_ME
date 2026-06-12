import React, { useEffect, useState } from 'react';
import { ScrollView, View, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { palette, spacing } from '../../theme';
import { H1, H3, Body, Small, SectionLabel, Card, GhostButton, NativeListSection } from '../../components/UI';
import { getArticles, Article } from '../../lib/api';

const ITEMS = [
  { route: '/knowledge', icon: 'library' as const, title: 'Knowledge Base', desc: '40+ entries: eligibility, regulations, levels of care, compliance, sales terms.' },
  { route: '/drills', icon: 'flame' as const, title: 'Daily Drills', desc: '40 practice drills across 8 categories. Daily rotation, streak tracking.' },
  { route: '/roleplay', icon: 'people' as const, title: 'Role-Play Practice', desc: 'Six AI scenarios: cold call, physician objection, family consult, and more.' },
];

export default function LearnTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const d = await getArticles();
    setArticles((d.articles || []).slice(0, 4));
  };

  useEffect(() => {
    load().catch(() => {}).finally(() => setLoading(false));
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try { await load(); } catch {}
    setRefreshing(false);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 73, padding: spacing.l }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.primary} />}
      >
        <SectionLabel>Learn</SectionLabel>
        <H1 style={{ marginBottom: spacing.s }}>References & practice</H1>
        <Body dim style={{ marginBottom: spacing.xl }}>
          Field-tested resources to sharpen clinical fluency, sales execution, and daily habits.
        </Body>

        <NativeListSection
          style={{ marginBottom: spacing.xxl }}
          rows={ITEMS.map((t) => ({
            key: t.route,
            testID: `learn-${t.route.replace('/', '')}`,
            icon: t.icon,
            title: t.title,
            subtitle: t.desc,
            onPress: () => router.push(t.route as any),
          }))}
        />

        <SectionLabel>Field Notes</SectionLabel>
        <H3 style={{ marginBottom: spacing.l }}>Recent perspective from Nick Lynch</H3>

        {loading && <ActivityIndicator color={palette.primary} style={{ marginBottom: spacing.l }} />}

        {!loading && articles.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => router.push({ pathname: '/article-detail', params: { id: a.id } } as any)}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <Card style={{ marginBottom: spacing.m }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <Small style={{ color: palette.primary, fontWeight: '700' }}>
                  {a.featured ? 'FEATURED · ' : ''}Article
                </Small>
                <Small dim>{a.publishDate}</Small>
              </View>
              <H3 style={{ marginBottom: 6 }}>{a.title}</H3>
              <Body dim numberOfLines={2}>{a.description}</Body>
              <Small style={{ color: palette.primary, fontWeight: '700', marginTop: spacing.s }}>
                Read article →
              </Small>
            </Card>
          </Pressable>
        ))}

        {!loading && articles.length === 0 && (
          <Body dim style={{ marginBottom: spacing.l }}>No articles yet.</Body>
        )}

        <GhostButton
          label="All articles & insights →"
          onPress={() => router.push('/articles' as any)}
          style={{ marginTop: spacing.s }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
