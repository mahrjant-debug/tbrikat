import { useEffect, useState } from 'react';
import { getApps, initializeApp } from '@firebase/app';
import {
  EmailAuthProvider,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  type Auth,
  type User,
} from '@firebase/auth';
import { app, firebaseConfig, useEmulator } from './firebase';

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

/** تطبيق ثانوي مستقل: إنشاء حساب مشرف جديد منه لا يُسجّل خروج المشرف الحالي */
let secondary: Auth | null = null;
function secondaryAuth(): Auth {
  if (secondary) return secondary;
  const existing = getApps().find((x) => x.name === 'admin-creator');
  const sApp = existing ?? initializeApp(firebaseConfig, 'admin-creator');
  secondary = getAuth(sApp);
  if (useEmulator) connectAuthEmulator(secondary, 'http://127.0.0.1:9099', { disableWarnings: true });
  return secondary;
}

/**
 * ينشئ حساب Firebase Auth بالبريد وكلمة المرور.
 * 'created' = حساب جديد؛ 'existing' = البريد مسجّل مسبقاً (لا نغيّر كلمة مروره).
 */
export async function createAdminAccount(email: string, password: string, name: string): Promise<'created' | 'existing'> {
  const sa = secondaryAuth();
  try {
    const cred = await createUserWithEmailAndPassword(sa, email, password);
    await updateProfile(cred.user, { displayName: name });
    return 'created';
  } catch (e) {
    if ((e as { code?: string } | null)?.code === 'auth/email-already-in-use') return 'existing';
    throw e;
  } finally {
    await signOut(sa).catch(() => undefined);
  }
}

/** تغيير كلمة مرور المشرف الحالي (يتطلب كلمة المرور الحالية) */
export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user?.email) throw Object.assign(new Error('no user'), { code: 'auth/no-current-user' });
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  await updatePassword(user, newPassword);
}

/** إرسال رابط تعيين كلمة مرور جديدة إلى بريد المشرف */
export async function sendResetLink(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function updateOwnDisplayName(name: string): Promise<void> {
  if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: name });
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
  'auth/weak-password': 'كلمة المرور ضعيفة: استخدم 8 أحرف على الأقل.',
  'auth/email-already-in-use': 'هذا البريد مسجّل مسبقاً.',
  'auth/requires-recent-login': 'لأسباب أمنية سجّل الخروج ثم الدخول من جديد وحاول مرة أخرى.',
  'auth/user-token-expired': 'انتهت الجلسة، سجّل الدخول من جديد.',
  'auth/no-current-user': 'لا يوجد مستخدم مسجَّل دخوله.',
};

export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? '';
  return MESSAGES[code] ?? 'تعذّر تسجيل الدخول. حاول مرة أخرى.';
}
