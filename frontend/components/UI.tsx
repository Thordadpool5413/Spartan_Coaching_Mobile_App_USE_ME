import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, radius, shadow, spacing, typography } from '../theme';

export function Card({ style, children, testID }: { style?: ViewStyle; children: React.ReactNode; testID?: string }) {
  return (
    <View testID={testID} style={[styles.card, style]}>
      {children}
    </View>
  );
}

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
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [{ opacity: disabled ? 0.45 : pressed ? 0.85 : 1 }, style]}
    >
      <LinearGradient
        colors={[palette.primary, palette.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryBtn}
      >
        {icon}
        <Text style={styles.primaryBtnText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

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
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.ghostBtn, { opacity: pressed ? 0.7 : 1 }, style]}>
      {icon}
      <Text style={styles.ghostBtnText}>{label}</Text>
    </Pressable>
  );
}

export function Pill({ label, color = palette.primary, testID, style }: { label: string; color?: string; testID?: string; style?: ViewStyle }) {
  return (
    <View testID={testID} style={[styles.pill, { borderColor: color + '55', backgroundColor: color + '15' }, style]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{String(children).toUpperCase()}</Text>;
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[{ height: 1, backgroundColor: palette.divider }, style]} />;
}

export function H1({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[typography.h1, { color: palette.text }, style]}>{children}</Text>;
}
export function H2({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[typography.h2, { color: palette.text }, style]}>{children}</Text>;
}
export function H3({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[typography.h3, { color: palette.text }, style]}>{children}</Text>;
}
export function Body({ children, style, dim }: { children: React.ReactNode; style?: TextStyle; dim?: boolean }) {
  return <Text style={[typography.body, { color: dim ? palette.textDim : palette.text }, style]}>{children}</Text>;
}
export function Small({ children, style, dim }: { children: React.ReactNode; style?: TextStyle; dim?: boolean }) {
  return <Text style={[typography.small, { color: dim ? palette.textDim : palette.text }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderColor: palette.cardBorder,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    ...shadow.sm,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.cardBorderStrong,
    backgroundColor: palette.bgElev1,
  },
  ghostBtnText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
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
  sectionLabel: {
    fontSize: 11,
    color: palette.primary,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: spacing.s,
  },
});
