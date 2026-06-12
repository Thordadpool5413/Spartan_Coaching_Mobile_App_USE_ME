import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  Image,
  Text,
  Dimensions,
  StyleSheet,
} from 'react-native';

const { width, height } = Dimensions.get('window');
const PRIMARY = '#ef4444';
const NUM_PARTICLES = 22;

interface Particle {
  x: number;
  startY: number;
  size: number;
  delay: number;
  duration: number;
  opacity: Animated.Value;
  translateY: Animated.Value;
}

interface Props {
  onComplete: () => void;
}

export default function CinematicSplash({ onComplete }: Props) {
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale   = useRef(new Animated.Value(0.15)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale   = useRef(new Animated.Value(0.78)).current;
  const haloPulse   = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY       = useRef(new Animated.Value(16)).current;
  const screenAlpha = useRef(new Animated.Value(1)).current;

  const particles = useRef<Particle[]>(
    Array.from({ length: NUM_PARTICLES }, () => ({
      x: Math.random() * width,
      startY: height * 0.05 + Math.random() * height * 0.45,
      size: 1.5 + Math.random() * 2.5,
      delay: Math.random() * 2800,
      duration: 2400 + Math.random() * 2000,
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    particles.forEach((p) => {
      p.opacity.setValue(0);
      p.translateY.setValue(0);
      Animated.sequence([
        Animated.delay(p.delay),
        Animated.timing(p.opacity, { toValue: 0.85, duration: 400, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(p.translateY, {
            toValue: -(height * 0.7),
            duration: p.duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(p.duration - 600),
            Animated.timing(p.opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]),
        ]),
      ]).start();
    });

    Animated.sequence([
      // Phase 1 — Crimson glow blooms from darkness (0 → 1500ms)
      Animated.parallel([
        Animated.timing(glowOpacity, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowScale,   { toValue: 1, duration: 1500, useNativeDriver: true }),
      ]),
      // Phase 2 — Logo emerges with a halo pulse (1500 → 2600ms)
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(logoScale,   { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(haloPulse, { toValue: 1,    duration: 550, useNativeDriver: true }),
          Animated.timing(haloPulse, { toValue: 0.28, duration: 550, useNativeDriver: true }),
        ]),
      ]),
      // Hold (2600 → 3250ms)
      Animated.delay(650),
      // Phase 3 — Title drifts up (3250 → 3750ms)
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(textY,       { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      // Hold (3750 → 4200ms)
      Animated.delay(450),
      // Phase 4 — Fade to black (4200 → 4850ms)
      Animated.timing(screenAlpha, { toValue: 0, duration: 650, useNativeDriver: true }),
    ]).start(() => onComplete());
  }, []);

  return (
    <Animated.View style={[styles.root, { opacity: screenAlpha }]}>

      {/* Floating embers */}
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              left: p.x,
              bottom: p.startY,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              opacity: p.opacity,
              transform: [{ translateY: p.translateY }],
            },
          ]}
        />
      ))}

      {/* Radial crimson glow — stacked concentric circles */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.glowRoot,
          { opacity: glowOpacity, transform: [{ scale: glowScale }] },
        ]}
      >
        {([
          [720, 0.030],
          [520, 0.048],
          [360, 0.072],
          [220, 0.110],
          [110, 0.175],
          [50,  0.260],
        ] as [number, number][]).map(([d, a], i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: d,
              height: d,
              borderRadius: d / 2,
              backgroundColor: `rgba(239,68,68,${a})`,
            }}
          />
        ))}
      </Animated.View>

      {/* Logo + halo ring */}
      <Animated.View
        style={[
          styles.logoWrapper,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <Animated.View style={[styles.halo, { opacity: haloPulse }]} />
        <Animated.View style={[styles.haloOuter, {
          opacity: Animated.multiply(haloPulse, new Animated.Value(0.5)) as any,
        }]} />
        <Image
          source={require('../assets/spartan-splatter-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Text lockup */}
      <Animated.View
        style={[
          styles.textWrap,
          { opacity: textOpacity, transform: [{ translateY: textY }] },
        ]}
      >
        <Text style={styles.title} numberOfLines={1}>SPARTAN COACHING</Text>
        <View style={styles.rule} />
        <Text style={styles.subtitle} numberOfLines={1}>HOSPICE SALES EXCELLENCE</Text>
      </Animated.View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  particle: {
    position: 'absolute',
    backgroundColor: PRIMARY,
  },
  glowRoot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.55)',
    backgroundColor: 'rgba(239,68,68,0.07)',
  },
  haloOuter: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    borderWidth: 0.5,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  logo: {
    width: 230,
    height: 230,
  },
  textWrap: {
    position: 'absolute',
    bottom: height * 0.20,
    alignItems: 'center',
    width: width,
    paddingHorizontal: 32,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 7.5,
    textAlign: 'center',
  },
  rule: {
    width: 34,
    height: 1.5,
    backgroundColor: PRIMARY,
    marginVertical: 10,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.36)',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 4,
    textAlign: 'center',
  },
});
