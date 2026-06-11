import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, radius, spacing, typography } from '../../theme';
import { Card, PrimaryButton, GhostButton, H2, H3, Body, Small, SectionLabel } from '../../components/UI';
import { StampSlam } from '../../components/StampSlam';
import { getTodayDrill, getDrillStats, DrillToday, DrillStats, getHeroBadge } from '../../lib/api';
import { getDeviceId } from '../../lib/device';

const SPARTAN_LOGO = require('../../assets/images/spartan-stamp-logo.png');

const TOOLS = [
  { route: '/ask', icon: 'sparkles' as const, title: 'Ask a Hospice Expert', desc: 'Instant expert answers' },
  { route: '/chat', icon: 'chatbubbles' as const, title: 'Coach Chat', desc: 'Conversational coaching' },
  { route: '/playbook', icon: 'bulb' as const, title: 'Sales Playbook', desc: 'Pre-visit prep' },
  { route: '/objection', icon: 'shield-checkmark' as const, title: 'Objection Handler', desc: 'Three patient-centered responses' },
  { route: '/roleplay', icon: 'people' as const, title: 'Role-Play Practice', desc: 'Six AI scenarios, scored' },
  { route: '/drills', icon: 'flame' as const, title: 'Daily Drills', desc: 'Ten minutes a day' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [drill, setDrill] = useState<DrillToday | null>(null);
  const [stats, setStats] = useState<DrillStats | null>(null);
  const [heroBadge, setHeroBadge] = useState('2026 Coaching Programs Open');

  useEffect(() => {
    (async () => {
      try {
        const [d, deviceId, badge] = await Promise.all([
          getTodayDrill(),
          getDeviceId(),
          getHeroBadge(),
        ]);
        setDrill(d);
        setHeroBadge(badge.text);
        const s = await getDrillStats(deviceId);
        setStats(s);
      } catch (e) {
        // silent
      }
    })();
  }, []);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Hero */}
        <LinearGradient
          colors={['#1a0808', '#0a0a0b']}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.heroBadge}>
            <View style={styles.dotPulse} />
            <Text style={styles.badgeText}>{heroBadge}</Text>
            <Ionicons name="arrow-forward" size={12} color="#86efac" />
          </View>
          <StampSlam source={SPARTAN_LOGO} width={300} height={300} onceKey="home_hero" style={{ alignSelf: 'center', marginBottom: spacing.s }} />
          <Text style={styles.heroTitle}>Hospice Sales{'\n'}Coaching</Text>
          <Text style={styles.heroSub}>
            Eligible patients are not receiving hospice care because the right conversations are not happening. Spartan Coaching exists to close that gap, one prepared visit at a time.
          </Text>
          <View style={{ gap: 10, marginTop: spacing.l }}>
            <PrimaryButton
              testID="home-ask-btn"
              label="Ask a Hospice Expert"
              onPress={() => router.push('/ask')}
              icon={<Ionicons name="sparkles" size={16} color="#fff" />}
            />
            <GhostButton
              testID="home-services-btn"
              label="See Services & Pricing"
              onPress={() => router.push('/services')}
              icon={<Ionicons name="briefcase-outline" size={16} color={palette.text} />}
            />
          </View>
        </LinearGradient>

        {/* Daily Drill */}
        <View style={{ padding: spacing.l }}>
          <SectionLabel>Today&apos;s Drill</SectionLabel>
          <Pressable testID="home-drill-card" onPress={() => router.push('/drills')}>
            <Card style={styles.drillCard}>
              <View style={styles.drillTop}>
                <View style={styles.flameWrap}>
                  <Ionicons name="flame" size={20} color={palette.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Small dim>{drill?.category || 'Loading…'}</Small>
                  <Text style={styles.streakText}>
                    <Text style={{ color: palette.primary, fontWeight: '900' }}>{stats?.streak ?? 0}</Text>{' '}
                    day streak · {stats?.totalCompleted ?? 0} completed
                  </Text>
                </View>
              </View>
              <Body style={{ marginTop: spacing.m }}>{drill?.drill || 'Loading today\u2019s drill…'}</Body>
              <View style={styles.drillFooter}>
                <Small style={{ color: palette.primary, fontWeight: '700' }}>Open daily drills →</Small>
              </View>
            </Card>
          </Pressable>
        </View>

        {/* Eligibility Quick Check - Lead Magnet */}
        <View style={{ paddingHorizontal: spacing.l, marginBottom: spacing.l }}>
          <Pressable
            testID="home-eligibility-card"
            onPress={() => router.push('/eligibility')}
            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
          >
            <LinearGradient
              colors={['#1f0b0b', '#2a0d0d', '#0a0a0b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.eligCard}
            >
              <View style={styles.eligBadge}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: palette.primary }} />
                <Text style={styles.eligBadgeText}>NEW · 60-SECOND TOOL</Text>
              </View>
              <H2 style={{ marginTop: spacing.s, marginBottom: spacing.s, color: '#fff' }}>
                Hospice Eligibility{'\n'}<Text style={{ color: palette.primary }}>Quick Check</Text>
              </H2>
              <Body dim style={{ marginBottom: spacing.l }}>
                A guided clinical snapshot — diagnosis, decline indicators, FAST/PPS — produces a shareable hospice-readiness summary aligned to Medicare LCDs.
              </Body>
              <View style={styles.eligStats}>
                {[
                  { n: '60', l: 'seconds' },
                  { n: '10', l: 'diagnoses' },
                  { n: 'LCD', l: 'aligned' },
                ].map((s, i) => (
                  <View key={i} style={styles.eligStat}>
                    <Text style={styles.eligStatN}>{s.n}</Text>
                    <Text style={styles.eligStatL}>{s.l}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.eligCta}>
                <Text style={styles.eligCtaText}>Start the check</Text>
                <Ionicons name="arrow-forward" size={16} color={palette.primary} />
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Tools */}
        <View style={{ paddingHorizontal: spacing.l }}>
          <SectionLabel>Spartan Coaching Tools</SectionLabel>
          <H2 style={{ marginBottom: spacing.s }}>Built for the field</H2>
          <Body dim style={{ marginBottom: spacing.l }}>
            Sharpen your messaging, prepare for tough conversations, and practice the hard ones before they are real.
          </Body>
          <View style={styles.toolGrid}>
            {TOOLS.map((t) => (
              <Pressable
                key={t.route}
                testID={`tool-card-${t.route.replace('/', '')}`}
                onPress={() => router.push(t.route as any)}
                style={({ pressed }) => [styles.toolCard, { opacity: pressed ? 0.85 : 1 }]}
              >
                <LinearGradient
                  colors={[palette.bgElev2, palette.bgElev1]}
                  style={styles.toolCardInner}
                >
                  <LinearGradient
                    colors={['rgba(239,68,68,0.18)', 'rgba(239,68,68,0.07)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.toolIconWrap}
                  >
                    <Ionicons name={t.icon} size={22} color={palette.primary} />
                  </LinearGradient>
                  <Text style={styles.toolTitle}>{t.title}</Text>
                  <Text style={styles.toolDesc}>{t.desc}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </View>

        {/* The Stakes */}
        <View style={{ padding: spacing.l, marginTop: spacing.l }}>
          <LinearGradient colors={['#150505', '#0a0a0b']} style={styles.stakes}>
            <SectionLabel>The Real Problem</SectionLabel>
            <H2 style={{ marginBottom: spacing.m }}>The gap is not clinical.{'\n'}It is conversational.</H2>
            <Body dim>
              The average hospice length of stay is around eighteen days. The Medicare benefit allows up to six months. That gap exists because the right conversations did not happen. A referral that did not get made. A physician who said &quot;not yet&quot; to a rep who did not know how to respond.
            </Body>
            <View style={{ marginTop: spacing.l }}>
              <GhostButton label="Read the Spartan Ethos" onPress={() => router.push('/manifesto')} />
            </View>
          </LinearGradient>
        </View>

        {/* Trust bullets */}
        <View style={{ padding: spacing.l }}>
          <H3 style={{ marginBottom: spacing.l }}>Built for hospice growth</H3>
          {[
            'Hospice-specific coaching, not generic sales training',
            'Compliance-aware messaging that respects clinical workflow',
            'Systems that work on Tuesday afternoon, not just in a conference room',
            'Weekly accountability rhythm that keeps execution consistent',
            'Field-tested frameworks used by real hospice growth teams',
          ].map((bullet, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={styles.checkWrap}>
                <Ionicons name="checkmark" size={14} color={palette.primary} />
              </View>
              <Body style={{ flex: 1 }}>{bullet}</Body>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={{ padding: spacing.l, paddingTop: 0 }}>
          <LinearGradient colors={['#0f0f12', '#0a0a0b']} style={styles.cta}>
            <H3 style={{ textAlign: 'center', marginBottom: spacing.s }}>If this resonates, reach out.</H3>
            <Body dim style={{ textAlign: 'center', marginBottom: spacing.l }}>
              No pressure. Just an honest conversation about where your team is and what would actually help.
            </Body>
            <PrimaryButton
              testID="home-contact-cta"
              label="Get in Touch"
              onPress={() => router.push('/(tabs)/more')}
              icon={<Ionicons name="arrow-forward" size={16} color="#fff" />}
            />
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: spacing.l,
    paddingTop: spacing.l,
    paddingBottom: spacing.xxxl,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    marginBottom: spacing.l,
  },
  dotPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  badgeText: { color: '#86efac', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  heroTitle: {
    color: palette.primary,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1.5,
    lineHeight: 48,
    marginBottom: spacing.m,
  },
  heroSub: { ...typography.bodyLg, color: palette.textDim },
  drillCard: { padding: spacing.l },
  drillTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  flameWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: palette.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  streakText: { color: palette.text, fontSize: 13, marginTop: 2 },
  drillFooter: { marginTop: spacing.m, paddingTop: spacing.m, borderTopWidth: 1, borderColor: palette.divider },
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.m, marginBottom: spacing.l },
  toolCard: { width: '48%' },
  toolCardInner: {
    padding: spacing.l,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    minHeight: 140,
    gap: 8,
  },
  toolIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    overflow: 'hidden',
  },
  toolTitle: { color: palette.text, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  toolDesc: { color: palette.textDim, fontSize: 12, lineHeight: 17 },
  stakes: {
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.cardBorder,
  },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.m, marginBottom: spacing.m },
  checkWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: palette.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cta: {
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.cardBorder,
  },
  eligCard: {
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    overflow: 'hidden',
  },
  eligBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryTint,
    borderWidth: 1,
    borderColor: palette.primary + '50',
  },
  eligBadgeText: {
    color: palette.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  eligStats: {
    flexDirection: 'row',
    gap: spacing.m,
    marginBottom: spacing.l,
    paddingVertical: spacing.m,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)',
  },
  eligStat: { flex: 1, alignItems: 'center' },
  eligStatN: { color: palette.primary, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  eligStatL: { color: palette.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  eligCta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eligCtaText: { color: palette.primary, fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
});
