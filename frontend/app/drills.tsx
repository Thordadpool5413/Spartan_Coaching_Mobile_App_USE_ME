import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, spacing } from '../theme';
import { Card, PrimaryButton, H2, H3, Body, Small, SectionLabel } from '../components/UI';
import { getTodayDrill, getDrillStats, completeDrill, DrillToday, DrillStats } from '../lib/api';
import { getDeviceId } from '../lib/device';

export default function DrillsScreen() {
  const [drill, setDrill] = useState<DrillToday | null>(null);
  const [stats, setStats] = useState<DrillStats | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  const load = useCallback(async () => {
    const did = await getDeviceId();
    setDeviceId(did);
    const [d, s] = await Promise.all([getTodayDrill(), getDrillStats(did)]);
    setDrill(d);
    setStats(s);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const todayKey = drill?.dateKey;
  const doneToday = !!todayKey && (stats?.heatmap.find((h) => h.date === todayKey)?.done ?? false);

  const markDone = async () => {
    if (!drill || !deviceId || doneToday) return;
    setCompleting(true);
    try {
      const s = await completeDrill(deviceId, drill.index, drill.dateKey);
      setStats(s);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }}>
        <SectionLabel>Daily Practice</SectionLabel>
        <H2 style={{ marginBottom: spacing.s }}>Coaching Drills</H2>
        <Body dim style={{ marginBottom: spacing.l }}>
          Ten minutes a day. Repetitions build the skill. Today&apos;s drill rotates through prospecting, objection handling, clinical knowledge, planning, and more.
        </Body>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={styles.statIconWrap}>
              <Ionicons name="flame" size={18} color={palette.primary} />
            </View>
            <Small dim>Streak</Small>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <H2 style={{ color: palette.primary }}>{stats?.streak ?? 0}</H2>
              <Small dim>days</Small>
            </View>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
            </View>
            <Small dim>Completed</Small>
            <H2>{stats?.totalCompleted ?? 0}</H2>
          </View>
        </View>

        {/* Today's drill */}
        <Card style={{ marginTop: spacing.l }}>
          {loading ? (
            <ActivityIndicator color={palette.primary} />
          ) : drill ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.s }}>
                <Small style={{ color: palette.primary, fontWeight: '800', letterSpacing: 0.5 }}>
                  {drill.category.toUpperCase()}
                </Small>
                <View style={{ flex: 1, height: 1, backgroundColor: palette.divider }} />
                <Small dim>{drill.dateKey}</Small>
              </View>
              <H3 style={{ marginBottom: spacing.l, fontSize: 18, lineHeight: 26 }}>{drill.drill}</H3>
              {doneToday ? (
                <View style={styles.doneBox}>
                  <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                  <Small style={{ color: '#22c55e', fontWeight: '700' }}>Done today. See you tomorrow.</Small>
                </View>
              ) : (
                <PrimaryButton
                  testID="drill-mark-done"
                  label={completing ? 'Saving…' : 'Mark complete'}
                  onPress={markDone}
                  disabled={completing}
                  icon={completing ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark" size={14} color="#fff" />}
                />
              )}
            </>
          ) : (
            <Body dim>No drill loaded.</Body>
          )}
        </Card>

        {/* Heatmap */}
        {stats?.heatmap && (
          <View style={{ marginTop: spacing.xl }}>
            <SectionLabel>Last 90 Days</SectionLabel>
            <Card>
              <View style={styles.heatmap}>
                {stats.heatmap.map((d, i) => (
                  <View
                    key={i}
                    style={[
                      styles.heatCell,
                      d.done && { backgroundColor: palette.primary },
                      d.date === todayKey && { borderWidth: 1, borderColor: '#fff' },
                    ]}
                  />
                ))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.s }}>
                <Small dim>90 days ago</Small>
                <Small dim>Today</Small>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: spacing.m },
  statBox: {
    flex: 1, padding: spacing.l, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.cardBorder,
    backgroundColor: palette.bgElev1, gap: 4,
  },
  statIconWrap: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: palette.primaryTint,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  doneBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.md,
    backgroundColor: 'rgba(34, 197, 94, 0.10)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  heatmap: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  heatCell: {
    width: 14, height: 14, borderRadius: 3, backgroundColor: palette.bgElev3,
  },
});
