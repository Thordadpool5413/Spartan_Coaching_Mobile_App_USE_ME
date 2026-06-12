module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || '',
    betaUnlock: process.env.EXPO_PUBLIC_BETA_UNLOCK === '1',
    adminToken: process.env.EXPO_PUBLIC_ADMIN_TOKEN || '',
    buildVariant: process.env.EXPO_PUBLIC_BUILD_VARIANT || 'beta',
  },
});
