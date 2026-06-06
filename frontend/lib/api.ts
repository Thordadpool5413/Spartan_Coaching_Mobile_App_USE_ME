import axios from 'axios';
import { Platform } from 'react-native';

/**
 * Resolve the backend base URL.
 *
 * - Web (dev preview & production): use same-origin `/api` so that Kubernetes ingress / Render
 *   routes the call to the right FastAPI service. This lets the preview environment exercise
 *   the locally-running backend with the latest code (including unreleased changes).
 * - Native (iOS/Android builds via Expo): fall back to the explicit production backend URL
 *   from EXPO_PUBLIC_BACKEND_URL since the app is offline from any web origin.
 */
function resolveBackendUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return (
    process.env.EXPO_PUBLIC_BACKEND_URL || 'https://spartan-coaching-api.onrender.com'
  );
}

const BACKEND_URL = resolveBackendUrl();

export const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

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
