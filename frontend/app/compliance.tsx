import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, spacing } from '../theme';
import { Card, H1, H3, Body, Small, SectionLabel } from '../components/UI';

const POINTS = [
  'Coaching focuses on ethical relationship building and education, not inducements',
  'Do not enter patient identifiers or PHI into any tools',
  'Tools are for planning and messaging workflows, not documentation',
  'Client data is not used to train public models',
  'No guarantees of admissions, referrals, or census growth',
];

const BOUNDARIES = [
  { title: 'What we will not train', body: 'Inducements. Misleading messaging. Aggressive tactics. Anything that pressures a patient or family before clinical appropriateness.' },
  { title: 'PHI and AI tool usage', body: 'No protected health information is entered into AI tools by Spartan-trained reps. Tools are for planning, messaging, and territory workflow, never for documentation or patient identifiers.' },
  { title: 'Education-based relationships', body: 'Every approach we teach is education-based. The first deliverable to a referral source is clarity, not a pitch. Trust is earned through consistent value, not given through entertainment.' },
  { title: 'No guarantees', body: 'We do not promise specific outcomes — admissions, referrals, or census growth. We provide frameworks, coaching, and accountability. Results depend on consistent execution by committed teams.' },
];

export default function ComplianceScreen() {
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        <SectionLabel>Compliance & Ethics</SectionLabel>
        <H1 style={{ marginBottom: spacing.s }}>Our Compliance Posture</H1>
        <Body dim style={{ marginBottom: spacing.xl }}>
          Spartan Coaching is built on ethical, education-based relationship building. We believe sustainable growth comes from genuine clinical partnerships, not shortcuts.
        </Body>

        <Card style={{ marginBottom: spacing.l }}>
          {POINTS.map((p, i) => (
            <View key={i} style={styles.row}>
              <View style={styles.num}>
                <Small style={{ color: palette.primary, fontWeight: '800' }}>{i + 1}</Small>
              </View>
              <Body style={{ flex: 1 }}>{p}</Body>
            </View>
          ))}
        </Card>

        {BOUNDARIES.map((b, i) => (
          <Card key={i} style={{ marginBottom: spacing.m }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Ionicons name="shield-checkmark" size={20} color={palette.primary} />
              <H3 style={{ flex: 1 }}>{b.title}</H3>
            </View>
            <Body dim>{b.body}</Body>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  num: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: palette.primaryTint, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: palette.primary + '40',
  },
});
