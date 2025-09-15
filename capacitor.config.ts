import { CapacitorConfig } from '@capacitor/core';

const isDev = process.env.NODE_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'com.reciclagem.pereque',
  appName: 'Reciclagem Pereque',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      iosKeychainPrefix: 'reciclagem-pereque',
      iosBiometric: {
        biometricAuth: false,
        biometricTitle: "Reciclagem Pereque"
      },
      androidIsEncryption: false,
      androidBiometric: {
        biometricAuth: false,
        biometricTitle: "Reciclagem Pereque",
        biometricSubTitle: "Acesso ao sistema de reciclagem"
      },
      androidDatabaseLocation: 'default'
    },
    App: {
      launchUrl: null
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#3b82f6",
      showSpinner: false,
      androidSpinnerStyle: "large",
      spinnerColor: "#ffffff"
    }
  },
  android: {
    allowMixedContent: isDev,
    captureInput: true,
    webContentsDebuggingEnabled: isDev
  }
};

export default config;