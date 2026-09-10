import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'yolustu',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#020617',
    scrollEnabled: true,
    allowsLinkPreview: false,
  },
  android: {
    backgroundColor: '#020617',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#020617',
      overlaysWebView: false,
    },
  },
};

export default config;
