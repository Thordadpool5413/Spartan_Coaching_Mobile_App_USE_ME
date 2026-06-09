import React, { useState, useRef } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { palette, radius, spacing } from '../theme';
import { Small, Body, PhiNotice } from '../components/UI';
import { chatWithCoach, ChatHistoryItem } from '../lib/api';
import { markdownStyles } from '../components/markdownStyles';

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatHistoryItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const keyboardOffset = insets.top + 44;

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    const newHistory: ChatHistoryItem[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newHistory);
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const reply = await chatWithCoach(userMsg, messages);
      setMessages([...newHistory, { role: 'model', content: reply }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      setMessages([...newHistory, { role: 'model', content: '⚠️ Could not generate a response. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const newConversation = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={newConversation}
              disabled={messages.length === 0}
              style={{ opacity: messages.length === 0 ? 0.3 : 1, marginRight: 4 }}
              hitSlop={12}
            >
              <Ionicons name="create-outline" size={22} color={palette.text} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={keyboardOffset}
        >
          <ScrollView ref={scrollRef} contentContainerStyle={{ padding: spacing.l, paddingBottom: 20, gap: spacing.m }}>
            {messages.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: spacing.xxxl }}>
                <View style={styles.heroIcon}>
                  <Ionicons name="chatbubbles" size={28} color={palette.primary} />
                </View>
                <Text style={styles.heroTitle}>Hospice Sales Coach</Text>
                <Body dim style={{ textAlign: 'center', marginTop: 8, paddingHorizontal: 24 }}>
                  Ask anything: objections, eligibility, territory strategy, difficult conversations. Multi-turn, contextual coaching.
                </Body>
              </View>
            )}

            {messages.map((m, i) => (
              <View
                key={`${i}-${m.role}`}
                testID={`msg-${i}`}
                style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleModel]}
              >
                {m.role === 'user' ? (
                  <Text style={{ color: '#fff', fontSize: 15, lineHeight: 22 }}>{m.content}</Text>
                ) : (
                  <Markdown style={markdownStyles}>{m.content}</Markdown>
                )}
              </View>
            ))}

            {loading && (
              <View style={[styles.bubble, styles.bubbleModel, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                <ActivityIndicator color={palette.primary} size="small" />
                <Small dim>Coach is thinking…</Small>
              </View>
            )}
          </ScrollView>

          <PhiNotice style={styles.phiRow} />
          <View style={styles.composer}>
            <TextInput
              testID="chat-input"
              value={input}
              onChangeText={setInput}
              placeholder="Ask the coach…"
              placeholderTextColor={palette.textFaint}
              style={styles.input}
              multiline
            />
            <Pressable
              testID="chat-send"
              onPress={send}
              disabled={!input.trim() || loading}
              style={({ pressed }) => [
                styles.sendBtn,
                { opacity: !input.trim() || loading ? 0.4 : pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: palette.primaryTint,
    borderWidth: 1,
    borderColor: palette.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: palette.text, fontSize: 20, fontWeight: '800', marginTop: 16 },
  bubble: {
    maxWidth: '88%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: palette.primary,
    borderBottomRightRadius: 4,
  },
  bubbleModel: {
    alignSelf: 'flex-start',
    backgroundColor: palette.bgElev2,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    borderBottomLeftRadius: 4,
  },
  phiRow: {
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
    paddingBottom: 2,
    borderTopWidth: 1,
    borderColor: palette.divider,
    backgroundColor: palette.bgElev1,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.m,
    paddingTop: 6,
    gap: 8,
    backgroundColor: palette.bgElev1,
  },
  input: {
    flex: 1,
    backgroundColor: palette.bgElev2,
    borderColor: palette.cardBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: palette.text,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
