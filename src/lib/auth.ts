import { useEffect, useState } from 'react';
import {
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from '@firebase/auth';
import { app, useEmulator } from './firebase';

/** Firebase Auth (بريد + كلمة مرور) — يُحمَّل مع صفحة المشرف فقط */
const auth = getAuth(app);
if (useEmulator) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

export type AuthState = { status: 'loading' } | { status: 'out' } | { status: 'in'; user: User };

/** استعادة الجلسة تلقائياً عبر onAuthStateChanged */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  useEffect(
    () => onAuthStateChanged(auth, (user) => setState(user ? { status: 'in', user } : { status: 'out' })),
    [],
  );
  return state;
}

export async function login(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  'auth/wrong-password': 'كلمة المرور غير صحيحة.',
  'auth/user-not-found': 'لا يوجد حساب بهذا البريد الإلكتروني.',
  'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة.',
  'auth/user-disabled': 'هذا الحساب موقوف. تواصل مع مدير النظام.',
  'auth/too-many-requests': 'محاولات كثيرة فاشلة. انتظر قليلاً ثم حاول مجدداً.',
  'auth/network-request-failed': 'تعذّر الاتصال بالإنترنت. تحقق من الشبكة وحاول مجدداً.',
  'auth/missing-password': 'أدخل كلمة المرور.',
  'auth/operation-not-allowed': 'تسجيل الدخول بالبريد غير مفعّل في Firebase Authentication.',
  'auth/unauthorized-domain': 'هذا النطاق غير مضاف في Authorized domains في Firebase.',
};

export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? '';
  return MESSAGES[code] ?? 'تعذّر تسجيل الدخول. حاول مرة أخرى.';
}
