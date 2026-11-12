import { initializeApp } from '@firebase/app';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from '@firebase/firestore';

const env = import.meta.env;

export const isFirebaseConfigured = Boolean(
  env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_APP_ID,
);

export const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'demo-unconfigured',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
});

/**
 * ذاكرة تخزين محلية دائمة (تقلل القراءات)، ودعم تعدد التبويبات،
 * وتجاهل الحقول undefined لأنها تُفشل الكتابة بخلاف ذلك.
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
});

export const useEmulator = env.VITE_USE_EMULATOR === 'true';
if (useEmulator) connectFirestoreEmulator(db, '127.0.0.1', 8080);

/** تسجّل الخطأ فقط ولا ترمي استثناءً أبداً. */
export function handleFirestoreError(scope: string, error: unknown): void {
  try {
    const code = (error as { code?: string } | null)?.code ?? 'unknown';
    console.error(`[Firestore:${scope}] ${code}`, error);
  } catch {
    /* لا شيء */
  }
}
