import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.meadowbots',
  appName: 'meadowbots',
  webDir: 'dist',
  server: {
    url: 'https://507347b5-b304-47c7-a618-7ba9a3c5c371.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
