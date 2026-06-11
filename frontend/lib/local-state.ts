import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatHistoryItem, EligibilityVerdict } from './api';

const STORAGE_KEY = 'spartan_local_state_v1';
const MAX_ACTIVITY = 12;
const MAX_MESSAGES = 16;

export type FavoriteKind = 'articles' | 'resources' | 'knowledge';
export type ActivityKind = 'chat' | 'roleplay' | 'eligibility' | 'drill' | 'article' | 'resource' | 'contact' | 'knowledge';

export type ContactDraft = {
  name: string;
  email: string;
  phone: string;
  company: string;
  serviceInterest: string;
  message: string;
};

export type EligibilityDraft = {
  step: number;
  diagnosis: string;
  age: string;
  indicators: string[];
  functionalScore: string;
  recentEvents: string;
  result: { verdict: EligibilityVerdict; summary: string } | null;
  updatedAt: string;
};

export type ThreadDraft = {
  input: string;
  messages: ChatHistoryItem[];
  title?: string;
  updatedAt: string;
};

export type RecentActivity = {
  id: string;
  kind: ActivityKind;
  title: string;
  detail?: string;
  route?: string;
  createdAt: string;
};

export type StreakSnapshot = {
  streak: number;
  totalCompleted: number;
  dateKey: string | null;
  updatedAt: string;
};

export type LocalState = {
  drafts: {
    chat: ThreadDraft | null;
    roleplay: Record<string, ThreadDraft>;
    contact: ContactDraft | null;
    eligibility: EligibilityDraft | null;
  };
  favorites: {
    articles: string[];
    resources: string[];
    knowledge: string[];
  };
  recentActivity: RecentActivity[];
  streakSnapshot: StreakSnapshot | null;
};

const DEFAULT_STATE: LocalState = {
  drafts: {
    chat: null,
    roleplay: {},
    contact: null,
    eligibility: null,
  },
  favorites: {
    articles: [],
    resources: [],
    knowledge: [],
  },
  recentActivity: [],
  streakSnapshot: null,
};

let cache: LocalState | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

function cloneState(state: LocalState): LocalState {
  return JSON.parse(JSON.stringify(state)) as LocalState;
}

function safeString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function safeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeMessages(value: unknown): ChatHistoryItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is ChatHistoryItem =>
        !!item &&
        typeof item === 'object' &&
        (item as ChatHistoryItem).role !== undefined &&
        typeof (item as ChatHistoryItem).content === 'string',
    )
    .map((item) => ({
      role: (item.role === 'model' ? 'model' : 'user') as 'user' | 'model',
      content: item.content.slice(0, 2000),
    }))
    .slice(-MAX_MESSAGES);
}

function normalizeContactDraft(value: unknown): ContactDraft | null {
  if (!value || typeof value !== 'object') return null;
  return {
    name: safeString((value as ContactDraft).name),
    email: safeString((value as ContactDraft).email),
    phone: safeString((value as ContactDraft).phone),
    company: safeString((value as ContactDraft).company),
    serviceInterest: safeString((value as ContactDraft).serviceInterest),
    message: safeString((value as ContactDraft).message),
  };
}

function normalizeEligibilityDraft(value: unknown): EligibilityDraft | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<EligibilityDraft>;
  return {
    step: Number.isFinite(raw.step) ? Number(raw.step) : 0,
    diagnosis: safeString(raw.diagnosis),
    age: safeString(raw.age),
    indicators: safeStringArray(raw.indicators),
    functionalScore: safeString(raw.functionalScore),
    recentEvents: safeString(raw.recentEvents),
    result:
      raw.result && typeof raw.result === 'object'
        ? {
            verdict: (raw.result.verdict as EligibilityVerdict) ?? 'POSSIBLE',
            summary: safeString(raw.result.summary),
          }
        : null,
    updatedAt: safeString(raw.updatedAt, nowIso()),
  };
}

function normalizeThreadDraft(value: unknown): ThreadDraft | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<ThreadDraft>;
  return {
    input: safeString(raw.input),
    messages: normalizeMessages(raw.messages),
    title: raw.title ? safeString(raw.title) : undefined,
    updatedAt: safeString(raw.updatedAt, nowIso()),
  };
}

