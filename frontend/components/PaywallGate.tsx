import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, spacing, radius } from '../theme';
import { Body, Small, H3 } from './UI';
import { PrimaryButton } from './UI';
import { useSubscription } from '../lib/subscription';

type Props = {
  children: React.ReactNode;
  feature?: string;
};

export default function PaywallGate({ children, feature }: Props) {
  const { isActive, loading } = useSubscription();
  const router = useRouter();

  if (loading || isActive) {
    return <>{children}</>;
  }

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['rgba(239,68,68,0.08)', 'transparent']}
        style={styles.banner}
      >
        <View style={styles.lockIcon}>
          <Ionicons name="lock-closed" size={28} color={palette.primary} />
        </View>
        <H3 style={{ textAlign: 'center', marginBottom: spacing.s }}>
          Your free trial has ended
        </H3>
        <Body dim style={{ textAlign: 'center', marginBottom: spacing.l, lineHeight: 22 }}>
          {feature
            ? `Subscribe to unlock ${feature} and all other AI coaching tools.`
            : 'Subscribe to unlock all AI coaching tools and keep your edge sharp.'}
        </Body>
        <PrimaryButton
          label="Unlock AI Features — $39.99/mo"
          onPress={() => router.push('/paywall' as any)}
          icon={<Ionicons name="sparkles" size={14} color="#fff" />}
        />
        <View style={{ marginTop: spacing.m, alignItems: 'center' }}>
          <Small dim>1-day free trial included. Cancel anytime.</Small>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.l,
    backgroundColor: palette.bg,
  },
  banner: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.primary + '30',
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.primaryTint,
    borderWidth: 1,
    borderColor: palette.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.l,
  },
});
