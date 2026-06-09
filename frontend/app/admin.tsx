import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, Switch, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, spacing } from '../theme';
import { Card, PrimaryButton, GhostButton, H1, H2, H3, Body, Small, SectionLabel } from '../components/UI';
import {
  adminOverview, adminContacts, adminEligibility, AdminOverview,
  adminCreateArticle, adminUpdateArticle, getArticles,
  Article, ArticlePayload,
} from '../lib/api';

const TOKEN_KEY = 'spartan_admin_token';

type Tab = 'overview' | 'contacts' | 'eligibility' | 'articles';
type ArticleView = 'list' | 'form';

const TAB_LABELS: Record<Tab, string> = {
  overview: 'OVERVIEW',
  contacts: 'CONTACTS',
  eligibility: 'ELIG.',
  articles: 'ARTICLES',
};

export default function AdminScreen() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [elig, setElig] = useState<any[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [articleView, setArticleView] = useState<ArticleView>('list');
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

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
      const [ov, c, e, arts] = await Promise.all([
        adminOverview(t),
        adminContacts(t),
        adminEligibility(t),
        getArticles(),
      ]);
      setOverview(ov);
      setContacts(c.items || []);
      setElig(e.items || []);
      setArticles(arts.articles || []);
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

  const loadArticles = async () => {
    const arts = await getArticles();
    setArticles(arts.articles || []);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setAuthed(false);
    setToken('');
    setOverview(null);
    setContacts([]);
    setElig([]);
    setArticles([]);
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setArticleView('list');
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
        {(['overview', 'contacts', 'eligibility', 'articles'] as const).map((t) => (
          <Pressable
            key={t}
            testID={`admin-tab-${t}`}
            onPress={() => switchTab(t)}
            style={({ pressed }) => [
              styles.tabBtn,
              tab === t && styles.tabBtnActive,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[styles.tabText, tab === t && { color: palette.primary }]}>{TAB_LABELS[t]}</Text>
          </Pressable>
        ))}
        <Pressable testID="admin-logout" onPress={logout} style={styles.tabIconBtn}>
          <Ionicons name="log-out-outline" size={18} color={palette.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
      >
        {tab === 'overview' && overview ? <OverviewView overview={overview} /> : null}
        {tab === 'contacts' ? <ContactsView items={contacts} /> : null}
        {tab === 'eligibility' ? <EligibilityListView items={elig} /> : null}
        {tab === 'articles' ? (
          articleView === 'list' ? (
            <ArticlesListView
              articles={articles}
              onNew={() => { setEditingArticle(null); setArticleView('form'); }}
              onEdit={(a) => { setEditingArticle(a); setArticleView('form'); }}
            />
          ) : (
            <ArticleFormView
              token={token}
              article={editingArticle}
              onSaved={async () => {
                await loadArticles();
                setArticleView('list');
              }}
              onCancel={() => setArticleView('list')}
            />
          )
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ArticlesListView({
  articles,
  onNew,
  onEdit,
}: {
  articles: Article[];
  onNew: () => void;
  onEdit: (a: Article) => void;
}) {
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.l }}>
        <H2>Articles</H2>
        <Pressable onPress={onNew} style={styles.newBtn} hitSlop={8}>
          <Ionicons name="add" size={16} color="#fff" />
          <Small style={{ color: '#fff', fontWeight: '800' }}>New</Small>
        </Pressable>
      </View>
      {articles.length === 0 && <Body dim>No articles yet.</Body>}
      {articles.map((a) => (
        <Card key={a.id} style={{ marginBottom: spacing.m }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: spacing.m }}>
              <H3 numberOfLines={2} style={{ marginBottom: 6 }}>{a.title}</H3>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <View style={[styles.chip, { backgroundColor: a.body ? '#16a34a20' : palette.bgElev3 }]}>
                  <Small style={{ color: a.body ? '#16a34a' : palette.textMuted, fontWeight: '700', fontSize: 10 }}>
                    {a.body ? 'HAS BODY' : 'NO BODY'}
                  </Small>
                </View>
                {a.featured && (
                  <View style={[styles.chip, { backgroundColor: palette.primaryTint }]}>
                    <Small style={{ color: palette.primary, fontWeight: '700', fontSize: 10 }}>FEATURED</Small>
                  </View>
                )}
              </View>
            </View>
            <Pressable onPress={() => onEdit(a)} style={styles.editBtn} hitSlop={8}>
              <Ionicons name="pencil-outline" size={18} color={palette.primary} />
            </Pressable>
          </View>
        </Card>
      ))}
    </>
  );
}

function ArticleFormView({
  token,
  article,
  onSaved,
  onCancel,
}: {
  token: string;
  article: Article | null;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const isNew = !article;
  const today = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState(article?.title ?? '');
  const [description, setDescription] = useState(article?.description ?? '');
  const [body, setBody] = useState(article?.body ?? '');
  const [publishDate, setPublishDate] = useState(article?.publishDate ?? today);
  const [featured, setFeatured] = useState(article?.featured ?? false);
  const [linkedinUrl, setLinkedinUrl] = useState(article?.linkedinUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim()) { setFormError('Title is required.'); return; }
    if (!description.trim()) { setFormError('Description is required.'); return; }
    if (!publishDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(publishDate.trim())) {
      setFormError('Publish date must be in YYYY-MM-DD format.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload: ArticlePayload = {
        title: title.trim(),
        description: description.trim(),
        body: body.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
        publishDate: publishDate.trim(),
        featured,
      };
      if (isNew) {
        await adminCreateArticle(token, payload);
      } else {
        await adminUpdateArticle(token, article!.id, payload);
      }
      await onSaved();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setFormError(detail || 'Failed to save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Pressable onPress={onCancel} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.l }}>
        <Ionicons name="arrow-back" size={20} color={palette.text} />
        <Small style={{ color: palette.text }}>Back to list</Small>
      </Pressable>

      <H2 style={{ marginBottom: spacing.l }}>{isNew ? 'New Article' : 'Edit Article'}</H2>

      <Card style={{ gap: spacing.m, marginBottom: spacing.m }}>
        <View>
          <Small style={styles.fieldLabel}>Title *</Small>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Article title"
            placeholderTextColor={palette.textFaint}
            style={styles.fieldInput}
            autoCapitalize="words"
          />
        </View>

        <View>
          <Small style={styles.fieldLabel}>Description * (shown on the list card)</Small>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="One or two sentence summary"
            placeholderTextColor={palette.textFaint}
            style={[styles.fieldInput, styles.fieldInputMulti]}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View>
          <Small style={styles.fieldLabel}>Article body (markdown — supports **bold**, ## headings, - lists)</Small>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={"# Article Title\n\nWrite the full article here.\n\nStart new paragraphs with a blank line.\n\n## Section Heading\n\nMore content..."}
            placeholderTextColor={palette.textFaint}
            style={[styles.fieldInput, styles.fieldInputBody]}
            multiline
            numberOfLines={16}
            textAlignVertical="top"
            autoCorrect={false}
            autoCapitalize="sentences"
          />
        </View>

        <View>
          <Small style={styles.fieldLabel}>Publish date (YYYY-MM-DD) *</Small>
          <TextInput
            value={publishDate}
            onChangeText={setPublishDate}
            placeholder="2026-01-15"
            placeholderTextColor={palette.textFaint}
            style={styles.fieldInput}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View>
          <Small style={styles.fieldLabel}>LinkedIn URL (optional)</Small>
          <TextInput
            value={linkedinUrl}
            onChangeText={setLinkedinUrl}
            placeholder="https://www.linkedin.com/pulse/..."
            placeholderTextColor={palette.textFaint}
            style={styles.fieldInput}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.switchRow}>
          <Small style={{ color: palette.text, fontWeight: '700' }}>Featured</Small>
          <Switch
            value={featured}
            onValueChange={setFeatured}
            trackColor={{ false: palette.bgElev3, true: palette.primary }}
            thumbColor="#fff"
          />
        </View>
      </Card>

      {formError ? (
        <Small style={{ color: palette.primary, marginBottom: spacing.m }}>{formError}</Small>
      ) : null}

      <PrimaryButton
        label={saving ? 'Saving…' : isNew ? 'Publish Article' : 'Save Changes'}
        onPress={handleSave}
        disabled={saving}
        icon={saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={16} color="#fff" />}
      />
      <GhostButton label="Cancel" onPress={onCancel} style={{ marginTop: spacing.s }} />
    </>
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
  tabText: { color: palette.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
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
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: palette.primary, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill,
  },
  chip: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.pill,
  },
  editBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: palette.primaryTint,
    alignItems: 'center', justifyContent: 'center',
  },
  fieldLabel: {
    color: palette.textDim, fontWeight: '700', marginBottom: 6, fontSize: 12,
  },
  fieldInput: {
    backgroundColor: palette.bgElev2,
    borderColor: palette.cardBorderStrong,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.text,
    fontSize: 15,
  },
  fieldInputMulti: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  fieldInputBody: {
    minHeight: 240,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
  switchRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.s,
  },
});
