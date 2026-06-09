import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getDeviceId } from './device';

/**
 * Resolve the backend base URL at REQUEST time (not module-init).
 *
 * - Web: same-origin so the proxy routes the call to the locally-running backend.
 * - Native: reads from (in order of precedence):
 *     1. app.config.js extra.backendUrl  (injected at EAS build time from EXPO_PUBLIC_BACKEND_URL)
 *     2. EXPO_PUBLIC_BACKEND_URL         (Metro dev builds)
 *   If neither is set the URL is empty; the backend must be reachable another way.
 *
 * Lazy resolution avoids the Metro-bundle-stale gotcha — every axios call recomputes the
 * URL through the interceptor, so hot-reloads always pick up the new value.
 */
function resolveBackendUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return (
    (Constants.expoConfig?.extra?.backendUrl as string | undefined) ||
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    ''
  );
}

export const api = axios.create({
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// Recompute base URL per-request and inject X-Device-ID so the backend rate
// limiter buckets by device rather than shared IP (e.g. hospital Wi-Fi).
api.interceptors.request.use(async (config) => {
  config.baseURL = `${resolveBackendUrl()}/api`;
  try {
    const deviceId = await getDeviceId();
    config.headers = config.headers ?? {};
    config.headers['X-Device-ID'] = deviceId;
  } catch {
    // Non-fatal: rate limiter falls back to IP.
  }
  return config;
});

const AI_ENDPOINTS = ['/ask', '/chat', '/tools/objection', '/tools/playbook', '/roleplay/turn', '/eligibility/assess'];

api.interceptors.request.use(async (config) => {
  const url = config.url ?? '';
  if (config.method === 'post' && AI_ENDPOINTS.some((ep) => url.endsWith(ep))) {
    const deviceId = await getDeviceId();
    if (typeof config.data === 'string') {
      try {
        const parsed = JSON.parse(config.data);
        if (!parsed.deviceId) {
          config.data = JSON.stringify({ ...parsed, deviceId });
        }
      } catch {
      }
    } else if (config.data && typeof config.data === 'object') {
      if (!config.data.deviceId) {
        config.data = { ...config.data, deviceId };
      }
    }
  }
  return config;
});

// Redirect to paywall on subscription-required 402 from any AI endpoint.
// Lazy require avoids circular-dependency / init-order problems with expo-router.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 402) {
      const data = error.response?.data;
      if (data?.error === 'subscription_required') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { router } = require('expo-router') as typeof import('expo-router');
          router.push('/paywall' as any);
        } catch {
          // Silently ignore if router is not yet mounted
        }
      }
    }
    return Promise.reject(error);
  }
);

export type ChatHistoryItem = { role: 'user' | 'model'; content: string };

export async function askSpartan(question: string) {
  const { data } = await api.post('/ask', { question });
  return data.response as string;
}

export async function chatWithCoach(prompt: string, history: ChatHistoryItem[]) {
  const { data } = await api.post('/chat', { prompt, conversationHistory: history });
  return data.response as string;
}

export async function getObjectionResponse(objection: string, context?: string) {
  const { data } = await api.post('/tools/objection', { objection, context });
  return data.response as string;
}

export async function getPlaybook(scenario: string, referralSourceType?: string, goal?: string) {
  const { data } = await api.post('/tools/playbook', { scenario, referralSourceType, goal });
  return data.response as string;
}

export type Scenario = { id: string; title: string; description: string };

export async function getRoleplayScenarios() {
  const { data } = await api.get('/roleplay/scenarios');
  return data.scenarios as Scenario[];
}

export async function roleplayTurn(
  scenarioId: string,
  userMessage: string,
  history: ChatHistoryItem[],
) {
  const { data } = await api.post('/roleplay/turn', { scenarioId, userMessage, history });
  return data.response as string;
}

export async function roleplayFeedback(scenarioId: string, transcript: ChatHistoryItem[]) {
  const { data } = await api.post('/roleplay/feedback', { scenarioId, transcript });
  return data as { feedback: string; rating: number };
}

export type DrillToday = { index: number; category: string; drill: string; dateKey: string };
export async function getTodayDrill() {
  const { data } = await api.get('/drills/today');
  return data as DrillToday;
}

