import axios from 'axios';

const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'https://2a674369-c31a-4a86-a0c2-5398e9495a35.preview.emergentagent.com';

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
