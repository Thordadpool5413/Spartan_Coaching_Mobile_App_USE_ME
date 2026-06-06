import React from 'react';
import { ScrollView, View, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, radius, spacing } from '../../theme';
import { H1, H3, Body, Small, SectionLabel } from '../../components/UI';

const TOOLS = [
  {
    route: '/eligibility',
    icon: 'medical' as const,
    title: 'Eligibility Quick Check',
    desc: 'A 60-second guided clinical questionnaire that produces a shareable hospice-readiness summary aligned to Medicare LCDs.',
  },
  {
    route: '/ask',
    icon: 'sparkles' as const,
    title: 'Ask a Hospice Expert',
    desc: 'Get instant expert answers on eligibility, regulations, sales strategies, territory planning, and more.',
  },
  {
    route: '/chat',
    icon: 'chatbubbles' as const,
    title: 'Coach Chat',
    desc: 'Multi-turn conversational coaching. Persistent dialog, ask follow-ups, iterate on tough situations.',
  },
  {
    route: '/playbook',
    icon: 'bulb' as const,
    title: 'Sales Playbook Generator',
    desc: 'Build the playbook before the visit. Custom to your scenario and referral source type.',
  },
  {
    route: '/objection',
    icon: 'shield-checkmark' as const,
    title: 'Objection Handler',
    desc: 'Patient-centered responses for any objection. Three angles: clinical, empathetic, practical.',
  },
  {
    route: '/roleplay',
    icon: 'people' as const,
    title: 'Role-Play Practice',
    desc: 'Practice the hard conversation before it is real. Six scenarios, AI prospect, scored & coached.',
  },
  {
    route: '/drills',
    icon: 'flame' as const,
    title: 'Daily Coaching Drills',
    desc: 'Ten minutes a day on objection handling, clinical knowledge, and territory planning. Streak tracked.',
  },
];

export default function ToolsTab() {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100, padding: spacing.l }}>
        <SectionLabel>AI Tools</SectionLabel>
        <H1 style={{ marginBottom: spacing.s }}>Sharpen the craft</H1>
        <Body dim style={{ marginBottom: spacing.xl }}>
          Built on real hospice field experience. Use these tools to plan your week, sharpen your messaging, and prepare for tough conversations.
        </Body>

        {TOOLS.map((t) => (
          <Pressable
            key={t.route}
            testID={`tools-tab-${t.route.replace('/', '')}`}
            onPress={() => router.push(t.route as any)}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={[palette.bgElev2, palette.bgElev1]}
              style={styles.rowInner}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={t.icon} size={22} color={palette.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <H3 style={{ fontSize: 17, marginBottom: 4 }}>{t.title}</H3>
                <Small dim>{t.desc}</Small>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
            </LinearGradient>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: spacing.m },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    padding: spacing.l,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.cardBorder,
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
