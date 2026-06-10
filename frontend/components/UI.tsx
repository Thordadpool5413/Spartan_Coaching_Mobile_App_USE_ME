import React, { useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { palette, radius, shadow, spacing, typography } from '../theme';

// ─── Animated press scale helper ──────────────────────────────────────────────

function useSpringScale(toValue = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, { toValue, useNativeDriver: true, tension: 280, friction: 18 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 280, friction: 18 }).start();
  return { scale, pressIn, pressOut };
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({ style, children, testID }: { style?: ViewStyle; children: React.ReactNode; testID?: string }) {
  return (
    <View testID={testID} style={[styles.card, style]}>
      {children}
    </View>
  );
}

// ─── PrimaryButton ────────────────────────────────────────────────────────────

export function PrimaryButton({
  label,
  onPress,
  disabled,
  testID,
  style,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  style?: ViewStyle;
  icon?: React.ReactNode;
}) {
  const { scale, pressIn, pressOut } = useSpringScale(0.97);

  return (
    <Animated.View style={[styles.primaryShadow, { transform: [{ scale }], opacity: disabled ? 0.45 : 1 }, style]}>
      <Pressable
        testID={testID}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          if (!disabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            pressIn();
          }
        }}
        onPressOut={pressOut}
        style={{ borderRadius: radius.md, overflow: 'hidden' }}
      >
        <LinearGradient
          colors={[palette.primary, palette.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.primaryBtn}
        >
          {/* Inner top highlight */}
          <View style={[styles.btnHighlight, { pointerEvents: 'none' }]} />
          {icon}
          <Text style={styles.primaryBtnText}>{label}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// ─── GhostButton ─────────────────────────────────────────────────────────────

export function GhostButton({
  label,
  onPress,
  testID,
  style,
  icon,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
  style?: ViewStyle;
  icon?: React.ReactNode;
}) {
  const { scale, pressIn, pressOut } = useSpringScale(0.97);

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          pressIn();
        }}
        onPressOut={pressOut}
        style={styles.ghostBtn}
      >
        {/* Inner top highlight */}
        <View style={[styles.ghostHighlight, { pointerEvents: 'none' }]} />
        {icon}
        <Text style={styles.ghostBtnText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Pill ─────────────────────────────────────────────────────────────────────

export function Pill({ label, color = palette.primary, testID, style }: { label: string; color?: string; testID?: string; style?: ViewStyle }) {
  return (
    <View testID={testID} style={[styles.pill, { borderColor: color + '55', backgroundColor: color + '15' }, style]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

export function SectionLabel({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return (
    <View style={styles.sectionLabelRow}>
      <View style={styles.sectionLabelBar} />
      <Text style={[styles.sectionLabel, style]}>{String(children).toUpperCase()}</Text>
    </View>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: palette.divider }, style]} />;
}

// ─── Text primitives ──────────────────────────────────────────────────────────

export function H1({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[typography.h1, { color: palette.text }, style]}>{children}</Text>;
}
export function H2({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[typography.h2, { color: palette.text }, style]}>{children}</Text>;
}
export function H3({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[typography.h3, { color: palette.text }, style]}>{children}</Text>;
}
export function Body({ children, style, dim, numberOfLines }: { children: React.ReactNode; style?: TextStyle; dim?: boolean; numberOfLines?: number }) {
  return <Text numberOfLines={numberOfLines} style={[typography.body, { color: dim ? palette.textDim : palette.text }, style]}>{children}</Text>;
}
export function Small({ children, style, dim }: { children: React.ReactNode; style?: TextStyle; dim?: boolean }) {
  return <Text style={[typography.small, { color: dim ? palette.textDim : palette.text }, style]}>{children}</Text>;
}

// ─── PhiNotice ────────────────────────────────────────────────────────────────

export function PhiNotice({ style }: { style?: ViewStyle }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 }, style]}>
      <Ionicons name="shield-checkmark-outline" size={12} color={palette.textFaint} />
      <Text style={{ color: palette.textFaint, fontSize: 11, flex: 1, lineHeight: 15 }}>
        Do not enter patient names, IDs, or protected health information.
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderColor: palette.cardBorder,
    borderTopColor: palette.glassEdgeTop,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    ...shadow.md,
  },
  // Primary button
  primaryShadow: {
    borderRadius: radius.md,
    ...shadow.glowButton,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    gap: 8,
    minHeight: 52,
  },
  btnHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  // Ghost button
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderTopColor: palette.glassEdgeTop,
    borderColor: palette.cardBorderStrong,
    backgroundColor: palette.bgElev1,
    minHeight: 52,
    overflow: 'hidden',
  },
  ghostHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  ghostBtnText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  // Pill
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  // Section label
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.s,
  },
  sectionLabelBar: {
    width: 3,
    height: 13,
    borderRadius: 2,
    backgroundColor: palette.primary,
    opacity: 0.85,
  },
  sectionLabel: {
    fontSize: 11,
    color: palette.primary,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
});
