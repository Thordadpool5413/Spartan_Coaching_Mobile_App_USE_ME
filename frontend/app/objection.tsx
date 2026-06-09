import React, { useState } from 'react';
import { ScrollView, View, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { palette, radius, spacing } from '../theme';
import { Card, PrimaryButton, GhostButton, H2, Body, Small, SectionLabel, PhiNotice } from '../components/UI';
import { getObjectionResponse } from '../lib/api';
import { markdownStyles } from '../components/markdownStyles';
import PaywallGate from '../components/PaywallGate';

const PRESETS = [
  'We already have a hospice provider.',
  'The patient is not ready for hospice yet.',
  'My patient does not want to give up hope.',
  "We don't think the family will accept it.",
  'Insurance probably won\'t cover this.',
];

export default function ObjectionScreen() {
  const [objection, setObjection] = useState('');
  const [context, setContext] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!objection.trim()) return;
    setLoading(true);
    setAnswer('');
    try {
      const a = await getObjectionResponse(objection, context || undefined);
      setAnswer(a);
    } catch (e) {
      setAnswer('⚠️ Could not generate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PaywallGate feature="Objection Handler">
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <SectionLabel>AI Tool</SectionLabel>
        <H2 style={{ marginBottom: spacing.s }}>Objection Handler</H2>
        <Body dim style={{ marginBottom: spacing.l }}>
          Paste the objection you heard. Get three patient-centered responses: clinical, empathetic, and practical. With coaching notes on why each works.
        </Body>

        <Small style={{ color: palette.text, fontWeight: '700', marginBottom: 6 }}>Objection</Small>
        <TextInput
          testID="objection-input"
          value={objection}
          onChangeText={setObjection}
          placeholder="e.g., We already have a hospice provider."
          placeholderTextColor={palette.textFaint}
          style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
          multiline
        />

        <View style={styles.presetWrap}>
          {PRESETS.map((p, i) => (
            <Small
              key={i}
              testID={`objection-preset-${i}`}
              onPress={() => setObjection(p)}
              style={styles.preset}
            >
              {p}
            </Small>
          ))}
        </View>

        <Small style={{ color: palette.text, fontWeight: '700', marginBottom: 6, marginTop: spacing.m }}>
          Context (optional)
        </Small>
        <TextInput
          testID="objection-context"
          value={context}
          onChangeText={setContext}
          placeholder="e.g., Said by a SNF discharge planner during a quick lobby visit."
          placeholderTextColor={palette.textFaint}
          style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
          multiline
        />

        <PhiNotice />
        <PrimaryButton
          testID="objection-submit"
          label={loading ? 'Coaching…' : 'Get responses'}
          onPress={submit}
          disabled={loading || !objection.trim()}
          style={{ marginTop: spacing.l }}
          icon={loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="shield-checkmark" size={16} color="#fff" />}
        />

        {answer && !loading && (
          <Card testID="objection-answer" style={{ marginTop: spacing.l }}>
            <Markdown style={markdownStyles}>{answer}</Markdown>
            <GhostButton label="Try another objection" onPress={() => { setAnswer(''); setObjection(''); setContext(''); }} style={{ marginTop: spacing.m }} />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
    </PaywallGate>
  );
}

const styles = StyleSheet.create({
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
  presetWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.s },
  preset: {
    color: palette.text,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.bgElev2,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    fontSize: 12,
  },
});
