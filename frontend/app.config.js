module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || 'https://api.spartanhospicecoaching.com',
    betaUnlock: process.env.EXPO_PUBLIC_BETA_UNLOCK === '1',
    buildVariant: process.env.EXPO_PUBLIC_BUILD_VARIANT || 'beta',
  },
});
