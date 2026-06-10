import React, { useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, spacing, radius } from '../theme';

export const ONBOARDING_KEY = 'onboarding_v1_complete';
const { width: SW } = Dimensions.get('window');

const SPARTAN_STAMP = require('../assets/images/spartan-stamp-logo.png');
const ONBOARDING_AI = require('../assets/images/onboarding-ai.png');
const ONBOARDING_DISCIPLINE = require('../assets/images/onboarding-discipline.png');

const SLIDES = [
  {
    image: SPARTAN_STAMP,
    imageStyle: { width: 300, height: 300 },
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

const DOT_INACTIVE = 8;
const DOT_ACTIVE = 28;

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  // Tracks raw scroll X — drives dot animations
  const scrollX = useRef(new Animated.Value(0)).current;

  // Drives button label / icon crossfade when page flips
  const btnFade = useRef(new Animated.Value(1)).current;
  const prevPage = useRef(0);

  useEffect(() => {
    if (prevPage.current === page) return;
    prevPage.current = page;
    Animated.sequence([
      Animated.timing(btnFade, { toValue: 0, duration: 110, useNativeDriver: true }),
      Animated.timing(btnFade, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [page, btnFade]);

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

  const isLast = page === SLIDES.length - 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const newPage = Math.round(e.nativeEvent.contentOffset.x / SW);
          setPage(newPage);
        }}
      >
        {SLIDES.map((s, i) => (
          <LinearGradient key={i} colors={s.bg} style={[styles.slide, { width: SW }]}>
            {i === 0 ? (
              <View style={styles.stampGlow}>
                <Image source={s.image} style={styles.stampImage} resizeMode="contain" />
              </View>
            ) : (
              <Image source={s.image} style={[styles.slideImage, s.imageStyle]} resizeMode="contain" />
            )}
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </LinearGradient>
        ))}
      </ScrollView>

      {/* Animated progress dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => {
          const dotWidth = scrollX.interpolate({
            inputRange: [(i - 1) * SW, i * SW, (i + 1) * SW],
            outputRange: [DOT_INACTIVE, DOT_ACTIVE, DOT_INACTIVE],
            extrapolate: 'clamp',
          });
          const dotColor = scrollX.interpolate({
            inputRange: [(i - 1) * SW, i * SW, (i + 1) * SW],
            outputRange: [palette.bgElev3, palette.primary, palette.bgElev3],
            extrapolate: 'clamp',
          });
          return (
            <Pressable key={i} onPress={() => goTo(i)} hitSlop={10}>
              <Animated.View
                style={[
                  styles.dot,
                  { width: dotWidth, backgroundColor: dotColor },
                ]}
              />
            </Pressable>
          );
        })}
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
            <Animated.View style={[styles.btnInner, { opacity: btnFade }]}>
              <Text style={styles.btnText}>
                {isLast ? 'Get started' : 'Next'}
              </Text>
              <Ionicons
                name={isLast ? 'checkmark' : 'arrow-forward'}
                size={18}
                color="#fff"
              />
            </Animated.View>
          </LinearGradient>
        </Pressable>

        {!isLast && (
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
  stampGlow: {
    marginBottom: spacing.xxxl,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 32,
    elevation: 0,
  },
  stampImage: {
    width: 300,
    height: 300,
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
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.l,
    marginTop: spacing.m,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: spacing.xxxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.m,
  },
  btn: { borderRadius: radius.md, overflow: 'hidden' },
  btnGrad: {
    paddingVertical: 17,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
