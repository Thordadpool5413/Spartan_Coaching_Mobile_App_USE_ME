import React, { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, radius, spacing } from '../theme';
import { Card, PrimaryButton, H1, H2, H3, Body, Small, SectionLabel } from '../components/UI';
import { getTestimonials, Testimonial, CaseStudy } from '../lib/api';

export default function TestimonialsScreen() {
  const router = useRouter();
  const [data, setData] = useState<{ testimonials: Testimonial[]; caseStudies: CaseStudy[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getTestimonials()
      .then(setData)
      .catch((e) => setErr(e?.message || 'Could not load testimonials'));
  }, []);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        <SectionLabel>Success Stories</SectionLabel>
        <H1 style={{ marginBottom: spacing.s }}>What People Are Saying</H1>
        <Body dim style={{ marginBottom: spacing.l }}>
          Real results from reps, leaders, and organizations who chose the Spartan way: fewer buzzwords, more practice. Behind every number is a family that got the conversation they needed.
        </Body>

        {!data && !err && (
          <View style={{ alignItems: 'center', padding: spacing.xxl }}>
            <ActivityIndicator color={palette.primary} />
          </View>
        )}
        {err && <Body dim>{err}</Body>}

        {data && (
          <>
            {data.testimonials.map((t) => (
              <Card key={t.id} style={{ marginBottom: spacing.l }} testID={`testimonial-${t.id}`}>
                <Ionicons name="chatbox" size={22} color={palette.primary} style={{ marginBottom: spacing.s }} />
                <Body style={{ fontStyle: 'italic', marginBottom: spacing.m }}>&ldquo;{t.quote}&rdquo;</Body>
                <View style={{ borderTopWidth: 1, borderTopColor: palette.cardBorder, paddingTop: spacing.m }}>
                  <H3>{t.name}</H3>
                  <Small dim>{t.title}</Small>
                  <Small dim style={{ marginBottom: spacing.s }}>{t.company}</Small>
                  <View style={styles.result}>
                    <Small style={{ color: palette.primary, fontWeight: '800', marginBottom: 4 }}>RESULT</Small>
                    <Body style={{ fontSize: 14 }}>{t.outcome}</Body>
                  </View>
                </View>
              </Card>
            ))}

            <View style={{ marginTop: spacing.l, marginBottom: spacing.m }}>
              <Small style={styles.kicker}>CASE STUDIES</Small>
              <H2>Measured outcomes from longer engagements</H2>
            </View>

            {data.caseStudies.map((c) => (
              <Card key={c.id} style={{ marginBottom: spacing.l }} testID={`case-${c.id}`}>
                <H3>{c.title}</H3>
                <Small dim style={{ marginBottom: spacing.m }}>{c.clientLabel}</Small>
                <Block label="The Challenge" text={c.challenge} />
                <Block label="The Solution" text={c.solution} />
                <Small style={[styles.kicker, { marginTop: spacing.s }]}>MEASURABLE RESULTS</Small>
                <View style={{ marginTop: 4 }}>
                  {c.results.map((r, i) => (
                    <View key={i} style={styles.bullet}>
                      <Ionicons name="checkmark-circle" size={14} color={palette.primary} />
                      <Body style={{ flex: 1, fontSize: 14 }}>{r}</Body>
                    </View>
                  ))}
                </View>
              </Card>
            ))}
          </>
        )}

        <LinearGradient colors={[palette.bgElev1, palette.bgElev2]} style={styles.cta}>
          <H2 style={{ color: '#fff', textAlign: 'center', marginBottom: spacing.s }}>
            Ready to see results like these?
          </H2>
          <Body dim style={{ textAlign: 'center', marginBottom: spacing.l }}>
            Whether you are a rep, a leader, or an executive scaling across markets, let&apos;s talk about what is not working and build a plan that fixes it.
          </Body>
          <PrimaryButton
            testID="testimonials-contact"
            label="Contact Spartan Coaching"
            onPress={() => router.push('/(tabs)/more')}
            icon={<Ionicons name="arrow-forward" size={14} color="#fff" />}
          />
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

function Block({ label, text }: { label: string; text: string }) {
  return (
    <View style={{ marginBottom: spacing.s }}>
      <Small style={styles.kicker}>{label.toUpperCase()}</Small>
      <Body style={{ marginTop: 4, fontSize: 14 }}>{text}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { color: palette.primary, fontWeight: '800', letterSpacing: 0.8, fontSize: 11 },
  bullet: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 6 },
  result: { backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: radius.md, padding: spacing.m },
  cta: { borderRadius: radius.xl, padding: spacing.xl, marginTop: spacing.l },
});
