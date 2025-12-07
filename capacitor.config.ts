import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bahorai.app',
  appName: 'Bahor AI',
  webDir: 'dist',
  server: {
    // For development hot-reload from Lovable sandbox
    url: 'https://96e8fdf8-d2d3-4c09-a124-fe6906fc902b.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    Browser: {
      // Browser plugin config
    },
    App: {
      // App plugin config for deep links
    },
  },
};

export default config;
