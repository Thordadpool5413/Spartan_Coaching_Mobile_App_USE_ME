import React, { useEffect, useState } from 'react';
import { ScrollView, View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, spacing } from '../theme';
import { Card, H2, H3, Body, Small, SectionLabel } from '../components/UI';
import { getRoleplayScenarios, Scenario } from '../lib/api';

export default function RoleplayIndex() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRoleplayScenarios()
      .then((s) => setScenarios(s))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }}>
        <SectionLabel>AI Practice</SectionLabel>
        <H2 style={{ marginBottom: spacing.s }}>Role-Play Practice</H2>
        <Body dim style={{ marginBottom: spacing.l }}>
          Practice the hard conversation before it is real. The AI stays in character. When you end the session, get specific coaching feedback based on the Spartan Method.
        </Body>

        {loading && (
          <View style={{ alignItems: 'center', padding: spacing.xl }}>
            <ActivityIndicator color={palette.primary} />
          </View>
        )}

        {scenarios.map((s, i) => (
          <Pressable
            key={s.id}
            testID={`roleplay-pick-${s.id}`}
            onPress={() => router.push({ pathname: '/roleplay-session', params: { id: s.id, title: s.title } })}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginBottom: spacing.m }]}
          >
            <Card>
              <View style={{ flexDirection: 'row', gap: spacing.m, alignItems: 'flex-start' }}>
                <View style={styles.numWrap}>
                  <Small style={{ color: palette.primary, fontWeight: '900' }}>{String(i + 1).padStart(2, '0')}</Small>
                </View>
                <View style={{ flex: 1 }}>
                  <H3 style={{ marginBottom: 4 }}>{s.title}</H3>
                  <Small dim>{s.description}</Small>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
              </View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  numWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: palette.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.primary + '40',
  },
});
