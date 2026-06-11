import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, ActivityIndicator, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { palette, radius, spacing } from '../theme';
import { Card, PrimaryButton, GhostButton, H2, H3, Body, Small, SectionLabel, PhiNotice } from '../components/UI';
import { roleplayTurn, roleplayFeedback, ChatHistoryItem } from '../lib/api';
import { markdownStyles } from '../components/markdownStyles';
import { clearRoleplayDraft, loadRoleplayDraft, recordActivity, saveRoleplayDraft } from '../lib/local-state';

export default function RoleplaySession() {
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const router = useRouter();
  const scenarioId = typeof id === 'string' ? id : '';
  const scenarioTitle = typeof title === 'string' ? title : 'Role-play Practice';
  const [messages, setMessages] = useState<ChatHistoryItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ feedback: string; rating: number } | null>(null);
  const [endingSession, setEndingSession] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!scenarioId) {
        hydratedRef.current = true;
        return;
      }
      const draft = await loadRoleplayDraft(scenarioId);
      if (!active || !draft) {
        hydratedRef.current = true;
        return;
      }
      setMessages(draft.messages || []);
      setInput(draft.input || '');
      hydratedRef.current = true;
    })();

    return () => {
      active = false;
    };
  }, [scenarioId]);

  useEffect(() => {
    if (!hydratedRef.current || feedback || !scenarioId) return;
    if (!messages.length && !input.trim()) {
      clearRoleplayDraft(scenarioId).catch(() => {});
      return;
    }
    saveRoleplayDraft(scenarioId, { input, messages, title: scenarioTitle }).catch(() => {});
  }, [feedback, input, messages, scenarioId, scenarioTitle]);

  const send = async () => {
    if (!input.trim() || loading || feedback) return;
    const userMsg = input.trim();
    setInput('');
    const newHistory: ChatHistoryItem[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newHistory);
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const reply = await roleplayTurn(scenarioId, userMsg, messages);
      setMessages([...newHistory, { role: 'model', content: reply }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setMessages([...newHistory, { role: 'model', content: '⚠️ Could not respond. Try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    if (messages.length < 2 || !scenarioId) return;
    setEndingSession(true);
    try {
      const fb = await roleplayFeedback(scenarioId, messages);
      setFeedback(fb);
      recordActivity({
        kind: 'roleplay',
        title: `Role-play scored ${fb.rating}/10`,
        detail: scenarioTitle,
        route: '/roleplay',
      }).catch(() => {});
      clearRoleplayDraft(scenarioId).catch(() => {});
    } catch (e) {
      setFeedback({ feedback: '⚠️ Could not generate feedback. Please try again.', rating: 5 });
    } finally {
      setEndingSession(false);
    }
  };

  if (feedback) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
        <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <SectionLabel>Session Complete</SectionLabel>
          <H2 style={{ marginBottom: spacing.s }}>{scenarioTitle}</H2>

          <Card style={{ alignItems: 'center', padding: spacing.xl, marginBottom: spacing.l }}>
            <View style={[styles.ratingCircle, { borderColor: ratingColor(feedback.rating) }]}>
              <Text style={[styles.ratingNum, { color: ratingColor(feedback.rating) }]}>{feedback.rating}</Text>
              <Small dim>out of 10</Small>
            </View>
            <Small dim style={{ marginTop: spacing.m, textAlign: 'center' }}>{ratingLabel(feedback.rating)}</Small>
          </Card>

          <Card>
            <Markdown style={markdownStyles}>{feedback.feedback}</Markdown>
          </Card>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.l }}>
            <View style={{ flex: 1 }}>
              <GhostButton label="Back to scenarios" onPress={() => router.back()} />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label="Run again"
                onPress={() => {
                  setMessages([]);
                  setInput('');
                  setFeedback(null);
                  if (scenarioId) {
                    clearRoleplayDraft(scenarioId).catch(() => {});
                  }
                }}
                icon={<Ionicons name="refresh" size={14} color="#fff" />}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={90}>
          <View style={styles.header}>
            <View style={styles.statusDot} />
            <View style={{ flex: 1 }}>
            <Small style={{ color: palette.primary, fontWeight: '700' }}>In Practice</Small>
            <Small dim>{scenarioTitle}</Small>
          </View>
          <Pressable
            testID="roleplay-end"
            onPress={endSession}
            disabled={messages.length < 2 || endingSession}
            style={({ pressed }) => [
              styles.endBtn,
              { opacity: messages.length < 2 || endingSession ? 0.4 : pressed ? 0.7 : 1 },
            ]}
          >
            {endingSession ? <ActivityIndicator size="small" color={palette.text} /> : <Small style={{ color: palette.text, fontWeight: '700' }}>End & Score</Small>}
          </Pressable>
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: spacing.l, paddingBottom: 20, gap: spacing.m }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {messages.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xxxl }}>
              <View style={styles.heroIcon}><Ionicons name="people" size={28} color={palette.primary} /></View>
              <H3 style={{ marginTop: 16, textAlign: 'center' }}>You go first.</H3>
              <Body dim style={{ textAlign: 'center', marginTop: 8, paddingHorizontal: 24 }}>
                Greet them. Open the conversation as you would in real life. The AI prospect will respond in character. End the session anytime for coaching feedback.
              </Body>
            </View>
          )}
          {messages.map((m, i) => (
            <View key={i} testID={`rp-msg-${i}`} style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleModel]}>
              <Text style={[m.role === 'user' ? { color: '#fff' } : { color: palette.text }, { fontSize: 15, lineHeight: 22 }]}>{m.content}</Text>
            </View>
          ))}
          {loading && (
            <View style={[styles.bubble, styles.bubbleModel, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
              <ActivityIndicator color={palette.primary} size="small" />
              <Small dim>Typing…</Small>
            </View>
          )}
        </ScrollView>

        <PhiNotice style={styles.phiRow} />
        <View style={styles.composer}>
          <TextInput
            testID="rp-input"
            value={input}
            onChangeText={setInput}
            placeholder="Type your response…"
            placeholderTextColor={palette.textFaint}
            style={styles.input}
            multiline
          />
          <Pressable
            testID="rp-send"
            onPress={send}
            disabled={!input.trim() || loading}
            style={({ pressed }) => [styles.sendBtn, { opacity: !input.trim() || loading ? 0.4 : pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ratingColor(n: number) {
  if (n >= 8) return '#22c55e';
  if (n >= 6) return '#eab308';
  if (n >= 4) return '#f97316';
  return palette.primary;
}
function ratingLabel(n: number) {
  if (n >= 8) return 'Strong performance';
  if (n >= 6) return 'Good with room to grow';
  if (n >= 4) return 'Foundational work needed';
  return 'Practice this scenario again';
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
    borderColor: palette.divider,
    backgroundColor: palette.bgElev1,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e' },
  endBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.cardBorderStrong,
    backgroundColor: palette.bgElev2,
  },
  heroIcon: {
    width: 64, height: 64, borderRadius: 16, backgroundColor: palette.primaryTint, borderWidth: 1,
    borderColor: palette.primary + '40', alignItems: 'center', justifyContent: 'center',
  },
  bubble: { maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: palette.primary, borderBottomRightRadius: 4 },
  bubbleModel: { alignSelf: 'flex-start', backgroundColor: palette.bgElev2, borderWidth: 1, borderColor: palette.cardBorder, borderBottomLeftRadius: 4 },
  phiRow: {
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
    paddingBottom: 2,
    borderTopWidth: 1,
    borderColor: palette.divider,
    backgroundColor: palette.bgElev1,
  },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: spacing.m, paddingBottom: spacing.m, paddingTop: 6, gap: 8,
    backgroundColor: palette.bgElev1,
  },
  input: {
    flex: 1, backgroundColor: palette.bgElev2, borderColor: palette.cardBorder, borderWidth: 1,
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, color: palette.text, fontSize: 15, maxHeight: 100,
  },
  sendBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  ratingCircle: {
    width: 100, height: 100, borderRadius: 50, borderWidth: 4, alignItems: 'center', justifyContent: 'center',
  },
  ratingNum: { fontSize: 36, fontWeight: '900' },
});
