import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, spacing } from '../theme';
import { Card, PrimaryButton, GhostButton, H1, H3, Body, Small, SectionLabel } from '../components/UI';
import { getResources, Resource } from '../lib/api';

const CATEGORY_META: Record<Resource['category'], { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  script: { label: 'Scripts', icon: 'document-text', color: '#3b82f6' },
  template: { label: 'Templates', icon: 'copy', color: '#a855f7' },
  checklist: { label: 'Checklists', icon: 'list', color: '#22c55e' },
  guide: { label: 'Guides', icon: 'book', color: '#f97316' },
};

export default function ResourcesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Resource[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Resource['category'] | 'all'>('all');
  const [selected, setSelected] = useState<Resource | null>(null);

  useEffect(() => {
    getResources().then((d) => setItems(d.resources)).catch((e) => setErr(e?.message || 'Failed to load'));
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    return filter === 'all' ? items : items.filter((r) => r.category === filter);
  }, [items, filter]);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }}>
        <SectionLabel>Resource Library</SectionLabel>
        <H1 style={{ marginBottom: spacing.s }}>Field-ready scripts, templates, checklists</H1>
        <Body dim style={{ marginBottom: spacing.l }}>
          Free downloadable resources for hospice sales reps and leaders. Each item is a practical, fill-in-the-blanks document you can use in your next visit.
        </Body>

        <View style={styles.filterRow}>
          <FilterPill active={filter === 'all'} label="All" onPress={() => setFilter('all')} testID="res-filter-all" />
          {(Object.keys(CATEGORY_META) as Resource['category'][]).map((cat) => (
            <FilterPill
              key={cat}
              active={filter === cat}
              label={CATEGORY_META[cat].label}
              onPress={() => setFilter(cat)}
              testID={`res-filter-${cat}`}
            />
          ))}
        </View>

        {!items && !err && <ActivityIndicator color={palette.primary} />}
        {err && <Body dim>{err}</Body>}

        {filtered.map((r) => {
          const meta = CATEGORY_META[r.category];
          return (
            <Pressable
              key={r.id}
              testID={`resource-${r.id}`}
              onPress={() => setSelected(r)}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginBottom: spacing.m })}
            >
              <Card>
                <View style={{ flexDirection: 'row', gap: spacing.m }}>
                  <View style={[styles.icon, { backgroundColor: `${meta.color}22`, borderColor: meta.color }]}>
                    <Ionicons name={meta.icon} size={22} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Small style={{ color: meta.color, fontWeight: '800', letterSpacing: 0.6, fontSize: 10 }}>
                      {meta.label.toUpperCase()}
                    </Small>
                    <H3 style={{ marginTop: 2 }}>{r.title}</H3>
                    <Body dim style={{ fontSize: 14, marginTop: spacing.s }}>{r.description}</Body>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.m, marginBottom: spacing.m }}>
              <View style={[styles.icon, { backgroundColor: palette.primaryTint, borderColor: palette.primary }]}>
                <Ionicons name="document-text" size={20} color={palette.primary} />
              </View>
              <H3 style={{ flex: 1 }}>{selected?.title}</H3>
              <Pressable testID="resource-modal-close" onPress={() => setSelected(null)} hitSlop={8}>
                <Ionicons name="close" size={22} color={palette.textMuted} />
              </Pressable>
            </View>
            <Body dim style={{ marginBottom: spacing.l, fontSize: 14 }}>
              PDF downloads are being added to the iOS app. In the meantime, contact Nick and we will send this resource by email.
            </Body>
            <PrimaryButton
              testID="resource-modal-contact"
              label="Email Nick for this resource"
              onPress={() => {
                const title = selected?.title || 'Resource';
                setSelected(null);
                router.push({
                  pathname: '/(tabs)/more',
                  params: {
                    interest: `Resource Request: ${title}`,
                    message: `Please send me the "${title}" resource as a PDF.`,
                  },
                } as any);
              }}
              icon={<Ionicons name="mail" size={14} color="#fff" />}
            />
            <View style={{ height: spacing.s }} />
            <GhostButton testID="resource-modal-cancel" label="Got it, close" onPress={() => setSelected(null)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FilterPill({ active, label, onPress, testID }: { active: boolean; label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, active && styles.pillActive, { opacity: pressed ? 0.85 : 1 }]}
    >
      <Small style={{ color: active ? '#fff' : palette.text, fontWeight: '700' }}>{label}</Small>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s, marginBottom: spacing.l },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.cardBorderStrong,
    backgroundColor: palette.bgElev2,
  },
  pillActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.l,
  },
  modal: {
    backgroundColor: palette.bgElev1,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    padding: spacing.l,
  },
});
