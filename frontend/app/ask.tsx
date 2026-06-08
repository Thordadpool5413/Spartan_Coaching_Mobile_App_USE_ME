import React, { useState } from 'react';
import { ScrollView, View, TextInput, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { palette, radius, spacing } from '../theme';
import { Card, PrimaryButton, GhostButton, H2, Body, Small, SectionLabel } from '../components/UI';
import { askSpartan } from '../lib/api';
import { markdownStyles } from '../components/markdownStyles';

const SUGGESTIONS = [
  'What are hospice eligibility criteria for heart failure?',
  'How do I handle the "not ready" objection?',
  'What is the Medicare hospice benefit?',
  'Best strategies for building physician referrals?',
];

export default function AskScreen() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (q: string) => {
    if (!q.trim() || loading) return;
    setLoading(true);
    setError(null);
    setAnswer('');
    try {
      const a = await askSpartan(q);
      setAnswer(a);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not generate an answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }}>
        <SectionLabel>AI · Field-Ready</SectionLabel>
        <H2 style={{ marginBottom: spacing.s }}>Ask a Hospice Expert</H2>
        <Body dim style={{ marginBottom: spacing.l }}>
          Get instant expert answers on hospice topics: sales strategies, clinical eligibility, regulations, territory planning, and more.
        </Body>

        <View style={styles.inputWrap}>
          <Ionicons name="sparkles" size={18} color={palette.primary} style={{ marginLeft: 4 }} />
          <TextInput
            testID="ask-input"
            value={query}
            onChangeText={setQuery}
            placeholder="Ask any hospice question..."
            placeholderTextColor={palette.textFaint}
            style={styles.input}
            multiline
            onSubmitEditing={() => submit(query)}
          />
        </View>
        <PrimaryButton
          testID="ask-submit"
          label={loading ? 'Finding the best answer…' : 'Ask'}
          onPress={() => submit(query)}
          disabled={loading || !query.trim()}
          style={{ marginBottom: spacing.l }}
          icon={loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="arrow-up" size={14} color="#fff" />}
        />

        {!answer && !loading && (
          <View style={styles.chipWrap}>
            {SUGGESTIONS.map((s, i) => (
              <Pressable
                key={i}
                testID={`ask-suggestion-${i}`}
                onPress={() => { setQuery(s); submit(s); }}
                style={({ pressed }) => [styles.chip, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Small style={{ color: palette.text }}>{s}</Small>
              </Pressable>
            ))}
          </View>
        )}

        {loading && (
          <Card style={{ alignItems: 'center', padding: spacing.xl }}>
            <ActivityIndicator color={palette.primary} />
            <Small dim style={{ marginTop: spacing.s }}>Drafting your answer…</Small>
          </Card>
        )}

        {error && (
          <Card style={{ borderColor: palette.primary + '60' }}>
            <Body style={{ color: palette.primary }}>{error}</Body>
          </Card>
        )}

        {answer && !loading && (
          <Card testID="ask-answer">
            <Markdown style={markdownStyles}>{answer}</Markdown>
            <View style={{ marginTop: spacing.l, paddingTop: spacing.m, borderTopWidth: 1, borderColor: palette.divider }}>
              <GhostButton label="Ask another question" onPress={() => { setAnswer(''); setQuery(''); }} />
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.bgElev2,
    borderColor: palette.cardBorderStrong,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: spacing.m,
    gap: 8,
  },
  input: {
    flex: 1,
    color: palette.text,
    fontSize: 15,
    paddingVertical: 10,
    maxHeight: 120,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.l },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: palette.bgElev2,
    borderWidth: 1,
    borderColor: palette.cardBorder,
  },
});
