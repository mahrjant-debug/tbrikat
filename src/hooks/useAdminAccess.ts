import { useEffect, useRef, useState } from 'react';
import { createAdminProfile, subscribeAdminProfile } from '../lib/db';
import type { AdminProfile } from '../lib/types';

export type AdminAccess = { status: 'loading' } | { status: 'denied' } | { status: 'ok'; profile: AdminProfile };

/**
 * يتحقق من صلاحية الحساب الحالي عبر وثيقة admins/{البريد} (اشتراك واحد ثابت).
 * - وثيقة موجودة → مشرف.
 * - خطأ صلاحيات (الحساب ليس مشرفاً أو سُحبت صلاحيته) → مرفوض.
 * - لا وثيقة والقراءة مسموحة (المشرف الرئيسي في أول دخول) → تُنشأ وثيقته تلقائياً.
 */
export function useAdminAccess(rawEmail: string, displayName: string): AdminAccess {
  const email = rawEmail.trim().toLowerCase();
  const nameRef = useRef(displayName);
  useEffect(() => {
    nameRef.current = displayName;
  });
  const [state, setState] = useState<AdminAccess>({ status: 'loading' });

  useEffect(() => {
    if (!email) {
      setState({ status: 'denied' });
      return;
    }
    setState({ status: 'loading' });
    let creating = false;
    return subscribeAdminProfile(
      email,
      (profile, fromCache) => {
        if (profile) {
          setState({ status: 'ok', profile });
          return;
        }
        if (fromCache || creating) return;
        creating = true;
        createAdminProfile(email, nameRef.current.trim() || 'المشرف الرئيسي', email, 'owner').catch(() =>
          setState({ status: 'denied' }),
        );
      },
      () => setState({ status: 'denied' }),
    );
  }, [email]);

  return state;
}
