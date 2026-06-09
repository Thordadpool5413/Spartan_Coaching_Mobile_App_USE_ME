import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, spacing } from '../theme';
import { Card, PrimaryButton, H2, H3, Body, Small, SectionLabel } from '../components/UI';
import { getTodayDrill, getDrillStats, completeDrill, DrillToday, DrillStats } from '../lib/api';
import { getDeviceId } from '../lib/device';

const CELL = 13;
const GAP = 3;
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function DrillHeatmap({
  heatmap,
  todayKey,
}: {
  heatmap: { date: string; done: boolean }[];
  todayKey: string | undefined;
}) {
  if (!heatmap.length) return null;

  const sorted = [...heatmap].sort((a, b) => a.date.localeCompare(b.date));
  const firstDow = new Date(sorted[0].date + 'T12:00:00').getDay();

  const padded: ({ date: string; done: boolean } | null)[] = [
    ...Array(firstDow).fill(null),
    ...sorted,
  ];
  while (padded.length % 7 !== 0) padded.push(null);

  const weeks: ({ date: string; done: boolean } | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  const getMonthLabel = (week: typeof weeks[0], wi: number): string => {
    const firstReal = week.find((d) => d !== null);
    if (!firstReal) return '';
    if (wi === 0) {
      return new Date(firstReal.date + 'T12:00:00').toLocaleString('default', { month: 'short' });
    }
    const prevReal = weeks[wi - 1]?.find((d) => d !== null);
    if (!prevReal || firstReal.date.slice(5, 7) !== prevReal.date.slice(5, 7)) {
      return new Date(firstReal.date + 'T12:00:00').toLocaleString('default', { month: 'short' });
    }
    return '';
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        {/* Month labels row */}
        <View style={{ flexDirection: 'row', marginLeft: 20, marginBottom: 4, height: 13 }}>
          {weeks.map((week, wi) => {
            const label = getMonthLabel(week, wi);
            return (
              <View key={wi} style={{ width: CELL + GAP }}>
                {label ? <Text style={styles.monthLabel}>{label}</Text> : null}
              </View>
            );
          })}
        </View>

        {/* Day-of-week labels + cell columns */}
        <View style={{ flexDirection: 'row', gap: GAP }}>
          <View style={{ gap: GAP }}>
            {DAY_LABELS.map((d, i) => (
              <View key={i} style={{ width: 14, height: CELL, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={styles.dayLabel}>{i % 2 === 1 ? d : ''}</Text>
              </View>
            ))}
          </View>
          {weeks.map((week, wi) => (
            <View key={wi} style={{ gap: GAP }}>
              {Array.from({ length: 7 }).map((_, di) => {
                const cell = week[di];
                const isToday = cell?.date === todayKey;
                return (
                  <View
                    key={di}
                    style={[
                      styles.cell,
                      !cell && { backgroundColor: 'transparent' },
                      cell && !cell.done && { backgroundColor: palette.bgElev3 },
                      cell?.done && { backgroundColor: palette.primary },
                      isToday && { borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)' },
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.monthLabel}>90 days</Text>
          <View style={{ flex: 1 }} />
          <View style={[styles.legendCell, { backgroundColor: palette.bgElev3 }]} />
          <Text style={styles.monthLabel}>None</Text>
          <View style={[styles.legendCell, { backgroundColor: palette.primary }]} />
          <Text style={styles.monthLabel}>Done</Text>
        </View>
      </View>
    </ScrollView>
  );
}

export default function DrillsScreen() {
  const [drill, setDrill] = useState<DrillToday | null>(null);
  const [stats, setStats] = useState<DrillStats | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const refresh = async () => {
    setRefreshing(true);
    try { await load(); } catch {}
    setRefreshing(false);
  };

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
      <ScrollView
        contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.primary} />}
      >
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
        {stats?.heatmap && stats.heatmap.length > 0 && (
          <View style={{ marginTop: spacing.xl }}>
            <SectionLabel>Activity · Last 90 Days</SectionLabel>
            <Card style={{ paddingVertical: spacing.l }}>
              <DrillHeatmap heatmap={stats.heatmap} todayKey={todayKey} />
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
  cell: { width: CELL, height: CELL, borderRadius: 3 },
  monthLabel: { color: palette.textFaint, fontSize: 9, fontWeight: '600', letterSpacing: 0.3 },
  dayLabel: { color: palette.textFaint, fontSize: 9, fontWeight: '600' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.s, marginLeft: 20 },
  legendCell: { width: 10, height: 10, borderRadius: 2 },
});
