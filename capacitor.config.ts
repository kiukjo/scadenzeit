import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'it.promemo.app',
  appName: 'Promemo',
  webDir: 'dist/scadenzait/browser',
  server: {
    androidScheme: 'https'
  }
};

export default config;
