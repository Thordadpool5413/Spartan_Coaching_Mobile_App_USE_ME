import React, { useRef, type ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, Pressable, Animated, StyleProp, type TextProps } from 'react-native';
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

export function Card({ style, children, testID }: { style?: StyleProp<ViewStyle>; children: ReactNode; testID?: string }) {
  return (
    <View testID={testID} style={[styles.card, style]}>
      {children as any}
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
  style?: StyleProp<ViewStyle>;
  icon?: ReactNode;
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
          {icon as any}
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
  style?: StyleProp<ViewStyle>;
  icon?: ReactNode;
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
        {icon as any}
        <Text style={styles.ghostBtnText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Pill ─────────────────────────────────────────────────────────────────────

export function Pill({ label, color = palette.primary, testID, style }: { label: string; color?: string; testID?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View testID={testID} style={[styles.pill, { borderColor: color + '55', backgroundColor: color + '15' }, style]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

type TextPrimitiveProps = Omit<TextProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  dim?: boolean;
  numberOfLines?: number;
};

export function SectionLabel({ children, style, ...textProps }: Omit<TextPrimitiveProps, 'dim'>) {
  return (
    <View style={styles.sectionLabelRow}>
      <View style={styles.sectionLabelBar} />
      <Text {...textProps} style={[styles.sectionLabel, style]}>
        {String(children as any).toUpperCase()}
      </Text>
    </View>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: palette.divider }, style]} />;
}

// ─── Text primitives ──────────────────────────────────────────────────────────

export function H1({ children, style, ...textProps }: TextPrimitiveProps) {
  return (
    <Text {...textProps} style={[typography.h1, { color: palette.text }, style]}>
      {children as any}
    </Text>
  );
}
export function H2({ children, style, ...textProps }: TextPrimitiveProps) {
  return (
    <Text {...textProps} style={[typography.h2, { color: palette.text }, style]}>
      {children as any}
    </Text>
  );
}
export function H3({ children, style, ...textProps }: TextPrimitiveProps) {
  return (
    <Text {...textProps} style={[typography.h3, { color: palette.text }, style]}>
      {children as any}
    </Text>
  );
}
export function Body({ children, style, dim, numberOfLines, ...textProps }: TextPrimitiveProps) {
  return (
    <Text {...textProps} numberOfLines={numberOfLines} style={[typography.body, { color: dim ? palette.textDim : palette.text }, style]}>
      {children as any}
    </Text>
  );
}
export function Small({ children, style, dim, numberOfLines, ...textProps }: TextPrimitiveProps) {
  return (
    <Text {...textProps} numberOfLines={numberOfLines} style={[typography.small, { color: dim ? palette.textDim : palette.text }, style]}>
      {children as any}
    </Text>
  );
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

// ─── NativeListSection (iOS grouped list) ────────────────────────────────────

export type NativeListRowData = {
  key?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  right?: ReactNode;
  testID?: string;
};

export function NativeListSection({
  rows,
  style,
}: {
  rows: NativeListRowData[];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[listStyles.section, style]}>
      {rows.map((row, i) => (
        <NativeListRow key={row.key ?? row.title} row={row} isLast={i === rows.length - 1} />
      ))}
    </View>
  );
}

function NativeListRow({ row, isLast }: { row: NativeListRowData; isLast: boolean }) {
  const hasIcon = !!row.icon;
  const chevron = row.showChevron !== false && !!row.onPress;
  return (
    <Pressable
      testID={row.testID}
      onPress={row.onPress}
      onPressIn={() => {
        if (row.onPress) Haptics.selectionAsync();
      }}
      style={({ pressed }) => [
        listStyles.row,
        { backgroundColor: pressed && row.onPress ? palette.bgElev3 : palette.bgElev1 },
      ]}
    >
      {hasIcon ? (
        <View style={[listStyles.iconWrap, { backgroundColor: row.iconBg ?? palette.primaryTint }]}>
          <Ionicons name={row.icon!} size={18} color={row.iconColor ?? palette.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={listStyles.rowTitle}>{row.title}</Text>
        {row.subtitle ? <Text style={listStyles.rowSubtitle}>{row.subtitle}</Text> : null}
      </View>
      {row.right ? (row.right as any) : null}
      {chevron ? <Ionicons name="chevron-forward" size={17} color={palette.textMuted} /> : null}
      {!isLast ? (
        <View style={[listStyles.separator, { left: hasIcon ? 58 : spacing.l }]} pointerEvents="none" />
      ) : null}
    </Pressable>
  );
}

const listStyles = StyleSheet.create({
  section: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    borderTopColor: palette.glassEdgeTop,
    backgroundColor: palette.bgElev1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingVertical: 13,
    paddingHorizontal: spacing.l,
    minHeight: 56,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  rowSubtitle: {
    color: palette.textDim,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  separator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
  },
});

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
