import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

const STORAGE_KEY = 'phd_tracker_firebase_config';

export function getSavedFirebaseConfig(): FirebaseClientConfig | null {
  // 1. Check Vite env variables
  const envConfig: FirebaseClientConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  };

  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig;
  }

  // 2. Check localStorage (direct paste in browser UI)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as FirebaseClientConfig;
        if (parsed.apiKey && parsed.projectId) {
          return parsed;
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  return null;
}

export function saveFirebaseConfig(config: FirebaseClientConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
}

export function clearFirebaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

export function getFirebaseServices(): {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  isConfigured: boolean;
} {
  const config = getSavedFirebaseConfig();
  if (!config) {
    return { app: null, auth: null, db: null, isConfigured: false };
  }

  if (!appInstance) {
    const existing = getApps();
    const app: FirebaseApp =
      existing.length > 0 && existing[0] ? existing[0] : initializeApp(config);
    appInstance = app;

    // Initialize Firestore with multi-tab offline persistence
    try {
      dbInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      // Fallback if already initialized
      dbInstance = getFirestore(app);
    }

    authInstance = getAuth(app);
  }

  return {
    app: appInstance,
    auth: authInstance,
    db: dbInstance,
    isConfigured: true,
  };
}

export const googleProvider = new GoogleAuthProvider();
