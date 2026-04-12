const FIREBASE_CONFIG_KEY = 'firebase_app_config';

export interface FirebaseAppConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId?: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId?: string;
}

const REQUIRED_FIELDS: (keyof FirebaseAppConfig)[] = [
  'projectId', 'appId', 'apiKey', 'authDomain',
  'storageBucket', 'messagingSenderId',
];

export function parseFirebaseInput(input: string): Record<string, string> | null {
  let trimmed = input.trim();

  try {
    return JSON.parse(trimmed);
  } catch { /* not pure JSON, try JS format */ }

  let cleaned = trimmed
    .replace(/^(?:const|let|var)\s+\w+\s*=\s*/, '')
    .replace(/;\s*$/, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch { /* still not JSON, convert JS object literal */ }

  cleaned = cleaned.replace(/(\w+)\s*:/g, (_match, key) => `"${key}":`);
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

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
