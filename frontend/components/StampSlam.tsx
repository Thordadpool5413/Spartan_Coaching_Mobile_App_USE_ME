import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, ImageSourcePropType, Platform, View, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

type StampSlamProps = {
  source: ImageSourcePropType;
  width: number;
  height: number;
  style?: ViewStyle;
  /** Only play once per app launch (memory) AND optionally once per day (storage). */
  onceKey?: string;
  /** ms between mount and slam impact. */
  delay?: number;
};

/**
 * Animates a logo "slamming" onto the screen like a rubber stamp.
 * Combines scale-overshoot, slight rotation, opacity, and a subtle splatter pulse.
 * Triggers a heavy haptic on iOS at the moment of impact.
 *
 * Falls back to a static logo render on web (where Animated is fine but haptics aren't useful).
 */
export function StampSlam({ source, width, height, style, onceKey, delay = 0 }: StampSlamProps) {
  const scale = useRef(new Animated.Value(2.2)).current;
  const rotate = useRef(new Animated.Value(-12)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const splatterOpacity = useRef(new Animated.Value(0)).current;
  const splatterScale = useRef(new Animated.Value(0.6)).current;

  const [shouldRender, setShouldRender] = useState(false);
  const [skipAnim, setSkipAnim] = useState(false);

  // Memory de-dup so re-mounts within the same session don't re-trigger.
  const sessionPlayedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let shouldPlay = true;
      if (onceKey) {
        try {
          const last = await AsyncStorage.getItem(`stamp_slam_${onceKey}`);
          const today = new Date().toISOString().slice(0, 10);
          if (last === today) shouldPlay = false;
        } catch {
          // ignore
        }
      }
      if (cancelled) return;
      setSkipAnim(!shouldPlay);
      setShouldRender(true);
      if (!shouldPlay) {
        scale.setValue(1);
        rotate.setValue(0);
        opacity.setValue(1);
        return;
      }
      // Animate
      setTimeout(() => {
        if (cancelled) return;
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.sequence([
            Animated.timing(scale, { toValue: 0.92, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.spring(scale, { toValue: 1, friction: 4, tension: 140, useNativeDriver: USE_NATIVE_DRIVER }),
          ]),
          Animated.timing(rotate, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }),
        ]).start();

        // Impact haptic + splatter pulse at the slam moment
        setTimeout(() => {
          if (cancelled) return;
          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
          } else if (Platform.OS === 'android') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          }
          Animated.sequence([
            Animated.timing(splatterOpacity, { toValue: 0.4, duration: 80, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.parallel([
              Animated.timing(splatterScale, { toValue: 1.6, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }),
              Animated.timing(splatterOpacity, { toValue: 0, duration: 400, useNativeDriver: USE_NATIVE_DRIVER }),
            ]),
          ]).start();
        }, 260);

        // Persist that we played today
        if (onceKey && !sessionPlayedRef.current) {
          sessionPlayedRef.current = true;
          AsyncStorage.setItem(`stamp_slam_${onceKey}`, new Date().toISOString().slice(0, 10)).catch(() => {});
        }
      }, delay);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!shouldRender) {
    // Reserve the space so the layout doesn't jump
    return <View style={[{ width, height }, style]} />;
  }

  const rotateInterp = rotate.interpolate({
    inputRange: [-20, 0, 20],
    outputRange: ['-20deg', '0deg', '20deg'],
  });

  return (
    <View style={[{ width, height, justifyContent: 'center', alignItems: 'center' }, style]}>
      {/* Splatter pulse behind the stamp */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.splatter,
          {
            width: width * 1.3,
            height: height * 1.3,
            opacity: splatterOpacity,
            transform: [{ scale: splatterScale }],
          },
        ]}
      />
      <Animated.Image
        source={source}
        resizeMode="contain"
        style={{
          width,
          height,
          opacity,
          transform: skipAnim ? [] : [{ scale }, { rotate: rotateInterp }],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  splatter: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: 'rgba(239, 68, 68, 0.35)',
  },
});
