import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, spacing } from '../theme';
import { Card, PrimaryButton, GhostButton, H1, H3, Body, Small, SectionLabel } from '../components/UI';
import { getCheckoutStatus } from '../lib/api';

type Phase = 'checking' | 'paid' | 'unpaid' | 'expired' | 'error';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ session_id?: string }>();
  const sessionId =
    typeof params.session_id === 'string' ? params.session_id : Array.isArray(params.session_id) ? params.session_id[0] : '';

  const [phase, setPhase] = useState<Phase>('checking');
  const [info, setInfo] = useState<{ amount?: number; currency?: string } | null>(null);
  const attemptsRef = useRef(0);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      setPhase('error');
      return;
    }
    const MAX_ATTEMPTS = 15;
    const INTERVAL_MS = 2000;

    const poll = async () => {
      if (stoppedRef.current) return;
      attemptsRef.current += 1;
      try {
        const data = await getCheckoutStatus(sessionId);
        setInfo({ amount: data.amount_total, currency: data.currency });
        if (data.payment_status === 'paid') {
          setPhase('paid');
          return;
        }
        if (data.status === 'expired') {
          setPhase('expired');
          return;
        }
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setPhase('unpaid');
          return;
        }
        setTimeout(poll, INTERVAL_MS);
      } catch {
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setPhase('error');
          return;
        }
        setTimeout(poll, INTERVAL_MS);
      }
    };
    poll();
    return () => {
      stoppedRef.current = true;
    };
  }, [sessionId]);

  const amountFmt = info?.amount != null ? `$${(info.amount / 100).toFixed(2)} ${info.currency?.toUpperCase() || ''}` : '';

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        <SectionLabel>Booking Status</SectionLabel>
        <H1 style={{ marginBottom: spacing.l }}>
          {phase === 'paid'
            ? 'You are booked.'
            : phase === 'checking'
            ? 'Confirming payment…'
            : phase === 'expired'
            ? 'Session expired'
            : phase === 'unpaid'
            ? 'Payment not yet confirmed'
            : 'Something went wrong'}
        </H1>

        {phase === 'checking' && (
          <Card>
            <View style={{ alignItems: 'center', padding: spacing.l }}>
              <ActivityIndicator color={palette.primary} size="large" />
              <Body dim style={{ marginTop: spacing.m, textAlign: 'center' }}>
                Verifying with Stripe… this only takes a few seconds.
              </Body>
            </View>
          </Card>
        )}

        {phase === 'paid' && (
          <Card testID="payment-success-card">
            <View style={{ alignItems: 'center' }}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={36} color="#22c55e" />
              </View>
              <H3 style={{ marginTop: spacing.l, textAlign: 'center' }}>Payment received — {amountFmt}</H3>
              <Body dim style={{ marginTop: spacing.s, textAlign: 'center' }}>
                Nick has been notified and will email you within one business day to lock in your session time. A Stripe receipt was sent to your email.
              </Body>
            </View>
            <View style={{ marginTop: spacing.l, gap: spacing.s }}>
              <View style={styles.row}>
                <Ionicons name="mail" size={16} color={palette.primary} />
                <Body style={{ flex: 1, fontSize: 14 }}>Watch for an email from nick@spartanhospicecoaching.com</Body>
              </View>
              <View style={styles.row}>
                <Ionicons name="clipboard" size={16} color={palette.primary} />
                <Body style={{ flex: 1, fontSize: 14 }}>
                  While you wait, jot down the exact challenge you want to break through.
                </Body>
              </View>
              <View style={styles.row}>
                <Ionicons name="flame" size={16} color={palette.primary} />
                <Body style={{ flex: 1, fontSize: 14 }}>
                  Sharpen up: try the Objection Handler or run a Role-Play scenario before your session.
                </Body>
              </View>
            </View>
            <View style={{ marginTop: spacing.l, gap: spacing.s }}>
              <PrimaryButton
                testID="success-goto-roleplay"
                label="Warm up with a Role-Play"
                onPress={() => router.replace('/roleplay')}
                icon={<Ionicons name="people" size={14} color="#fff" />}
              />
              <GhostButton testID="success-goto-home" label="Back to Home" onPress={() => router.replace('/(tabs)')} />
            </View>
          </Card>
        )}

        {phase === 'unpaid' && (
          <Card>
            <Body dim>
              We have not confirmed your payment yet. If you completed checkout, your status will update shortly. Otherwise, head back and try again.
            </Body>
            <View style={{ marginTop: spacing.m }}>
              <PrimaryButton label="Back to Services" onPress={() => router.replace('/services')} />
            </View>
          </Card>
        )}

        {phase === 'expired' && (
          <Card>
            <Body dim>This checkout session expired before payment was completed. No charge was made.</Body>
            <View style={{ marginTop: spacing.m }}>
              <PrimaryButton label="Try again" onPress={() => router.replace('/services')} />
            </View>
          </Card>
        )}

        {phase === 'error' && (
          <Card>
            <Body dim>
              We could not verify your session. If you were charged, please email nick@spartanhospicecoaching.com and we will sort it out immediately.
            </Body>
            <View style={{ marginTop: spacing.m }}>
              <PrimaryButton label="Back to Services" onPress={() => router.replace('/services')} />
            </View>
          </Card>
        )}

        <Small dim style={{ textAlign: 'center', marginTop: spacing.xxl }}>
          Session: {sessionId ? `${sessionId.slice(0, 14)}…` : '(unknown)'}
        </Small>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  successCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.s,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
});
