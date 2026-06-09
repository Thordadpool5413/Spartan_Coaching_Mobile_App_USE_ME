import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, spacing, radius } from '../theme';

export const ONBOARDING_KEY = 'onboarding_v1_complete';
const { width: SW } = Dimensions.get('window');

const SPARTAN_CIRCLE = require('../assets/images/spartan-circle-logo.png');
const ONBOARDING_AI = require('../assets/images/onboarding-ai.png');
const ONBOARDING_DISCIPLINE = require('../assets/images/onboarding-discipline.png');

const SLIDES = [
  {
    image: SPARTAN_CIRCLE,
    imageStyle: { width: 200, height: 200, borderRadius: 100 },
    bg: ['#1a0808', '#0a0a0b'] as const,
    title: 'Built for hospice\nsales professionals',
    body: 'Spartan Coaching closes the gap between clinical knowledge and sales execution — one prepared conversation at a time.',
  },
  {
    image: ONBOARDING_AI,
    imageStyle: { width: 220, height: 220, borderRadius: 20 },
    bg: ['#0d0c08', '#0a0a0b'] as const,
    title: 'AI tools, built\nfor the field',
    body: 'Ask a hospice expert, handle objections, generate visit playbooks, and practice role-play scenarios — all from your pocket.',
  },
  {
    image: ONBOARDING_DISCIPLINE,
    imageStyle: { width: 220, height: 220, borderRadius: 20 },
    bg: ['#1a0d0d', '#0a0a0b'] as const,
    title: 'Ten minutes a day\nbuilds the habit',
    body: 'Daily drills rotate through territory planning, objection handling, and clinical knowledge. Track your streak and stay sharp.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const goTo = (p: number) => {
    scrollRef.current?.scrollTo({ x: p * SW, animated: true });
    setPage(p);
  };

  const next = () => {
    if (page < SLIDES.length - 1) {
      goTo(page + 1);
    } else {
      finish();
    }
  };

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        scrollEventThrottle={16}
      >
        {SLIDES.map((s, i) => (
          <LinearGradient key={i} colors={s.bg} style={[styles.slide, { width: SW }]}>
            <Image
              source={s.image}
              style={[styles.slideImage, s.imageStyle]}
              resizeMode="contain"
            />
            <Text style={styles.slideNum}>{i + 1} / {SLIDES.length}</Text>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </LinearGradient>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <Pressable key={i} onPress={() => goTo(i)} hitSlop={8}>
            <View style={[styles.dot, i === page && styles.dotActive]} />
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={next}
          style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <LinearGradient
            colors={[palette.primary, palette.primaryDark]}
            style={styles.btnGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.btnText}>
              {page === SLIDES.length - 1 ? 'Get started' : 'Next'}
            </Text>
            <Ionicons
              name={page === SLIDES.length - 1 ? 'checkmark' : 'arrow-forward'}
              size={18}
              color="#fff"
            />
          </LinearGradient>
        </Pressable>

        {page < SLIDES.length - 1 && (
          <Pressable onPress={finish} hitSlop={12} style={{ alignItems: 'center' }}>
            <Text style={styles.skip}>Skip intro</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingBottom: 100,
  },
  slideImage: {
    marginBottom: spacing.xxxl,
  },
  slideNum: {
    color: palette.textFaint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.m,
  },
  title: {
    color: palette.text,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 43,
    textAlign: 'center',
    marginBottom: spacing.l,
  },
  body: {
    color: palette.textDim,
    fontSize: 17,
    lineHeight: 27,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: spacing.l,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.bgElev3,
  },
  dotActive: {
    backgroundColor: palette.primary,
    width: 28,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: spacing.xxxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.m,
  },
  btn: { borderRadius: radius.md, overflow: 'hidden' },
  btnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 17,
  },
  btnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  skip: {
    color: palette.textMuted,
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
});
