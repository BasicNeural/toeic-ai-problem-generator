import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User as FirebaseUser, Auth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot, getDocFromServer, Timestamp, Firestore } from 'firebase/firestore';
import { ConfigManager, FirebaseAppConfig } from './lib/configManager';

let app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;
let _googleProvider: GoogleAuthProvider | null = null;
let _cachedConfig: FirebaseAppConfig | null = null;

function ensureInitialized(): { app: FirebaseApp; config: FirebaseAppConfig } {
  const config = ConfigManager.getFirebaseConfig();
  if (!config) {
    throw new Error('Firebase is not configured. Please set up your Firebase config first.');
  }

  if (!app || config !== _cachedConfig) {
    app = initializeApp(config);
    _cachedConfig = config;
    _db = null;
    _auth = null;
    _googleProvider = null;
  }

  return { app, config };
}

export function getDb(): Firestore {
  if (_db) return _db;
  const { app: firebaseApp, config } = ensureInitialized();
  _db = getFirestore(firebaseApp, config.firestoreDatabaseId);
  return _db;
}

export function getAppAuth(): Auth {
  if (_auth) return _auth;
  const { app: firebaseApp } = ensureInitialized();
  _auth = getAuth(firebaseApp);
  return _auth;
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (_googleProvider) return _googleProvider;
  _googleProvider = new GoogleAuthProvider();
  return _googleProvider;
}

export function reinitializeFirebase() {
  app = null;
  _db = null;
  _auth = null;
  _googleProvider = null;
  _cachedConfig = null;
}

export const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    return (getAppAuth() as any)[prop];
  },
});

export const googleProvider = new Proxy({} as GoogleAuthProvider, {
  get(_target, prop) {
    return (getGoogleProvider() as any)[prop];
  },
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = getAppAuth().currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { signInWithPopup, onAuthStateChanged, Timestamp };
export type { FirebaseUser };
