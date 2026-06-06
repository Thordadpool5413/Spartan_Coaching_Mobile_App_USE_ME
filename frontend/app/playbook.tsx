import React, { useState } from 'react';
import { ScrollView, View, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { palette, radius, spacing } from '../theme';
import { Card, PrimaryButton, GhostButton, H2, Body, Small, SectionLabel, Pill } from '../components/UI';
import { getPlaybook } from '../lib/api';
import { markdownStyles } from '../components/markdownStyles';

const SOURCES = ['SNF', 'Hospital', 'Home Health', 'Assisted Living', 'Physician Office', 'Community'];

export default function PlaybookScreen() {
  const [scenario, setScenario] = useState('');
  const [source, setSource] = useState<string>('');
  const [goal, setGoal] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!scenario.trim()) return;
    setLoading(true);
    setAnswer('');
    try {
      const a = await getPlaybook(scenario, source || undefined, goal || undefined);
      setAnswer(a);
    } catch (e) {
      setAnswer('⚠️ Could not generate playbook. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 100 }}>
        <SectionLabel>AI Tool</SectionLabel>
        <H2 style={{ marginBottom: spacing.s }}>Sales Playbook Generator</H2>
        <Body dim style={{ marginBottom: spacing.l }}>
          Walk in prepared, not improvising. Build a full pre-visit playbook custom to your referral source and scenario.
        </Body>

        <Small style={styles.lbl}>Scenario</Small>
        <TextInput
          testID="playbook-scenario"
          value={scenario}
          onChangeText={setScenario}
          placeholder="e.g., First visit with a SNF DON who has had bad hospice experiences."
          placeholderTextColor={palette.textFaint}
          style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
          multiline
        />

        <Small style={[styles.lbl, { marginTop: spacing.m }]}>Referral Source Type</Small>
        <View style={styles.sourceRow}>
          {SOURCES.map((s) => (
            <Pill
              key={s}
              label={s}
              color={s === source ? palette.primary : palette.textMuted}
              testID={`playbook-source-${s}`}
              style={{ borderColor: s === source ? palette.primary : palette.cardBorder, marginBottom: 6 }}
            />
          ))}
        </View>
        <View style={styles.sourceRowSelect}>
          {SOURCES.map((s) => (
            <Small
              key={s}
              testID={`playbook-source-pick-${s}`}
              onPress={() => setSource((cur) => (cur === s ? '' : s))}
              style={[styles.sourceChip, source === s && styles.sourceChipActive]}
            >
              {s}
            </Small>
          ))}
        </View>

        <Small style={[styles.lbl, { marginTop: spacing.m }]}>Goal for this visit (optional)</Small>
        <TextInput
          testID="playbook-goal"
          value={goal}
          onChangeText={setGoal}
          placeholder="e.g., Get a recurring monthly education slot."
          placeholderTextColor={palette.textFaint}
          style={styles.input}
        />

        <PrimaryButton
          testID="playbook-submit"
          label={loading ? 'Building playbook…' : 'Build playbook'}
          onPress={submit}
          disabled={loading || !scenario.trim()}
          style={{ marginTop: spacing.l }}
          icon={loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="bulb" size={16} color="#fff" />}
        />

        {answer && !loading && (
          <Card testID="playbook-answer" style={{ marginTop: spacing.l }}>
            <Markdown style={markdownStyles}>{answer}</Markdown>
            <GhostButton label="Build another playbook" onPress={() => { setAnswer(''); setScenario(''); setGoal(''); setSource(''); }} style={{ marginTop: spacing.m }} />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  lbl: { color: palette.text, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: palette.bgElev2,
    borderColor: palette.cardBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.text,
    fontSize: 15,
  },
  sourceRow: { display: 'none' },
  sourceRowSelect: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sourceChip: {
    color: palette.text,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: palette.bgElev2,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    fontSize: 12,
    fontWeight: '700',
  },
  sourceChipActive: { borderColor: palette.primary, backgroundColor: palette.primaryTint, color: palette.primary },
});