function normalizeRecentActivity(value: unknown): RecentActivity[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is RecentActivity =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as RecentActivity).id === 'string' &&
        typeof (item as RecentActivity).kind === 'string' &&
        typeof (item as RecentActivity).title === 'string' &&
        typeof (item as RecentActivity).createdAt === 'string',
    )
    .map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      detail: typeof item.detail === 'string' ? item.detail : undefined,
      route: typeof item.route === 'string' ? item.route : undefined,
      createdAt: item.createdAt,
    }))
    .slice(0, MAX_ACTIVITY);
}

function normalizeState(value: unknown): LocalState {
  if (!value || typeof value !== 'object') {
    return cloneState(DEFAULT_STATE);
  }

  const raw = value as Partial<LocalState>;
  const drafts = raw.drafts && typeof raw.drafts === 'object' ? raw.drafts : {};
  const favorites = raw.favorites && typeof raw.favorites === 'object' ? raw.favorites : {};

  return {
    drafts: {
      chat: normalizeThreadDraft((drafts as LocalState['drafts']).chat),
      roleplay:
        drafts && typeof drafts === 'object' && (drafts as LocalState['drafts']).roleplay && typeof (drafts as LocalState['drafts']).roleplay === 'object'
          ? Object.entries((drafts as LocalState['drafts']).roleplay).reduce<Record<string, ThreadDraft>>((acc, [key, draft]) => {
              const normalized = normalizeThreadDraft(draft);
              if (normalized) {
                acc[key] = normalized;
              }
              return acc;
            }, {})
          : {},
      contact: normalizeContactDraft((drafts as LocalState['drafts']).contact),
      eligibility: normalizeEligibilityDraft((drafts as LocalState['drafts']).eligibility),
    },
    favorites: {
      articles: safeStringArray((favorites as LocalState['favorites']).articles),
      resources: safeStringArray((favorites as LocalState['favorites']).resources),
      knowledge: safeStringArray((favorites as LocalState['favorites']).knowledge),
    },
    recentActivity: normalizeRecentActivity(raw.recentActivity),
    streakSnapshot:
      raw.streakSnapshot && typeof raw.streakSnapshot === 'object'
        ? {
            streak: Number.isFinite(raw.streakSnapshot.streak) ? Number(raw.streakSnapshot.streak) : 0,
            totalCompleted: Number.isFinite(raw.streakSnapshot.totalCompleted) ? Number(raw.streakSnapshot.totalCompleted) : 0,
            dateKey: typeof raw.streakSnapshot.dateKey === 'string' ? raw.streakSnapshot.dateKey : null,
            updatedAt: typeof raw.streakSnapshot.updatedAt === 'string' ? raw.streakSnapshot.updatedAt : nowIso(),
          }
        : null,
  };
}

async function readState(forceFresh = false): Promise<LocalState> {
  if (cache && !forceFresh) {
    return cloneState(cache);
  }

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    cache = normalizeState(raw ? JSON.parse(raw) : null);
  } catch {
    cache = cloneState(DEFAULT_STATE);
  }

  return cloneState(cache);
}

async function writeState(next: LocalState) {
  cache = normalizeState(next);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  return cloneState(cache);
}

async function updateState(updater: (state: LocalState) => LocalState | Promise<LocalState>) {
  const nextWrite = writeQueue.then(async () => {
    const current = await readState(true);
    const updated = await updater(cloneState(current));
    return writeState(updated);
  });

  writeQueue = nextWrite.then(
    () => undefined,
    () => undefined,
  );

  return nextWrite;
}

function trimMessages(messages: ChatHistoryItem[]) {
  return messages.slice(-MAX_MESSAGES).map((message) => ({
    role: (message.role === 'model' ? 'model' : 'user') as 'user' | 'model',
    content: String(message.content).slice(0, 2000),
  }));
}

export async function loadLocalState() {
  return readState();
}

export async function loadChatDraft() {
  const state = await readState();
  return state.drafts.chat;
}

export async function saveChatDraft(payload: { input: string; messages: ChatHistoryItem[]; title?: string }) {
  await updateState((state) => ({
    ...state,
    drafts: {
      ...state.drafts,
      chat: {
        input: payload.input.slice(0, 2000),
        messages: trimMessages(payload.messages),
        title: payload.title,
        updatedAt: nowIso(),
      },
    },
  }));
}

export async function clearChatDraft() {
  await updateState((state) => ({
    ...state,
    drafts: {
      ...state.drafts,
      chat: null,
    },
  }));
}

export async function loadRoleplayDraft(scenarioId: string) {
  const state = await readState();
  return state.drafts.roleplay[scenarioId] ?? null;
}

