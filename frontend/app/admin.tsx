import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, radius, spacing } from '../theme';
import { Card, PrimaryButton, GhostButton, H1, H2, H3, Body, Small, SectionLabel } from '../components/UI';
import { adminOverview, adminContacts, adminEligibility, AdminOverview } from '../lib/api';

const TOKEN_KEY = 'spartan_admin_token';

type Tab = 'overview' | 'contacts' | 'eligibility';

export default function AdminScreen() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [elig, setElig] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(TOKEN_KEY);
      if (saved) {
        setToken(saved);
        await loadAll(saved);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async (t: string) => {
    setLoading(true);
    setError(null);
    try {
      const [ov, c, e] = await Promise.all([adminOverview(t), adminContacts(t), adminEligibility(t)]);
      setOverview(ov);
      setContacts(c.items || []);
      setElig(e.items || []);
      setAuthed(true);
      await AsyncStorage.setItem(TOKEN_KEY, t);
    } catch (err: any) {
      setError(err?.response?.status === 401 || err?.response?.status === 403
        ? 'Invalid admin token.'
        : 'Could not load admin data.');
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setAuthed(false);
    setToken('');
    setOverview(null);
    setContacts([]);
    setElig([]);
  };

  if (!authed) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
        <ScrollView contentContainerStyle={{ padding: spacing.l, paddingTop: spacing.xxl }}>
          <View style={styles.lockWrap}>
            <Ionicons name="lock-closed" size={36} color={palette.primary} />
          </View>
          <H2 style={{ marginTop: spacing.l, textAlign: 'center' }}>Admin access</H2>
          <Body dim style={{ textAlign: 'center', marginTop: spacing.s, marginBottom: spacing.xl }}>
            Enter the admin token to view contacts, eligibility checks, and usage analytics.
          </Body>
          <Card>
            <Small style={{ color: palette.text, fontWeight: '700', marginBottom: 6 }}>Admin token</Small>
            <TextInput
              testID="admin-token"
              value={token}
              onChangeText={setToken}
              placeholder="Enter token"
              placeholderTextColor={palette.textFaint}
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            {error ? <Small style={{ color: palette.primary, marginTop: spacing.s }}>{error}</Small> : null}
            <PrimaryButton
              testID="admin-login"
              label={loading ? 'Verifying…' : 'Sign in'}
              onPress={() => loadAll(token)}
              disabled={loading || !token.trim()}
              style={{ marginTop: spacing.l }}
              icon={loading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="key" size={14} color="#fff" />}
            />
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={styles.tabBar}>
        {(['overview', 'contacts', 'eligibility'] as const).map((t) => (
          <Pressable
            key={t}
            testID={`admin-tab-${t}`}
            onPress={() => setTab(t)}
            style={({ pressed }) => [
              styles.tabBtn,
              tab === t && styles.tabBtnActive,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[styles.tabText, tab === t && { color: palette.primary }]}>{t.toUpperCase()}</Text>
          </Pressable>
        ))}
        <Pressable testID="admin-logout" onPress={logout} style={styles.tabIconBtn}>
          <Ionicons name="log-out-outline" size={18} color={palette.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }}>
        {tab === 'overview' && overview ? <OverviewView overview={overview} /> : null}
        {tab === 'contacts' ? <ContactsView items={contacts} /> : null}
        {tab === 'eligibility' ? <EligibilityListView items={elig} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function OverviewView({ overview }: { overview: AdminOverview }) {
  return (
    <>
      <SectionLabel>Last 30 days</SectionLabel>
      <H2 style={{ marginBottom: spacing.l }}>Spartan Coaching Admin</H2>

      <View style={styles.statsRow}>
        <StatCard icon="mail" label="Contacts" value={overview.contacts.last_30_days} sub={`${overview.contacts.total} all-time`} color={palette.primary} />
        <StatCard icon="medical" label="Elig. Checks" value={overview.eligibility_checks.last_7_days} sub="last 7d" color="#16a34a" />
      </View>
      <View style={styles.statsRow}>
        <StatCard icon="flame" label="Drills Done" value={overview.drills.total_completions} sub={`${overview.drills.unique_users} users`} color="#f59e0b" />
        <StatCard icon="chatbubbles" label="Coach Chats" value={overview.ai_chat.last_7_days} sub={`${overview.ai_chat.total} all-time`} color="#3b82f6" />
      </View>

      {/* Verdict breakdown */}
      <Card style={{ marginTop: spacing.l }}>
        <H3 style={{ marginBottom: spacing.m }}>Eligibility verdicts (30d)</H3>
        {Object.entries(overview.eligibility_checks.verdict_breakdown_30d).length === 0 ? (
          <Body dim>No eligibility checks yet.</Body>
        ) : (
          Object.entries(overview.eligibility_checks.verdict_breakdown_30d).map(([k, v]) => (
            <View key={k} style={styles.barRow}>
              <Small style={{ color: palette.text, fontWeight: '700', width: 80 }}>{k}</Small>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.min(100, (v / Math.max(1, overview.eligibility_checks.last_7_days)) * 100)}%`, backgroundColor: verdictBarColor(k) }]} />
              </View>
              <Small style={{ color: palette.text, fontWeight: '800', width: 30, textAlign: 'right' }}>{v}</Small>
            </View>
          ))
        )}
      </Card>

      <Card style={{ marginTop: spacing.l }}>
        <H3 style={{ marginBottom: spacing.m }}>Top diagnoses (30d)</H3>
        {overview.eligibility_checks.top_diagnoses_30d.length === 0 ? (
          <Body dim>No data yet.</Body>
        ) : (
          overview.eligibility_checks.top_diagnoses_30d.map((d) => (
            <View key={d.diagnosis} style={styles.diagRow}>
              <Body style={{ flex: 1 }} numberOfLines={1}>{d.diagnosis}</Body>
              <Small style={{ color: palette.primary, fontWeight: '800' }}>{d.count}</Small>
            </View>
          ))
        )}
      </Card>

      <Small dim style={{ marginTop: spacing.l, textAlign: 'center' }}>
        Last updated: {new Date(overview.generated_at).toLocaleString()}
      </Small>
    </>
  );
}

function ContactsView({ items }: { items: any[] }) {
  if (items.length === 0) return <Body dim>No contact submissions yet.</Body>;
  return (
    <>
      <SectionLabel>Recent contact submissions</SectionLabel>
      <H2 style={{ marginBottom: spacing.l }}>{items.length} contacts</H2>
      {items.map((c) => (
        <Card key={c.id} style={{ marginBottom: spacing.m }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <H3 style={{ fontSize: 16 }}>{c.name}</H3>
            {c.email_sent ? (
              <View style={styles.emailBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
                <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>Emailed</Text>
              </View>
            ) : null}
          </View>
          <Small dim>{c.email}{c.phone ? ` · ${c.phone}` : ''}</Small>
          {c.company ? <Small dim>{c.company}</Small> : null}
          {c.serviceInterest ? <Small style={{ color: palette.primary, marginTop: 4, fontWeight: '700' }}>{c.serviceInterest}</Small> : null}
          <Body style={{ marginTop: spacing.s }} numberOfLines={4}>{c.message}</Body>
          <Small dim style={{ marginTop: spacing.s }}>{new Date(c.created_at).toLocaleString()}</Small>
        </Card>
      ))}
    </>
  );
}

function EligibilityListView({ items }: { items: any[] }) {
  if (items.length === 0) return <Body dim>No eligibility checks yet.</Body>;
  return (
    <>
      <SectionLabel>Recent eligibility checks</SectionLabel>
      <H2 style={{ marginBottom: spacing.l }}>{items.length} checks</H2>
      {items.map((e) => (
        <View key={e.id} style={styles.eligRow}>
          <View style={[styles.verdictDot, { backgroundColor: verdictBarColor(e.verdict) }]} />
          <View style={{ flex: 1 }}>
            <Body style={{ fontWeight: '700' }} numberOfLines={1}>{e.diagnosis}</Body>
            <Small dim>{e.verdict} · {e.indicators_count} indicators · {new Date(e.created_at).toLocaleDateString()}</Small>
          </View>
        </View>
      ))}
    </>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number; sub: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Small dim>{label}</Small>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Small dim style={{ fontSize: 11 }}>{sub}</Small>
    </View>
  );
}

function verdictBarColor(verdict: string) {
  if (verdict === 'LIKELY') return '#16a34a';
  if (verdict === 'POSSIBLE') return '#f59e0b';
  return '#6b7280';
}

const styles = StyleSheet.create({
  lockWrap: {
    width: 72, height: 72, borderRadius: 36, alignSelf: 'center',
    backgroundColor: palette.primaryTint, borderWidth: 1, borderColor: palette.primary + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  input: {
    backgroundColor: palette.bgElev2,
    borderColor: palette.cardBorderStrong,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.text,
    fontSize: 15,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: palette.divider,
    backgroundColor: palette.bgElev1,
    paddingHorizontal: spacing.s,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: palette.primary },
  tabText: { color: palette.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  tabIconBtn: { padding: 14 },
  statsRow: { flexDirection: 'row', gap: spacing.m, marginBottom: spacing.m },
  statCard: {
    flex: 1, padding: spacing.l, borderRadius: radius.lg, borderWidth: 1,
    borderColor: palette.cardBorder, backgroundColor: palette.bgElev1, gap: 4,
  },
  statIcon: {
    width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  statValue: { fontSize: 26, fontWeight: '900', letterSpacing: -0.8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  barTrack: { flex: 1, height: 8, backgroundColor: palette.bgElev3, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%' },
  diagRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderColor: palette.divider,
  },
  emailBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  eligRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: spacing.m, borderBottomWidth: 1, borderColor: palette.divider,
  },
  verdictDot: { width: 10, height: 10, borderRadius: 5 },
});
