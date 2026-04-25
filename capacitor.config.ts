import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.meadowbots',
  appName: 'meadowbots',
  webDir: 'dist',
  server: {
    url: 'https://meadowbotscout.com',
    cleartext: true
  }
};

export default config;
