import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Timestamp, Firestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { ConfigManager, FirebaseAppConfig } from './lib/configManager';

export const USER_ID = 'default';

let app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _cachedConfigStr: string | null = null;

function ensureInitialized(): { app: FirebaseApp; config: FirebaseAppConfig } {
  const config = ConfigManager.getFirebaseConfig();
  if (!config) {
    throw new Error('Firebase is not configured. Please set up your Firebase config first.');
  }

  const configStr = JSON.stringify(config);
  if (!app || configStr !== _cachedConfigStr) {
    app = initializeApp(config);
    _cachedConfigStr = configStr;
    _db = null;
  }

  return { app, config };
}

export function getDb(): Firestore {
  if (_db) return _db;
  const { app: firebaseApp, config } = ensureInitialized();
  
  // Enable offline persistence
  _db = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ...(config.firestoreDatabaseId ? { databaseId: config.firestoreDatabaseId } : {})
  });
  
  return _db;
}

export function reinitializeFirebase() {
  app = null;
  _db = null;
  _cachedConfigStr = null;
}

// Use getDb() directly in all hooks/services instead of a proxy export.
// Firebase's collection()/doc() require a real Firestore instance (instanceof checks).

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { Timestamp };
