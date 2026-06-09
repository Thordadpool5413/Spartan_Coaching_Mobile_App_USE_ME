import React, { useEffect, useState, useMemo } from 'react';
import { ScrollView, View, TextInput, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, spacing } from '../theme';
import { Card, H2, H3, Body, Small, SectionLabel } from '../components/UI';
import { getKnowledge, KbEntry } from '../lib/api';

export default function KnowledgeScreen() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('All');
  const [data, setData] = useState<{ entries: KbEntry[]; categories: string[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getKnowledge(q || undefined, category === 'All' ? undefined : category)
      .then(setData)
      .finally(() => setLoading(false));
  }, [q, category]);

  const cats = useMemo(() => ['All', ...(data?.categories || [])], [data]);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView stickyHeaderIndices={[0]} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <SectionLabel>Reference</SectionLabel>
          <H2 style={{ marginBottom: spacing.s }}>Knowledge Base</H2>
          <Body dim style={{ marginBottom: spacing.m }}>
            40+ entries covering hospice terminology, regulations, eligibility, clinical concepts, sales, and compliance.
          </Body>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={palette.textMuted} />
            <TextInput
              testID="kb-search"
              value={q}
              onChangeText={setQ}
              placeholder="Search terms or definitions…"
              placeholderTextColor={palette.textFaint}
              style={styles.searchInput}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.s }} contentContainerStyle={{ gap: 6 }}>
            {cats.map((c) => (
              <Pressable
                key={c}
                testID={`kb-cat-${c}`}
                onPress={() => setCategory(c)}
                style={({ pressed }) => [
                  styles.catChip,
                  c === category && styles.catChipActive,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Small style={[{ color: palette.text, fontWeight: '700' }, c === category && { color: palette.primary }]}>{c}</Small>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={{ paddingHorizontal: spacing.l }}>
          {loading && (
            <View style={{ alignItems: 'center', padding: spacing.xl }}>
              <ActivityIndicator color={palette.primary} />
            </View>
          )}
          {(data?.entries || []).map((e) => {
            const isExpanded = expanded === e.term;
            return (
              <Pressable
                key={e.term}
                testID={`kb-entry-${e.term}`}
                onPress={() => setExpanded((cur) => (cur === e.term ? null : e.term))}
                style={{ marginBottom: spacing.m }}
              >
                <Card style={{ padding: spacing.l }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Small style={{ color: palette.primary, fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 }}>
                        {e.category.toUpperCase()}
                      </Small>
                      <H3 style={{ fontSize: 17 }}>{e.term}</H3>
                    </View>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={palette.textMuted} />
                  </View>
                  {isExpanded && (
                    <Body dim style={{ marginTop: spacing.s }}>{e.definition}</Body>
                  )}
                </Card>
              </Pressable>
            );
          })}
          {!loading && data?.entries.length === 0 && (
            <Card>
              <Body dim style={{ textAlign: 'center' }}>No entries match your search.</Body>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.l, backgroundColor: palette.bg },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, backgroundColor: palette.bgElev2,
    borderWidth: 1, borderColor: palette.cardBorder, borderRadius: radius.md,
  },
  searchInput: { flex: 1, paddingVertical: 12, color: palette.text, fontSize: 15 },
  catChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.bgElev2,
  },
  catChipActive: { borderColor: palette.primary, backgroundColor: palette.primaryTint },
});
