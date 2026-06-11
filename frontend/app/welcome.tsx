import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palette, spacing, radius } from '../theme';
import { H1, H2, Body, Small, PrimaryButton } from '../components/UI';

const splatterLogo = require('../assets/spartan-splatter-logo.png');

export const TERMS_ACCEPTED_KEY = 'terms_accepted_v1';
export const ONBOARDING_KEY     = 'onboarding_v1_complete';

const TERMS_POINTS = [
  {
    icon: 'shield-checkmark' as const,
    title: 'Not medical or legal advice',
    body: 'AI responses are for sales coaching and training purposes only. Always verify clinical and regulatory guidance with qualified professionals.',
  },
  {
    icon: 'lock-closed' as const,
    title: 'Your data stays private',
    body: 'We do not sell or share your personal information. Usage data is used only to improve the coaching experience.',
  },
  {
    icon: 'document-text' as const,
    title: 'Full Terms & Privacy Policy',
    body: 'By continuing you agree to our Terms of Service and Privacy Policy available at spartanhospicecoaching.com.',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);

  const accept = async () => {
    if (accepting) return;
    setAccepting(true);
    await AsyncStorage.setItem(TERMS_ACCEPTED_KEY, 'true');
    const onboardingDone = await AsyncStorage.getItem(ONBOARDING_KEY);
    if (onboardingDone) {
      router.replace('/(tabs)' as any);
    } else {
      router.replace('/onboarding' as any);
    }
  };

  const viewLegal = () => {
    router.push('/legal' as any);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.logoSection}>
        <Image source={splatterLogo} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.content}>
        <H1 style={styles.headline}>Before you begin</H1>
        <H2 style={styles.sub}>A few things to know</H2>

        <View style={styles.points}>
          {TERMS_POINTS.map((p, i) => (
            <View key={i} style={styles.point}>
              <View style={styles.pointIcon}>
                <Ionicons name={p.icon} size={16} color={palette.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Body style={styles.pointTitle}>{p.title}</Body>
                <Body dim style={styles.pointBody}>{p.body}</Body>
              </View>
            </View>
          ))}
        </View>

        <Pressable onPress={viewLegal} style={styles.legalLink} hitSlop={8}>
          <Small style={{ color: palette.primary, fontWeight: '700' }}>View full Terms & Privacy Policy</Small>
          <Ionicons name="open-outline" size={13} color={palette.primary} />
        </Pressable>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label={accepting ? 'Continuing…' : 'I Understand — Let\'s Go'}
          onPress={accept}
          icon={<Ionicons name="arrow-forward" size={16} color="#fff" />}
        />
        <Small dim style={styles.fine}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Small>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  logoSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  logo: {
    width: '100%' as any,
    height: '100%' as any,
    transform: [{ rotate: '-2deg' }],
    opacity: 0.93,
  },
  content: {
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.s,
  },
  headline: {
    textAlign: 'center',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: spacing.xs,
  },
  sub: {
    textAlign: 'center',
    color: palette.textDim,
    fontWeight: '500',
    marginBottom: spacing.l,
  },
  points: {
    gap: spacing.m,
    marginBottom: spacing.m,
  },
  point: {
    flexDirection: 'row',
    gap: spacing.m,
    alignItems: 'flex-start',
  },
  pointIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  pointTitle: {
    fontWeight: '700',
    marginBottom: 2,
  },
  pointBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  legalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
    paddingVertical: spacing.s,
  },
  footer: {
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.m,
    gap: spacing.m,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.divider,
  },
  fine: {
    textAlign: 'center',
  },
});
