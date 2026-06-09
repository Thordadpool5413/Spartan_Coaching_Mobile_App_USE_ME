import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { palette, spacing, radius, typography } from '../theme';
import { Body, Small, H1, H2, H3, SectionLabel } from '../components/UI';
import { createSubscriptionCheckout, fetchSubscriptionStatus, invalidateSubscriptionCache } from '../lib/subscription';

const SPARTAN_CIRCLE = require('../assets/images/spartan-circle-logo.png');

const BULLETS = [
  {
    icon: 'sparkles' as const,
    text: 'Ask a hospice expert anything — eligibility, clinical criteria, Medicare rules — in seconds',
  },
  {
    icon: 'shield-checkmark' as const,
    text: "Practice objection handling with an AI that knows every pushback you'll face in the field",
  },
  {
    icon: 'bulb' as const,
    text: 'Generate custom visit playbooks for any referral source in under a minute',
  },
  {
    icon: 'people' as const,
    text: 'Role-play difficult conversations with a virtual physician, discharge planner, or SNF administrator',
  },
  {
    icon: 'flame' as const,
    text: 'Daily drills that keep you sharp between sales calls — 10 minutes a day, measurable improvement',
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const origin =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? window.location.origin
          : 'spartan://';
      const url = await createSubscriptionCheckout(origin);
      if (Platform.OS === 'web') {
        window.location.href = url;
      } else {
        await WebBrowser.openBrowserAsync(url);
        // After browser closes, refresh subscription status
        invalidateSubscriptionCache();
        await fetchSubscriptionStatus();
        router.back();
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not open checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const restore = async () => {
    invalidateSubscriptionCache();
    await fetchSubscriptionStatus();
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} bounces={false} showsVerticalScrollIndicator={false}>
        {/* Header gradient */}
        <LinearGradient colors={['#1a0808', palette.bg]} style={styles.hero}>
          <View style={styles.logoWrap}>
            <View style={styles.logoRing}>
              {/* eslint-disable-next-line @typescript-eslint/no-require-imports */}
              {/* logo image intentionally omitted here for perf; icon used instead */}
              <Ionicons name="shield-checkmark" size={36} color={palette.primary} />
            </View>
          </View>

          <SectionLabel style={{ textAlign: 'center', marginBottom: spacing.s }}>
            Spartan Coaching Pro
          </SectionLabel>
          <H1 style={[typography.h1, styles.headline]}>
            The only AI coach built{'\n'}for hospice sales.
          </H1>
          <H3 style={{ color: palette.textDim, textAlign: 'center', fontWeight: '400', marginTop: spacing.s }}>
            Nothing else exists like this.
          </H3>
        </LinearGradient>

        {/* Bullets */}
        <View style={styles.bulletsWrap}>
          {BULLETS.map((b, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={styles.bulletIcon}>
                <Ionicons name={b.icon} size={18} color={palette.primary} />
              </View>
              <Body style={{ flex: 1, lineHeight: 22, color: palette.text }}>{b.text}</Body>
            </View>
          ))}
        </View>

        {/* Social proof */}
        <View style={styles.proofWrap}>
          <Small style={styles.proof}>
            "Designed by a hospice sales professional, for hospice sales professionals."
          </Small>
        </View>

        {/* Pricing card */}
        <View style={styles.cardWrap}>
          <LinearGradient
            colors={[palette.bgElev2, palette.bgElev1]}
            style={styles.pricingCard}
          >
            <View style={styles.priceRow}>
              <H1 style={[typography.hero, { color: palette.text, letterSpacing: -1.5 }]}>
                $39.99
              </H1>
              <Body dim style={{ marginLeft: 6, marginTop: 14 }}>/month</Body>
            </View>
            <Small dim style={{ textAlign: 'center', marginBottom: spacing.l }}>
              Less than one hour of sales consulting. Cancel anytime.
            </Small>

            {error ? (
              <View style={styles.errorWrap}>
                <Small style={{ color: palette.primary }}>{error}</Small>
              </View>
            ) : null}

            <Pressable
              onPress={subscribe}
              disabled={loading}
              style={({ pressed }) => [styles.ctaBtn, { opacity: pressed || loading ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={[palette.primary, palette.primaryDark]}
                style={styles.ctaGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="sparkles" size={18} color="#fff" />
                <Body style={{ color: '#fff', fontWeight: '800', fontSize: 17, marginLeft: 8 }}>
                  {loading ? 'Opening checkout…' : 'Start Free Trial — Then $39.99/mo'}
                </Body>
              </LinearGradient>
            </Pressable>

            <Small dim style={styles.finePrint}>
              1-day free trial. $39.99/month after. Cancel anytime from Settings.
            </Small>
          </LinearGradient>
        </View>

        {/* Restore / back */}
        <View style={styles.footer}>
          <Pressable onPress={restore} hitSlop={12}>
            <Small style={{ color: palette.primary, fontWeight: '700', textAlign: 'center' }}>
              Restore purchase
            </Small>
          </Pressable>
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginTop: spacing.m }}>
            <Small dim style={{ textAlign: 'center' }}>Go back</Small>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xxxl,
    alignItems: 'center',
  },
  logoWrap: { marginBottom: spacing.l },
  logoRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.primaryTint,
    borderWidth: 1,
    borderColor: palette.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    textAlign: 'center',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -1,
  },
  bulletsWrap: {
    paddingHorizontal: spacing.l,
    paddingTop: spacing.xxl,
    gap: spacing.l,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.m,
  },
  bulletIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: palette.primaryTint,
    borderWidth: 1,
    borderColor: palette.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  proofWrap: {
    marginHorizontal: spacing.l,
    marginTop: spacing.xxl,
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: palette.bgElev1,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    borderLeftWidth: 3,
    borderLeftColor: palette.primary,
  },
  proof: {
    color: palette.textDim,
    fontStyle: 'italic',
    lineHeight: 20,
    textAlign: 'center',
  },
  cardWrap: { paddingHorizontal: spacing.l, marginTop: spacing.xxl },
  pricingCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.cardBorderStrong,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.s },
  errorWrap: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: radius.md,
    padding: spacing.m,
    marginBottom: spacing.m,
    width: '100%',
  },
  ctaBtn: { width: '100%', borderRadius: radius.md, overflow: 'hidden' },
  ctaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: spacing.l,
  },
  finePrint: {
    marginTop: spacing.m,
    textAlign: 'center',
    color: palette.textFaint,
  },
  footer: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.l,
    alignItems: 'center',
  },
});
