import React from 'react';
import { ScrollView, View, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, spacing } from '../../theme';
import { H1, H3, Body, Small, SectionLabel, Card } from '../../components/UI';

const ITEMS = [
  { route: '/knowledge', icon: 'library' as const, title: 'Knowledge Base', desc: '40+ entries: eligibility, regulations, levels of care, compliance, sales terms.' },
  { route: '/drills', icon: 'flame' as const, title: 'Daily Drills', desc: '40 practice drills across 8 categories. Daily rotation, streak tracking.' },
  { route: '/roleplay', icon: 'people' as const, title: 'Role-Play Practice', desc: 'Six AI scenarios: cold call, physician objection, family consult, and more.' },
];

const ARTICLES = [
  {
    title: 'Eligibility is not a sales decision. It is a clinical one.',
    excerpt: 'Hospice eligibility lives in the clinical record, not in the cold call. Here is how to talk about it without crossing the line.',
  },
  {
    title: 'The eighteen-day problem',
    excerpt: 'The median hospice length of stay is around 18 days. What that means for families, clinicians, and the sales team trying to help.',
  },
  {
    title: 'Why "checking in" is killing your pipeline',
    excerpt: 'If your last six visits could be summarized as "checking in," you are not doing relationship building. You are doing avoidance.',
  },
  {
    title: 'How to coach without micromanaging',
    excerpt: 'A weekly rhythm that holds reps accountable without making the leader the bottleneck. Three meetings, four hours total, real outcomes.',
  },
];

export default function LearnTab() {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100, padding: spacing.l }}>
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
        {ARTICLES.map((a, i) => (
          <Card key={i} style={{ marginBottom: spacing.m }}>
            <Small dim style={{ marginBottom: 4, color: palette.primary }}>Article · 6 min read</Small>
            <H3 style={{ marginBottom: 6 }}>{a.title}</H3>
            <Body dim>{a.excerpt}</Body>
          </Card>
        ))}
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
