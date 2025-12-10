import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bahorai.app',
  appName: 'Bahor AI',
  webDir: 'dist',
  // For production builds, comment out or remove the server block below
  // For development hot-reload, uncomment it
  // server: {
  //   url: 'https://96e8fdf8-d2d3-4c09-a124-fe6906fc902b.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
  plugins: {
    Browser: {},
    App: {},
    Haptics: {},
    Keyboard: {
      // Resize behavior - adjusts viewport when keyboard opens
      resize: 'body',
      // Don't auto-scroll to focused input (we handle this manually)
      scrollAssist: false,
    },
  },
  ios: {
    // Smooth scrolling and keyboard handling
    scrollEnabled: true,
    allowsLinkPreview: false,
  },
  android: {
    // Use adjustResize for keyboard handling
    adjustResize: true,
  },
};

export default config;