export async function getAllDrills() {
  const { data } = await api.get('/drills/all');
  return data.drills as { index: number; category: string; drill: string }[];
}

export type DrillStats = {
  totalCompleted: number;
  streak: number;
  completions: { dateKey: string; drillIndex?: number }[];
  heatmap: { date: string; done: boolean }[];
};

export async function completeDrill(deviceId: string, drillIndex: number, dateKey: string) {
  const { data } = await api.post('/drills/complete', { deviceId, drillIndex, dateKey });
  return data as DrillStats;
}

export async function getDrillStats(deviceId: string) {
  const { data } = await api.get(`/drills/stats/${deviceId}`);
  return data as DrillStats;
}

export type KbEntry = { term: string; category: string; definition: string };
export async function getKnowledge(q?: string, category?: string) {
  const { data } = await api.get('/knowledge', { params: { q, category } });
  return data as { entries: KbEntry[]; categories: string[]; total: number };
}

export type ContactPayload = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  serviceInterest?: string;
  message: string;
};

export async function submitContact(payload: ContactPayload) {
  const { data } = await api.post('/contact', payload);
  return data as { id: string; email_sent: boolean };
}

export type EligibilityVerdict = 'LIKELY' | 'POSSIBLE' | 'NOT_YET';

export type EligibilityPayload = {
  diagnosis: string;
  age?: number;
  indicators: string[];
  functionalScale?: string;
  functionalScore?: string;
  recentEvents?: string;
  notes?: string;
};

export async function assessEligibility(payload: EligibilityPayload) {
  const { data } = await api.post('/eligibility/assess', payload);
  return data as { verdict: EligibilityVerdict; summary: string };
}

// ----- Admin -----
export type AdminOverview = {
  generated_at: string;
  contacts: { total: number; today: number; last_7_days: number; last_30_days: number };
  eligibility_checks: {
    total: number;
    last_7_days: number;
    verdict_breakdown_30d: Record<string, number>;
    top_diagnoses_30d: { diagnosis: string; count: number }[];
  };
  drills: { total_completions: number; unique_users: number };
  ai_chat: { total: number; last_7_days: number };
};

export async function adminOverview(token: string) {
  const { data } = await api.get('/admin/overview', { headers: { Authorization: `Bearer ${token}` } });
  return data as AdminOverview;
}

export async function adminContacts(token: string) {
  const { data } = await api.get('/admin/contacts', { headers: { Authorization: `Bearer ${token}` } });
  return data as { items: any[]; count: number };
}

export async function adminEligibility(token: string) {
  const { data } = await api.get('/admin/eligibility', { headers: { Authorization: `Bearer ${token}` } });
  return data as { items: any[]; count: number };
}

export type ArticlePayload = {
  title: string;
  description: string;
  body?: string;
  linkedinUrl?: string;
  publishDate: string;
  featured: boolean;
};

export async function adminCreateArticle(token: string, payload: ArticlePayload) {
  const { data } = await api.post('/admin/articles', payload, { headers: { Authorization: `Bearer ${token}` } });
  return data as { id: string; status: string };
}

