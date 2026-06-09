import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { api } from './api';

export type SubscriptionTier = 'none' | 'trial' | 'pro' | 'team';

export type SubscriptionStatus = {
  tier: SubscriptionTier;
  trialEndsAt: string | null;
  stripeStatus: string | null;
  isActive: boolean;
  trialHoursLeft: number;
  companyName: string | null;
  loading: boolean;
};

const INITIAL: SubscriptionStatus = {
  tier: 'none',
  trialEndsAt: null,
  stripeStatus: null,
  isActive: true, // optimistic — assume active until we know otherwise
  trialHoursLeft: 0,
  companyName: null,
  loading: true,
};

let _cache: SubscriptionStatus | null = null;
let _listeners: Array<(s: SubscriptionStatus) => void> = [];
let _fetching = false;

function notify(s: SubscriptionStatus) {
  _cache = s;
  _listeners.forEach((fn) => fn(s));
}

export async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  if (_fetching) return _cache ?? INITIAL;
  _fetching = true;
  try {
    const { data } = await api.get('/subscription/status');
    const s: SubscriptionStatus = {
      tier: data.tier ?? 'none',
      trialEndsAt: data.trial_ends_at ?? null,
      stripeStatus: data.stripe_status ?? null,
      isActive: data.is_active ?? true,
      trialHoursLeft: data.trial_hours_left ?? 0,
      companyName: data.company_name ?? null,
      loading: false,
    };
    notify(s);
    return s;
  } catch {
    // On network error, assume active to avoid false lockouts
    const s: SubscriptionStatus = { ...INITIAL, loading: false, isActive: true };
    notify(s);
    return s;
  } finally {
    _fetching = false;
  }
}

export function invalidateSubscriptionCache() {
  _cache = null;
}

export function useSubscription(): SubscriptionStatus & { refresh: () => void } {
  const [status, setStatus] = useState<SubscriptionStatus>(_cache ?? INITIAL);
  const appState = useRef(AppState.currentState);

  const refresh = useCallback(() => {
    invalidateSubscriptionCache();
    fetchSubscriptionStatus().then(setStatus);
  }, []);

  useEffect(() => {
    // Register as listener
    _listeners.push(setStatus);

    // Fetch on mount if no cache
    if (!_cache) {
      fetchSubscriptionStatus().then(setStatus);
    } else {
      setStatus({ ..._cache, loading: false });
    }

    // Refresh on app foreground
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        fetchSubscriptionStatus().then(setStatus);
      }
      appState.current = next;
    });

    return () => {
      _listeners = _listeners.filter((fn) => fn !== setStatus);
      sub.remove();
    };
  }, []);

  return { ...status, refresh };
}

export async function createSubscriptionCheckout(originUrl: string): Promise<string> {
  const { data } = await api.post('/subscription/checkout', { origin_url: originUrl });
  return data.url as string;
}

export async function getSubscriptionPortalUrl(): Promise<string> {
  const { data } = await api.get('/subscription/portal');
  return data.url as string;
}

export async function redeemTeamCode(code: string): Promise<{ companyName: string; seatsRemaining: number }> {
  const { data } = await api.post('/team/redeem', { team_code: code.trim().toUpperCase() });
  invalidateSubscriptionCache();
  return { companyName: data.company_name as string, seatsRemaining: data.seats_remaining as number };
}

export async function createTeamCheckout(seats: 5 | 10, originUrl: string): Promise<string> {
  const { data } = await api.post('/subscription/team-checkout', { seats, origin_url: originUrl });
  return data.url as string;
}
