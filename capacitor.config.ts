import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'nz.co.savo.app',
  appName: 'SAVO',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '801226493928-0uq06s4htaufogc6ra2h1t9j1tog2rfl.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
