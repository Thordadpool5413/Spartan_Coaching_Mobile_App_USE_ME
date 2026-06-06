import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, radius, spacing } from '../theme';
import { Card, PrimaryButton, H1, H2, H3, Body, Small, SectionLabel, Pill } from '../components/UI';

const TIERS = [
  {
    icon: 'people' as const,
    label: 'Individual Sales Reps',
    price: 'From $40/session',
    desc: 'Virtual coaching sessions, field ridealongs, and territory management coaching. Targeted help on exactly what is stalling your results.',
    bullets: ['1-on-1 virtual coaching (60 min sessions)', 'Quarterly ridealongs available', 'Personal scorecard & weekly check-ins'],
  },
  {
    icon: 'briefcase' as const,
    label: 'Sales Leadership',
    price: 'Custom pricing',
    desc: 'Team workshops, leadership coaching, and growth strategy consulting. Build teams that execute the same playbook and hold each other accountable.',
    bullets: ['Team workshops (half / full day)', 'Manager coaching cadence', 'Pipeline review rhythm setup'],
  },
  {
    icon: 'business' as const,
    label: 'Corporate Providers',
    price: 'Custom pricing',
    desc: 'Market analysis, system implementation, and executive consulting. Scale execution across markets and make growth predictable and repeatable.',
    bullets: ['Market & territory analysis', 'Multi-market system rollout', 'Executive advisory engagements'],
  },
  {
    icon: 'phone-portrait' as const,
    label: 'Technology Solutions',
    price: 'Custom pricing',
    desc: 'Custom CRMs, iOS apps, and websites built specifically for hospice providers. Purpose-built tools that fit how your organization actually works.',
    bullets: ['Custom CRM tailored to hospice workflow', 'iOS apps for liaisons in the field', 'Branded websites that convert'],
  },
];

export default function ServicesScreen() {
  const router = useRouter();
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }}>
        <SectionLabel>Services & Pricing</SectionLabel>
        <H1 style={{ marginBottom: spacing.s }}>Built for every level of the organization</H1>
        <Body dim style={{ marginBottom: spacing.l }}>
          Whether you are an individual rep, a sales director, a multi-market operator, or a hospice provider who needs purpose-built technology, there is an engagement built for your situation.
        </Body>

        {TIERS.map((t, i) => (
          <Card key={i} style={{ marginBottom: spacing.l }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m, marginBottom: spacing.s }}>
              <LinearGradient colors={[palette.primary, palette.primaryDark]} style={styles.iconWrap}>
                <Ionicons name={t.icon} size={22} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <H3>{t.label}</H3>
                <Small style={{ color: '#22c55e', fontWeight: '700' }}>{t.price}</Small>
              </View>
            </View>
            <Body dim style={{ marginBottom: spacing.s }}>{t.desc}</Body>
            <View style={{ marginTop: spacing.s }}>
              {t.bullets.map((b, j) => (
                <View key={j} style={styles.bullet}>
                  <Ionicons name="checkmark" size={14} color={palette.primary} />
                  <Body style={{ flex: 1, fontSize: 14 }}>{b}</Body>
                </View>
              ))}
            </View>
          </Card>
        ))}

        <PrimaryButton
          label="Get in Touch"
          onPress={() => router.push('/(tabs)/more')}
          icon={<Ionicons name="arrow-forward" size={14} color="#fff" />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bullet: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 8 },
});
