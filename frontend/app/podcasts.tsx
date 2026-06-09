import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, radius, spacing } from '../theme';
import { H1, H3, Body, Small, SectionLabel } from '../components/UI';

const COMING_TOPICS = [
  { icon: 'map' as const, label: 'Territory strategy', desc: 'Building a top-20 account list that actually converts.' },
  { icon: 'shield-checkmark' as const, label: 'Objection handling', desc: 'The six objections every hospice rep faces — and how to navigate them.' },
  { icon: 'people' as const, label: 'Physician outreach', desc: 'How to get from intro to trusted referral partner in 60 days.' },
  { icon: 'heart' as const, label: 'Family conversations', desc: 'Helping families understand hospice without fear or pressure.' },
];

export default function PodcastsScreen() {
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }}>
        <SectionLabel>Spartan Podcast</SectionLabel>
        <H1 style={{ marginBottom: spacing.s }}>Episodes for hospice reps and leaders</H1>
        <Body dim style={{ marginBottom: spacing.xl }}>
          Practical episodes on territory, follow-up, objections, and the conversations that actually move referrals.
        </Body>

        <LinearGradient
          colors={['#1a0808', '#0f0f12']}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.micBadge}>
            <Ionicons name="mic" size={36} color={palette.primary} />
          </View>
          <H3 style={{ textAlign: 'center', marginBottom: spacing.s, fontSize: 22 }}>
            Coming soon
          </H3>
          <Body dim style={{ textAlign: 'center', lineHeight: 24 }}>
            The Spartan Coaching Podcast is in production. Episodes will drop monthly — check back soon.
          </Body>
          <View style={styles.launchRow}>
            <View style={styles.launchDot} />
            <Small style={{ color: '#86efac', fontWeight: '700' }}>Launching 2026</Small>
          </View>
        </LinearGradient>

        <View style={{ marginTop: spacing.xl }}>
          <SectionLabel>Episode topics in the queue</SectionLabel>
          <H3 style={{ marginBottom: spacing.l }}>What we&apos;re covering first</H3>
          {COMING_TOPICS.map((t, i) => (
            <View key={i} style={styles.topicRow}>
              <View style={styles.topicIcon}>
                <Ionicons name={t.icon} size={20} color={palette.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Small style={{ color: palette.text, fontWeight: '800', marginBottom: 3 }}>{t.label}</Small>
                <Small dim>{t.desc}</Small>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.notifyCard}>
          <Ionicons name="notifications-outline" size={22} color={palette.primary} />
          <View style={{ flex: 1 }}>
            <Small style={{ color: palette.text, fontWeight: '800', marginBottom: 2 }}>Get notified at launch</Small>
            <Small dim>Enable push notifications in Settings to hear about new episodes first.</Small>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: spacing.xxxl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    alignItems: 'center',
  },
  micBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: palette.primaryTint,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.l,
  },
  launchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.l,
    paddingTop: spacing.m,
    borderTopWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)',
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  launchDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.m,
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderColor: palette.divider,
  },
  topicIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: palette.primaryTint,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.m,
    marginTop: spacing.xl,
    padding: spacing.l,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    backgroundColor: palette.bgElev1,
  },
});
