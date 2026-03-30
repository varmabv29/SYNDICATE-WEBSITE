import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.syndicates.app',
  appName: 'Syndicate',
  webDir: 'public',
  server: {
    url: 'http://192.168.1.10:3000',
    cleartext: true
  }
};

export default config;
