import React, { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, spacing } from '../theme';
import { Card, H1, H3, Body, Small, SectionLabel } from '../components/UI';
import { getPodcasts, Podcast } from '../lib/api';

export default function PodcastsScreen() {
  const [items, setItems] = useState<Podcast[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    getPodcasts().then((d) => setItems(d.podcasts)).catch((e) => setErr(e?.message || 'Failed to load'));
  }, []);
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }}>
        <SectionLabel>Spartan Podcast</SectionLabel>
        <H1 style={{ marginBottom: spacing.s }}>Episodes for hospice reps and leaders</H1>
        <Body dim style={{ marginBottom: spacing.l }}>
          Practical episodes on territory, follow-up, objections, and the conversations that actually move referrals. New episodes drop monthly.
        </Body>
        {!items && !err && <ActivityIndicator color={palette.primary} />}
        {err && <Body dim>{err}</Body>}
        {items?.map((p) => (
          <Card key={p.id} testID={`podcast-${p.id}`} style={{ marginBottom: spacing.m }}>
            <View style={{ flexDirection: 'row', gap: spacing.m, marginBottom: spacing.s }}>
              <View style={styles.epBadge}>
                <Small style={{ color: '#fff', fontWeight: '800' }}>EP {p.episodeNumber}</Small>
              </View>
              <View style={{ flex: 1 }}>
                <H3>{p.title}</H3>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Ionicons name="time-outline" size={12} color={palette.textMuted} />
                  <Small dim>{p.duration}</Small>
                </View>
              </View>
            </View>
            <Body dim style={{ fontSize: 14 }}>{p.description}</Body>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.m }}>
              <Ionicons name="mic" size={14} color={palette.primary} />
              <Small style={{ color: palette.primary, fontWeight: '700' }}>Audio coming soon — bookmark this list</Small>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  epBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
