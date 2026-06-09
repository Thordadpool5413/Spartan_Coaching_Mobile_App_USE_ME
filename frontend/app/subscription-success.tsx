import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, spacing, radius } from '../theme';
import { H1, H2, Body, Small, PrimaryButton } from '../components/UI';
import { invalidateSubscriptionCache, fetchSubscriptionStatus } from '../lib/subscription';

export default function SubscriptionSuccessScreen() {
  const router = useRouter();

  useEffect(() => {
    invalidateSubscriptionCache();
    fetchSubscriptionStatus();
  }, []);

  const goHome = () => {
    router.replace('/(tabs)' as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={styles.container}>
        <LinearGradient colors={['#0a2010', palette.bg]} style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-circle" size={64} color="#10b981" />
          </View>
          <H1 style={[styles.headline]}>You&apos;re in.</H1>
          <H2 style={[styles.sub]}>Welcome to Spartan Coaching Pro</H2>
          <Body dim style={styles.body}>
            All AI coaching tools are now unlocked. Ask, practice, plan — every day the reps around you don&apos;t.
          </Body>
        </LinearGradient>

        <View style={styles.cta}>
          <PrimaryButton
            label="Start Coaching"
            onPress={goHome}
            icon={<Ionicons name="arrow-forward" size={16} color="#fff" />}
          />
          <Small dim style={styles.fine}>
            Manage your subscription anytime in Settings → Subscription.
          </Small>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingBottom: spacing.xxl,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  headline: {
    textAlign: 'center',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1.5,
    color: palette.text,
    marginBottom: spacing.s,
  },
  sub: {
    textAlign: 'center',
    color: palette.textDim,
    fontWeight: '700',
    marginBottom: spacing.l,
  },
  body: {
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  cta: {
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.xxxl,
    gap: spacing.m,
  },
  fine: {
    textAlign: 'center',
  },
});
