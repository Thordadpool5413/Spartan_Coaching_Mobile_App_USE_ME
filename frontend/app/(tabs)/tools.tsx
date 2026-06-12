import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { palette, spacing } from '../../theme';
import { H1, Body, SectionLabel, NativeListSection } from '../../components/UI';

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
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 73, padding: spacing.l }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SectionLabel>AI Tools</SectionLabel>
        <H1 style={{ marginBottom: spacing.s }}>Sharpen the craft</H1>
        <Body dim style={{ marginBottom: spacing.xl }}>
          Built on real hospice field experience. Use these tools to plan your week, sharpen your messaging, and prepare for tough conversations.
        </Body>

        <NativeListSection
          rows={TOOLS.map((t) => ({
            key: t.route,
            testID: `tools-tab-${t.route.replace('/', '')}`,
            icon: t.icon,
            title: t.title,
            subtitle: t.desc,
            onPress: () => router.push(t.route as any),
          }))}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
