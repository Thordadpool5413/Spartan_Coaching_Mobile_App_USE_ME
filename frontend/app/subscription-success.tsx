import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, spacing } from '../theme';
import { H1, H2, Body, Small, PrimaryButton } from '../components/UI';
import {
  activateSession,
  invalidateSubscriptionCache,
  fetchSubscriptionStatus,
} from '../lib/subscription';

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 15; // 30 seconds total

export default function SubscriptionSuccessScreen() {
  const router = useRouter();
  const { session_id: sessionId } = useLocalSearchParams<{ session_id?: string }>();

  const [activating, setActivating] = useState(true);
  const [activated, setActivated] = useState(false);
  const attemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function tryActivate() {
      // Step 1: If we have a session ID, call the fast-activate endpoint directly.
      if (sessionId) {
        try {
          await activateSession(sessionId);
          if (!cancelled) {
            invalidateSubscriptionCache();
            await fetchSubscriptionStatus();
            setActivated(true);
            setActivating(false);
          }
          return;
        } catch {
          // 202 = license not yet provisioned (team), 4xx = unexpected — fall through to polling
        }
      }

      // Step 2: Poll /subscription/status until stripe_status === 'active'
      invalidateSubscriptionCache();
      poll();
    }

    async function poll() {
      if (cancelled) return;
      attemptRef.current += 1;

      try {
        const status = await fetchSubscriptionStatus();
        if (status.stripeStatus === 'active' || status.tier === 'team') {
          if (!cancelled) {
            setActivated(true);
            setActivating(false);
          }
          return;
        }
      } catch {
        // network glitch — keep trying
      }

      if (attemptRef.current >= POLL_MAX_ATTEMPTS) {
        // Timed out — show success anyway; webhook will arrive eventually
        if (!cancelled) {
          setActivated(true);
          setActivating(false);
        }
        return;
      }

      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    }

    tryActivate();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sessionId]);

  const goHome = () => {
    router.replace('/(tabs)' as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={styles.container}>
        <LinearGradient colors={['#0a2010', palette.bg]} style={styles.hero}>
          <View style={[styles.iconWrap, activating && styles.iconWrapPending]}>
            {activating ? (
              <ActivityIndicator size="large" color="#10b981" />
            ) : (
              <Ionicons name="checkmark-circle" size={64} color="#10b981" />
            )}
          </View>

          {activating ? (
            <>
              <H1 style={styles.headline}>Confirming…</H1>
              <Body dim style={styles.body}>
                Activating your subscription. This only takes a moment.
              </Body>
            </>
          ) : (
            <>
              <H1 style={styles.headline}>You&apos;re in.</H1>
              <H2 style={styles.sub}>Welcome to Spartan Coaching Pro</H2>
              <Body dim style={styles.body}>
                All AI coaching tools are now unlocked. Ask, practice, plan — every day the reps
                around you don&apos;t.
              </Body>
            </>
          )}
        </LinearGradient>

        {!activating && (
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
        )}
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
  iconWrapPending: {
    backgroundColor: 'rgba(16,185,129,0.06)',
    borderColor: 'rgba(16,185,129,0.15)',
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
