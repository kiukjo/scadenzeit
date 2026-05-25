import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'it.scadenzait.app',
  appName: 'ScadenzaIT',
  webDir: 'dist/scadenzait/browser',
  server: {
    androidScheme: 'https'
  }
};

export default config;
