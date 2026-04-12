const FIREBASE_CONFIG_KEY = 'firebase_app_config';

export interface FirebaseAppConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId?: string;
}

const REQUIRED_FIELDS: (keyof FirebaseAppConfig)[] = [
  'projectId', 'appId', 'apiKey', 'authDomain',
  'firestoreDatabaseId', 'storageBucket', 'messagingSenderId',
];

export const ConfigManager = {
  getFirebaseConfig(): FirebaseAppConfig | null {
    try {
      const raw = localStorage.getItem(FIREBASE_CONFIG_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      for (const field of REQUIRED_FIELDS) {
        if (!parsed[field]) return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  setFirebaseConfig(config: FirebaseAppConfig) {
    localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
  },

  clearFirebaseConfig() {
    localStorage.removeItem(FIREBASE_CONFIG_KEY);
  },

  isConfigured(): boolean {
    return this.getFirebaseConfig() !== null;
  },
};
