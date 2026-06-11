import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, radius, spacing } from '../../theme';
import { Card, H1, H2, H3, Body, Small, SectionLabel } from '../../components/UI';
import { getMethod, MethodContent } from '../../lib/api';

const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  compass: 'compass',
  users: 'people',
  target: 'locate',
  check: 'checkmark-circle',
  heart: 'heart',
  shield: 'shield-checkmark',
  eye: 'eye',
  database: 'server',
  'user-check': 'person-add',
  lock: 'lock-closed',
};

export default function MethodScreen() {
  const insets = useSafeAreaInsets();
  const [method, setMethod] = useState<MethodContent | null>(null);
  const [expandedPillar, setExpandedPillar] = useState<string | null>('discipline');

  useEffect(() => {
    getMethod().then(setMethod).catch(() => {});
  }, []);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 80, padding: spacing.l }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ marginBottom: spacing.xxl }}>
          <SectionLabel>The Framework</SectionLabel>
          <H1>
            The <Text style={{ color: palette.primary }}>Spartan Method</Text>
          </H1>
          <Body dim style={{ marginTop: spacing.m }}>
            A complete methodology for healthcare sales mastery. Value is discovered, translated, proven, and made official through four disciplined subjects, each governed by ethics that are non-negotiable.
          </Body>
        </View>

        {/* Mission */}
        <Card style={{ marginBottom: spacing.xl }}>
          <H3 style={{ marginBottom: spacing.s }}>The Spartan Mission</H3>
          <Body dim>
            Spartan Coaching was born in the field. We built teams, ran routes, and sat with clinicians. A pattern emerged: good people failed not because they cared too little, but because the system around them was noisy, complex, and rewarded the wrong activities. We fixed the system. We kept what worked and cut the rest.
          </Body>
        </Card>

        {/* Three Pillars */}
        <SectionLabel>Three Pillars</SectionLabel>
        <H2 style={{ marginBottom: spacing.l }}>The philosophical foundation</H2>
        {(method?.pillars || []).map((p) => (
          <Pressable
            key={p.id}
            testID={`pillar-${p.id}`}
            onPress={() => setExpandedPillar((cur) => (cur === p.id ? null : p.id))}
            style={{ marginBottom: spacing.m }}
          >
            <Card style={{ padding: spacing.l }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <H3 style={{ color: palette.primary }}>{p.title}</H3>
                <Ionicons
                  name={expandedPillar === p.id ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={palette.textMuted}
                />
              </View>
              {expandedPillar === p.id && (
                <Body dim style={{ marginTop: spacing.s }}>{p.description}</Body>
              )}
            </Card>
          </Pressable>
        ))}

        {/* Subjects */}
        <View style={{ marginTop: spacing.xxl }}>
          <SectionLabel>Healthcare Sales Mastery Model</SectionLabel>
          <H2 style={{ marginBottom: spacing.s }}>Four subjects, run in sequence</H2>
          <Body dim style={{ marginBottom: spacing.l }}>
            Each subject has a purpose, an execution standard, and a measurable output. Skipping steps is how you end up &quot;checking in&quot; for six months and calling it relationship building.
          </Body>

          {(method?.subjects || []).map((s, idx) => (
            <View key={s.id} style={{ marginBottom: spacing.m }}>
              <Card style={{ borderColor: s.color + '40', padding: spacing.l }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.m }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: s.color + '22',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={iconMap[s.icon] || 'flame'} size={22} color={s.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <H3 style={{ color: s.color }}>{s.title}</H3>
                    <Small dim>Subject {idx + 1} of 4</Small>
                  </View>
                </View>
                <View style={styles.subSection}>
                  <Small style={styles.subLabel}>Purpose</Small>
                  <Body dim>{s.purpose}</Body>
                </View>
                <View style={styles.subSection}>
                  <Small style={styles.subLabel}>Execution Standard</Small>
                  <Body dim>{s.executionStandard}</Body>
                </View>
                <View style={[styles.measurable, { backgroundColor: s.color + '15', borderColor: s.color + '40' }]}>
                  <Small style={[styles.subLabel, { color: s.color }]}>Measurable Output</Small>
                  <Body>{s.measurableOutput}</Body>
                </View>
              </Card>
              {idx < (method?.subjects.length || 0) - 1 && (
                <View style={{ alignItems: 'center', paddingVertical: spacing.s }}>
                  <Ionicons name="arrow-down" size={20} color={palette.textMuted} />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Five Fundamentals */}
        <View style={{ marginTop: spacing.xxl }}>
          <SectionLabel>Five Fundamentals</SectionLabel>
          <H2 style={{ marginBottom: spacing.l }}>That govern every subject</H2>
          {(method?.fundamentals || []).map((f, i) => (
            <Card key={i} style={{ marginBottom: spacing.m, padding: spacing.l }}>
              <View style={{ flexDirection: 'row', gap: spacing.m }}>
                <View style={styles.numberCircle}>
                  <Small style={{ color: palette.primary, fontWeight: '800' }}>{i + 1}</Small>
                </View>
                <View style={{ flex: 1 }}>
                  <H3 style={{ marginBottom: 4, fontSize: 16 }}>{f.title}</H3>
                  <Body dim>{f.description}</Body>
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* Ethics */}
        <View style={{ marginTop: spacing.xxl }}>
          <SectionLabel>Ethics</SectionLabel>
          <H2 style={{ marginBottom: spacing.l }}>Non-negotiable. Visible in every interaction.</H2>
          {(method?.ethics || []).map((e, i) => (
            <Card key={i} style={{ marginBottom: spacing.m, padding: spacing.l }}>
              <View style={{ flexDirection: 'row', gap: spacing.m, alignItems: 'center' }}>
                <LinearGradient
                  colors={[palette.primary, palette.primaryDark]}
                  style={styles.ethicIcon}
                >
                  <Ionicons name={iconMap[e.icon] || 'shield-checkmark'} size={18} color="#fff" />
                </LinearGradient>
                <Body style={{ flex: 1 }}>{e.title}</Body>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  subSection: { marginBottom: spacing.s },
  subLabel: { color: palette.text, fontWeight: '700', marginBottom: 2 },
  measurable: { marginTop: spacing.s, padding: spacing.m, borderRadius: radius.md, borderWidth: 1 },
  numberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.primary + '50',
  },
  ethicIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
