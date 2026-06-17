import Constants from 'expo-constants';

type AppExtra = {
  backendUrl?: string;
  betaUnlock?: boolean;
  buildVariant?: string;
};

function getExtra(): AppExtra {
  return (Constants.expoConfig?.extra ?? {}) as AppExtra;
}

export function getBackendUrl() {
  return getExtra().backendUrl ?? 'https://api.spartanhospicecoaching.com';
}

export function isBetaUnlockEnabled() {
  return getExtra().betaUnlock === true;
}

export function getBuildVariant() {
  return getExtra().buildVariant ?? (isBetaUnlockEnabled() ? 'beta' : 'production');
}
