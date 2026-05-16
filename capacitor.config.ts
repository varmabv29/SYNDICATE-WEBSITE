import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.syndicates.app',
  appName: 'Syndicate',
  webDir: 'public',
  server: {
    url: 'https://syndicate-website-theta.vercel.app/',
    cleartext: true
  }
};

export default config;
