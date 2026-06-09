import React, { useEffect, useState } from 'react';
import { ScrollView, View, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, spacing } from '../../theme';
import { H1, H3, Body, Small, SectionLabel, Card, GhostButton } from '../../components/UI';
import { getArticles, Article } from '../../lib/api';

const ITEMS = [
  { route: '/knowledge', icon: 'library' as const, title: 'Knowledge Base', desc: '40+ entries: eligibility, regulations, levels of care, compliance, sales terms.' },
  { route: '/drills', icon: 'flame' as const, title: 'Daily Drills', desc: '40 practice drills across 8 categories. Daily rotation, streak tracking.' },
  { route: '/roleplay', icon: 'people' as const, title: 'Role-Play Practice', desc: 'Six AI scenarios: cold call, physician objection, family consult, and more.' },
];

export default function LearnTab() {
  const router = useRouter();
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
        contentContainerStyle={{ paddingBottom: 120, padding: spacing.l }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.primary} />}
      >
        <SectionLabel>Learn</SectionLabel>
        <H1 style={{ marginBottom: spacing.s }}>References & practice</H1>
        <Body dim style={{ marginBottom: spacing.xl }}>
          Field-tested resources to sharpen clinical fluency, sales execution, and daily habits.
        </Body>

        {ITEMS.map((t) => (
          <Pressable
            key={t.route}
            testID={`learn-${t.route.replace('/', '')}`}
            onPress={() => router.push(t.route as any)}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={t.icon} size={22} color={palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <H3 style={{ fontSize: 17, marginBottom: 4 }}>{t.title}</H3>
              <Small dim>{t.desc}</Small>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
          </Pressable>
        ))}

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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    padding: spacing.l,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    backgroundColor: palette.bgElev1,
    marginBottom: spacing.m,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: palette.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
});
