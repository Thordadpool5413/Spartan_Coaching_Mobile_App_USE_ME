import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, Switch, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, spacing } from '../theme';
import { Card, PrimaryButton, GhostButton, H2, H3, Body, Small, SectionLabel } from '../components/UI';
import { getAdminToken, getBuildVariant, isBetaUnlockEnabled } from '../lib/build';
import {
  adminOverview, adminContacts, adminEligibility, AdminOverview,
  adminCreateArticle, adminUpdateArticle, adminDeleteArticle, adminReorderArticles, getArticles,
  adminUpdateHeroBadge, getHeroBadge,
  Article, ArticlePayload,
} from '../lib/api';

const TOKEN_KEY = 'spartan_admin_token';
const PIN_LENGTH = 4;

type Tab = 'overview' | 'contacts' | 'eligibility' | 'articles' | 'settings';
type ArticleView = 'list' | 'form';

const TAB_LABELS: Record<Tab, string> = {
  overview: 'OVERVIEW',
  contacts: 'CONTACTS',
  eligibility: 'ELIG.',
  articles: 'ARTICLES',
  settings: 'SETTINGS',
};

// ─── PIN pad ────────────────────────────────────────────────────────────────

function PinPad({
  onSubmit,
  loading,
  error,
}: {
  onSubmit: (pin: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [digits, setDigits] = useState<string[]>([]);

  const press = (d: string) => {
    if (loading) return;
    const next = [...digits, d].slice(0, PIN_LENGTH);
    setDigits(next);
    if (next.length === PIN_LENGTH) {
      onSubmit(next.join(''));
      setDigits([]);
    }
  };

  const del = () => {
    if (loading) return;
    setDigits((prev) => prev.slice(0, -1));
  };

  const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <View style={pinStyles.wrap}>
      <View style={pinStyles.lockIcon}>
        <Ionicons name="lock-closed" size={32} color={palette.primary} />
      </View>

      <Text style={pinStyles.title}>Admin access</Text>
      <Text style={pinStyles.subtitle}>Enter your PIN</Text>

      {/* Dots */}
      <View style={pinStyles.dotsRow}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[
              pinStyles.dot,
              i < digits.length && pinStyles.dotFilled,
            ]}
          />
        ))}
      </View>

      {error ? <Text style={pinStyles.errorText}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={palette.primary} style={{ marginVertical: 8 }} /> : null}

      {/* Keypad */}
      <View style={pinStyles.grid}>
        {PAD.map((key, idx) => {
          if (key === '') return <View key={idx} style={pinStyles.keyEmpty} />;
          const isDelete = key === '⌫';
          return (
            <Pressable
              key={idx}
              onPress={() => isDelete ? del() : press(key)}
              style={({ pressed }) => [
                pinStyles.key,
                isDelete && pinStyles.keyDelete,
                { opacity: pressed ? 0.6 : 1 },
              ]}
              disabled={loading}
            >
              <Text style={[pinStyles.keyText, isDelete && pinStyles.keyDeleteText]}>{key}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const betaMode = isBetaUnlockEnabled();
  const [token, setToken] = useState(betaMode ? getAdminToken() : '');
  const [authed, setAuthed] = useState(betaMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [elig, setElig] = useState<any[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [articleView, setArticleView] = useState<ArticleView>('list');
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [heroBadge, setHeroBadge] = useState('');
  const [badgeSaving, setBadgeSaving] = useState(false);
  const [badgeSaved, setBadgeSaved] = useState(false);

  useEffect(() => {
    if (betaMode) {
      const builtInToken = getAdminToken();
      setToken(builtInToken);
      loadAll(builtInToken);
      return;
    }

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
      const [ov, c, e, arts, badge] = await Promise.all([
        adminOverview(t),
        adminContacts(t),
        adminEligibility(t),
        getArticles(),
        getHeroBadge(),
      ]);
      setOverview(ov);
      setContacts(c.items || []);
      setElig(e.items || []);
      setArticles(arts.articles || []);
      setHeroBadge(badge.text);
      setAuthed(true);
      if (!betaMode) {
        await AsyncStorage.setItem(TOKEN_KEY, t);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      setError(status === 401 || status === 403 ? 'Wrong PIN. Try again.' : 'Could not connect. Try again.');
      if (!betaMode) {
        setAuthed(false);
      } else {
        setAuthed(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadArticles = async () => {
    const arts = await getArticles();
    setArticles(arts.articles || []);
  };

  const handlePin = async (pin: string) => {
    setToken(pin);
    await loadAll(pin);
  };

  const logout = async () => {
    if (betaMode) {
      return;
    }
    await AsyncStorage.removeItem(TOKEN_KEY);
    setAuthed(false);
    setToken('');
    setOverview(null);
    setContacts([]);
    setElig([]);
    setArticles([]);
    setError(null);
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setArticleView('list');
  };

  if (!authed) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
        <PinPad onSubmit={handlePin} loading={loading} error={error} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={styles.tabBar}>
        {(['overview', 'contacts', 'eligibility', 'articles', 'settings'] as const).map((t) => (
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
        {!betaMode ? (
          <Pressable testID="admin-logout" onPress={logout} style={styles.tabIconBtn}>
            <Ionicons name="log-out-outline" size={18} color={palette.textMuted} />
          </Pressable>
        ) : (
          <View style={styles.betaBadge}>
            <Ionicons name="flask-outline" size={12} color={palette.success} />
            <Small style={{ color: palette.success, fontWeight: '800' }}>Beta</Small>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {betaMode ? (
          <Card style={{ marginBottom: spacing.l, backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.3)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="checkmark-circle" size={18} color={palette.success} />
              <View style={{ flex: 1 }}>
                <Small style={{ color: palette.success, fontWeight: '800' }}>TestFlight admin mode active</Small>
                <Small dim>Build variant: {getBuildVariant()} · No PIN required for beta testers.</Small>
              </View>
            </View>
          </Card>
        ) : null}
        {tab === 'overview' && overview ? <OverviewView overview={overview} /> : null}
        {tab === 'contacts' ? <ContactsView items={contacts} /> : null}
        {tab === 'eligibility' ? <EligibilityListView items={elig} /> : null}
        {tab === 'articles' ? (
          articleView === 'list' ? (
            <ArticlesListView
              articles={articles}
              token={token}
              onNew={() => { setEditingArticle(null); setArticleView('form'); }}
              onEdit={(a) => { setEditingArticle(a); setArticleView('form'); }}
              onDeleted={loadArticles}
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
        {tab === 'settings' ? (
          <SettingsView
            token={token}
            heroBadge={heroBadge}
            onBadgeChange={setHeroBadge}
            saving={badgeSaving}
            saved={badgeSaved}
            onSave={async () => {
              if (!heroBadge.trim()) return;
              setBadgeSaving(true);
              setBadgeSaved(false);
              try {
                await adminUpdateHeroBadge(token, heroBadge.trim());
                setBadgeSaved(true);
                setTimeout(() => setBadgeSaved(false), 2500);
              } catch {}
              setBadgeSaving(false);
            }}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Articles list ───────────────────────────────────────────────────────────

function ArticlesListView({
  articles,
  token,
  onNew,
  onEdit,
  onDeleted,
}: {
  articles: Article[];
  token: string;
  onNew: () => void;
  onEdit: (a: Article) => void;
  onDeleted: () => Promise<void>;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localArticles, setLocalArticles] = useState<Article[]>(articles);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    setLocalArticles(articles);
  }, [articles]);

  const handleDelete = (a: Article) => {
    Alert.alert(
      'Delete Article',
      `Are you sure you want to delete "${a.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(a.id);
            try {
              await adminDeleteArticle(token, a.id);
              await onDeleted();
            } catch (e: any) {
              const detail = e?.response?.data?.detail;
              Alert.alert('Error', detail || 'Failed to delete article. Please try again.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const moveArticle = async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= localArticles.length) return;
    const updated = [...localArticles];
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    const withOrder = updated.map((a, i) => ({ ...a, sortOrder: i }));
    setLocalArticles(withOrder);
    setReordering(true);
    try {
      await adminReorderArticles(token, withOrder.map((a) => ({ id: a.id, sortOrder: a.sortOrder ?? 0 })));
    } catch {
      setLocalArticles(localArticles);
    } finally {
      setReordering(false);
    }
  };

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.l }}>
        <H2>Articles</H2>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s }}>
          {reordering && <ActivityIndicator size="small" color={palette.primary} />}
          <Pressable onPress={onNew} style={styles.newBtn} hitSlop={8}>
            <Ionicons name="add" size={16} color="#fff" />
            <Small style={{ color: '#fff', fontWeight: '800' }}>New</Small>
          </Pressable>
        </View>
      </View>
      {localArticles.length === 0 && <Body dim>No articles yet.</Body>}
      {localArticles.map((a, index) => (
        <Card key={a.id} style={{ marginBottom: spacing.m }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ marginRight: spacing.s, gap: 2 }}>
              <Pressable
                onPress={() => moveArticle(index, 'up')}
                disabled={index === 0 || reordering}
                hitSlop={6}
                style={{ opacity: index === 0 ? 0.2 : 1 }}
              >
                <Ionicons name="chevron-up" size={18} color={palette.textMuted} />
              </Pressable>
              <Pressable
                onPress={() => moveArticle(index, 'down')}
                disabled={index === localArticles.length - 1 || reordering}
                hitSlop={6}
                style={{ opacity: index === localArticles.length - 1 ? 0.2 : 1 }}
              >
                <Ionicons name="chevron-down" size={18} color={palette.textMuted} />
              </Pressable>
            </View>
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
            <Pressable
              onPress={() => handleDelete(a)}
              disabled={deletingId === a.id}
              style={[styles.editBtn, { marginLeft: spacing.s }]}
              hitSlop={8}
            >
              {deletingId === a.id
                ? <ActivityIndicator size="small" color={palette.primary} />
                : <Ionicons name="trash-outline" size={18} color="#ef4444" />
              }
            </Pressable>
          </View>
        </Card>
      ))}
    </>
  );
}

// ─── Article form ────────────────────────────────────────────────────────────

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
      setFormError('Publish date must be in YYYY-MM-DD format (e.g. 2026-06-09).');
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
          <Small style={styles.fieldLabel}>Article body (markdown — **bold**, ## headings, - lists)</Small>
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
            placeholder="2026-06-09"
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

// ─── Settings ────────────────────────────────────────────────────────────────

function SettingsView({
  token: _token,
  heroBadge,
  onBadgeChange,
  saving,
  saved,
  onSave,
}: {
  token: string;
  heroBadge: string;
  onBadgeChange: (s: string) => void;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <>
      <SectionLabel>App Settings</SectionLabel>
      <H2 style={{ marginBottom: spacing.l }}>Home screen badge</H2>
      <Card style={{ marginBottom: spacing.l }}>
        <Text style={styles.fieldLabel}>Hero badge text</Text>
        <TextInput
          value={heroBadge}
          onChangeText={onBadgeChange}
          placeholder="e.g. 2026 Coaching Programs Open"
          placeholderTextColor={palette.textFaint}
          style={styles.fieldInput}
          maxLength={120}
          returnKeyType="done"
        />
        <Small dim style={{ marginTop: spacing.s }}>
          Displayed on the home screen green badge. Max 120 characters.
        </Small>
        <PrimaryButton
          label={saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Badge Text'}
          onPress={onSave}
          disabled={saving || !heroBadge.trim()}
          style={{ marginTop: spacing.l }}
          icon={saved ? <Ionicons name="checkmark" size={16} color="#fff" /> : undefined}
        />
      </Card>
    </>
  );
}

// ─── Overview / Contacts / Eligibility (unchanged) ──────────────────────────

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

// ─── Styles ──────────────────────────────────────────────────────────────────

const pinStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  lockIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: palette.primaryTint,
    borderWidth: 1, borderColor: palette.primary + '40',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.l,
  },
  title: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: spacing.s,
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 14,
    marginBottom: spacing.xl,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: spacing.m,
  },
  dot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: palette.cardBorderStrong,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  errorText: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.s,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 280,
    marginTop: spacing.l,
    gap: 12,
  },
  key: {
    width: 82, height: 64,
    borderRadius: radius.lg,
    backgroundColor: palette.bgElev1,
    borderWidth: 1, borderColor: palette.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  keyEmpty: {
    width: 82, height: 64,
  },
  keyDelete: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  keyText: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '600',
  },
  keyDeleteText: {
    color: palette.textMuted,
    fontSize: 20,
  },
});

const styles = StyleSheet.create({
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
  betaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
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