export async function adminUpdateArticle(token: string, id: string, payload: ArticlePayload) {
  const { data } = await api.put(`/admin/articles/${id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
  return data as { id: string; status: string };
}

export async function adminDeleteArticle(token: string, id: string) {
  const { data } = await api.delete(`/admin/articles/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return data as { id: string; status: string };
}

export async function adminReorderArticles(token: string, order: { id: string; sortOrder: number }[]) {
  const { data } = await api.patch('/admin/articles/reorder', { order }, { headers: { Authorization: `Bearer ${token}` } });
  return data as { status: string };
}

export type MethodContent = {
  pillars: { id: string; title: string; description: string }[];
  subjects: {
    id: string;
    title: string;
    icon: string;
    color: string;
    purpose: string;
    executionStandard: string;
    measurableOutput: string;
  }[];
  fundamentals: { title: string; description: string }[];
  ethics: { title: string; icon: string }[];
};

export async function getMethod() {
  const { data } = await api.get('/method');
  return data as MethodContent;
}

// ----- Billing / Stripe Checkout -----
export type CheckoutPayload = {
  package_id: 'coaching_30' | 'coaching_60';
  origin_url: string;
  customer_name?: string;
  customer_email?: string;
  notes?: string;
};

export async function createCheckout(payload: CheckoutPayload) {
  const { data } = await api.post('/billing/checkout', payload);
  return data as { url: string; session_id: string };
}

export async function getCheckoutStatus(sessionId: string) {
  const { data } = await api.get(`/billing/status/${sessionId}`);
  return data as {
    session_id: string;
    status: string;
    payment_status: string;
    amount_total: number;
    currency: string;
  };
}

// ----- Repo-mirrored static content -----
export type Testimonial = {
  id: string;
  name: string;
  title: string;
  company: string;
  quote: string;
  outcome: string;
  category: 'individual' | 'leadership' | 'corporate';
  featured: boolean;
};
export type CaseStudy = {
  id: string;
  title: string;
  clientLabel: string;
  challenge: string;
  solution: string;
  results: string[];
  category: 'individual' | 'leadership' | 'corporate';
};
export type Article = {
  id: string;
  title: string;
  description: string;
  body?: string;
  linkedinUrl?: string;
  publishDate: string;
  featured: boolean;
  sortOrder?: number;
};
export type Podcast = {
  id: string;
  title: string;
  description: string;
  episodeNumber: number;
  duration: string;
};
export type Resource = {
  id: string;
  title: string;
  description: string;
  category: 'script' | 'template' | 'checklist' | 'guide';
};

export async function getTestimonials() {
  const { data } = await api.get('/content/testimonials');
  return data as { testimonials: Testimonial[]; caseStudies: CaseStudy[] };
}
export async function getArticles() {
  const { data } = await api.get('/content/articles');
  return data as { articles: Article[] };
}
export async function getArticle(id: string) {
  const { data } = await api.get(`/content/articles/${id}`);
  return data as Article;
}
export async function getPodcasts() {
  const { data } = await api.get('/content/podcasts');
  return data as { podcasts: Podcast[] };
}
export async function getResources() {
  const { data } = await api.get('/content/resources');
  return data as { resources: Resource[] };
}

// ----- App settings -----
export async function getHeroBadge(): Promise<{ text: string }> {
  const { data } = await api.get('/settings/hero');
  return data as { text: string };
}

export async function adminUpdateHeroBadge(token: string, text: string) {
  const { data } = await api.put('/admin/settings/hero', { text }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data as { status: string; text: string };
}

// ----- Subscription -----
export type SubscriptionStatusResponse = {
  tier: string;
  trial_ends_at: string | null;
  stripe_status: string | null;
  is_active: boolean;
  trial_hours_left: number;
};

export async function getSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
  const { data } = await api.get('/subscription/status');
  return data as SubscriptionStatusResponse;
}

export async function createCheckoutSession(originUrl: string): Promise<{ url: string; session_id: string }> {
  const { data } = await api.post('/subscription/checkout', { origin_url: originUrl });
  return data as { url: string; session_id: string };
}

export async function getPortalUrl(): Promise<{ url: string }> {
  const { data } = await api.get('/subscription/portal');
  return data as { url: string };
}

export async function createTeamCheckoutSession(
  seats: 5 | 10,
  originUrl: string,
  companyName?: string,
  contactEmail?: string,
): Promise<{ url: string; session_id: string }> {
  const { data } = await api.post('/subscription/team-checkout', {
    seats,
    origin_url: originUrl,
    company_name: companyName || undefined,
    contact_email: contactEmail || undefined,
  });
  return data as { url: string; session_id: string };
}

export async function redeemTeamCodeApi(teamCode: string): Promise<{ company_name: string; seats_remaining: number }> {
  const { data } = await api.post('/team/redeem', { team_code: teamCode.trim().toUpperCase() });
  return data as { company_name: string; seats_remaining: number };
}

export type TeamLicense = {
  id: number;
  code: string;
  company_name: string | null;
  contact_email: string | null;
  seat_count: number;
  seats_used: number;
  stripe_status: string | null;
  active: boolean;
  created_at: string;
};

export async function adminTeamLicenses(token: string): Promise<{ items: TeamLicense[]; count: number }> {
  const { data } = await api.get('/admin/team-licenses', { headers: { Authorization: `Bearer ${token}` } });
  return data as { items: TeamLicense[]; count: number };
}
