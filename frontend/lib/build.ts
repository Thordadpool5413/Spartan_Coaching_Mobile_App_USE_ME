import Constants from 'expo-constants';

type AppExtra = {
  backendUrl?: string;
  betaUnlock?: boolean;
  adminToken?: string;
  buildVariant?: string;
};

function getExtra(): AppExtra {
  return (Constants.expoConfig?.extra ?? {}) as AppExtra;
}

export function getBackendUrl() {
  return getExtra().backendUrl ?? '';
}

export function isBetaUnlockEnabled() {
  return getExtra().betaUnlock !== false;
}

export function getAdminToken() {
  return getExtra().adminToken ?? 'spartan-admin';
}

export function getBuildVariant() {
  return getExtra().buildVariant ?? (isBetaUnlockEnabled() ? 'beta' : 'production');
}
