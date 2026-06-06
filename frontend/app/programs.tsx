import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, radius, spacing } from '../theme';
import { Card, PrimaryButton, H1, H2, H3, Body, Small, SectionLabel } from '../components/UI';

type Program = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  duration: string;
  who: string;
  description: string;
  outcomes: string[];
};

const PROGRAMS: Program[] = [
  {
    icon: 'person',
    title: 'New Rep Onboarding Program',
    duration: '90 days',
    who: 'Reps in their first 6 months on the job',
    description:
      'A structured 90-day ramp built around the four Spartan subjects (Discovery, Connecting, Guiding, Commitment). Includes weekly territory walks, scripted prospecting, and live coach feedback after every ride-along.',
    outcomes: [
      'Time to first admission cut from 11+ weeks to ~3.5 weeks',
      'Confident handling of the top 5 stall objections by Day 60',
      'Documented Top-20 account list with classification by Day 30',
      'Written 90-day plan signed off by the rep and their manager',
    ],
  },
  {
    icon: 'school',
    title: 'Established Rep Skill Sharpening',
    duration: '6 weeks',
    who: 'Reps stuck on a plateau or hitting the same objections weekly',
    description:
      'A focused 6-week intensive on the one skill blocking your growth right now — usually objection handling, follow-up cadence, or physician outreach. Two live sessions per week plus drill homework.',
    outcomes: [
      'Conversion rate lift of 20-40% within 12 weeks of completion',
      'Personal objection playbook with words you can actually use',
      'New referral source acquired during the program',
    ],
  },
  {
    icon: 'people',
    title: 'Sales Manager Coaching Cohort',
    duration: '3 months',
    who: 'Front-line managers and directors of 4-12 reps',
    description:
      'A small-group cohort (max 6 managers) that meets every two weeks. Topics include pipeline review framework, ride-along structure, scorecard design, and the weekly huddle that actually drives behavior.',
    outcomes: [
      'Team-wide consistency in pipeline reviews and coaching cadence',
      'Standard ride-along observation form your team will actually use',
      'Manager coaching time triples (from ~2 hr/week to ~8 hr/week)',
    ],
  },
  {
    icon: 'business',
    title: 'Corporate System Implementation',
    duration: '6-12 months',
    who: 'Multi-site hospice organizations standardizing across markets',
    description:
      'A full enterprise engagement: discovery, sales-process design, multi-market rollout, leadership coaching, and a tracking dashboard. Built collaboratively with your top performers, not imposed from outside.',
    outcomes: [
      'One unified sales process across every market',
      'Variance in performance across markets cut by 70%+',
      'New acquisitions reach break-even in <8 months (was 18+)',
    ],
  },
];

export default function ProgramsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }}>
        <SectionLabel>Training Programs</SectionLabel>
        <H1 style={{ marginBottom: spacing.s }}>Structured engagements that change behavior</H1>
        <Body dim style={{ marginBottom: spacing.l }}>
          One-off sessions help. Programs change patterns. These are the longer engagements built around the Spartan Method — discipline, empathy, strategy applied weekly until the behavior sticks.
        </Body>

        {PROGRAMS.map((p) => (
          <Card key={p.title} style={{ marginBottom: spacing.l }} testID={`program-${p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m, marginBottom: spacing.s }}>
              <LinearGradient colors={[palette.primary, palette.primaryDark]} style={styles.icon}>
                <Ionicons name={p.icon} size={22} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <H3>{p.title}</H3>
                <Small style={{ color: '#22c55e', fontWeight: '700' }}>{p.duration} · {p.who}</Small>
              </View>
            </View>
            <Body dim style={{ fontSize: 14, marginBottom: spacing.m }}>{p.description}</Body>
            <Small style={styles.kicker}>OUTCOMES</Small>
            <View style={{ marginTop: 4 }}>
              {p.outcomes.map((o, i) => (
                <View key={i} style={styles.bullet}>
                  <Ionicons name="checkmark" size={14} color={palette.primary} />
                  <Body style={{ flex: 1, fontSize: 14 }}>{o}</Body>
                </View>
              ))}
            </View>
            <PrimaryButton
              testID={`program-quote-${p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              label="Discuss this program"
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/more',
                  params: { interest: p.title },
                } as any)
              }
              icon={<Ionicons name="arrow-forward" size={14} color="#fff" />}
              style={{ marginTop: spacing.m }}
            />
          </Card>
        ))}

        <Card style={{ marginTop: spacing.l }}>
          <H2 style={{ marginBottom: spacing.s }}>Not sure which fits?</H2>
          <Body dim style={{ marginBottom: spacing.m }}>
            Book a 30-min virtual coaching session and we&apos;ll diagnose where you are, where you want to be, and which engagement closes the gap.
          </Body>
          <PrimaryButton
            label="Book a coaching session"
            onPress={() => router.push('/services')}
            icon={<Ionicons name="card" size={14} color="#fff" />}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kicker: { color: palette.primary, fontWeight: '800', letterSpacing: 0.8, fontSize: 11 },
  bullet: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 6 },
});