export async function saveRoleplayDraft(
  scenarioId: string,
  payload: { input: string; messages: ChatHistoryItem[]; title?: string },
) {
  await updateState((state) => ({
    ...state,
    drafts: {
      ...state.drafts,
      roleplay: {
        ...state.drafts.roleplay,
        [scenarioId]: {
          input: payload.input.slice(0, 2000),
          messages: trimMessages(payload.messages),
          title: payload.title,
          updatedAt: nowIso(),
        },
      },
    },
  }));
}

export async function clearRoleplayDraft(scenarioId: string) {
  await updateState((state) => {
    const nextRoleplay = { ...state.drafts.roleplay };
    delete nextRoleplay[scenarioId];
    return {
      ...state,
      drafts: {
        ...state.drafts,
        roleplay: nextRoleplay,
      },
    };
  });
}

export async function loadContactDraft() {
  const state = await readState();
  return state.drafts.contact;
}

export async function saveContactDraft(payload: ContactDraft) {
  await updateState((state) => ({
    ...state,
    drafts: {
      ...state.drafts,
      contact: {
        name: payload.name.slice(0, 200),
        email: payload.email.slice(0, 200),
        phone: payload.phone.slice(0, 60),
        company: payload.company.slice(0, 200),
        serviceInterest: payload.serviceInterest.slice(0, 200),
        message: payload.message.slice(0, 4000),
      },
    },
  }));
}

export async function clearContactDraft() {
  await updateState((state) => ({
    ...state,
    drafts: {
      ...state.drafts,
      contact: null,
    },
  }));
}

export async function loadEligibilityDraft() {
  const state = await readState();
  return state.drafts.eligibility;
}

export async function saveEligibilityDraft(payload: Omit<EligibilityDraft, 'updatedAt'>) {
  await updateState((state) => ({
    ...state,
    drafts: {
      ...state.drafts,
      eligibility: {
        step: Math.max(0, Math.min(3, payload.step)),
        diagnosis: payload.diagnosis.slice(0, 200),
        age: payload.age.slice(0, 20),
        indicators: payload.indicators.slice(0, 12),
        functionalScore: payload.functionalScore.slice(0, 40),
        recentEvents: payload.recentEvents.slice(0, 2000),
        result: payload.result
          ? {
              verdict: payload.result.verdict,
              summary: payload.result.summary.slice(0, 4000),
            }
          : null,
        updatedAt: nowIso(),
      },
    },
  }));
}

export async function clearEligibilityDraft() {
  await updateState((state) => ({
    ...state,
    drafts: {
      ...state.drafts,
      eligibility: null,
    },
  }));
}

export async function loadFavorites(kind: FavoriteKind) {
  const state = await readState();
  return state.favorites[kind];
}

export async function isFavorite(kind: FavoriteKind, id: string) {
  const state = await readState();
  return state.favorites[kind].includes(id);
}

export async function toggleFavorite(kind: FavoriteKind, id: string) {
  let added = false;
  await updateState((state) => {
    const current = state.favorites[kind];
    const exists = current.includes(id);
    const next = exists ? current.filter((item) => item !== id) : [...current, id];
    added = !exists;
    return {
      ...state,
      favorites: {
        ...state.favorites,
        [kind]: next,
      },
    };
  });

  return added;
}

export async function recordActivity(
  activity: Omit<RecentActivity, 'id' | 'createdAt'> & { createdAt?: string },
) {
  await updateState((state) => {
    const next: RecentActivity = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: activity.createdAt ?? nowIso(),
      kind: activity.kind,
      title: activity.title,
      detail: activity.detail,
      route: activity.route,
    };
    return {
      ...state,
      recentActivity: [next, ...state.recentActivity].slice(0, MAX_ACTIVITY),
    };
  });
}

export async function loadRecentActivity() {
  const state = await readState();
  return state.recentActivity;
}

export async function clearRecentActivity() {
  await updateState((state) => ({
    ...state,
    recentActivity: [],
  }));
}

export async function loadStreakSnapshot() {
  const state = await readState();
  return state.streakSnapshot;
}

export async function saveStreakSnapshot(snapshot: Omit<StreakSnapshot, 'updatedAt'>) {
  await updateState((state) => ({
    ...state,
    streakSnapshot: {
      streak: Math.max(0, snapshot.streak),
      totalCompleted: Math.max(0, snapshot.totalCompleted),
      dateKey: snapshot.dateKey,
      updatedAt: nowIso(),
    },
  }));
}
