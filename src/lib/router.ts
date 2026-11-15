import { useSyncExternalStore } from 'react';

/** توجيه بسيط عبر History API بلا مكتبة */
export type Route = 'display' | 'guest' | 'admin';

export function pathToRoute(pathname: string): Route {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p.startsWith('/admin')) return 'admin';
  if (p.startsWith('/congratulate')) return 'guest';
  return 'display';
}

/**
 * هل حُمّلت الصفحة الحالية كصفحة مشرف؟ تُحسب مرة واحدة عند التحميل لأن نوع ذاكرة Firestore
 * (انظر firebase.ts) يتحدد حينها؛ والتنقل بين المشرف وغيره يعيد تحميل الصفحة كاملة.
 */
export const loadedAsAdmin = typeof window !== 'undefined' && pathToRoute(window.location.pathname) === 'admin';

export const ROUTE_PATHS: Record<Route, string> = {
  display: '/',
  guest: '/congratulate',
  admin: '/admin',
};

function subscribe(cb: () => void): () => void {
  window.addEventListener('popstate', cb);
  window.addEventListener('cw:navigate', cb);
  return () => {
    window.removeEventListener('popstate', cb);
    window.removeEventListener('cw:navigate', cb);
  };
}

export function navigate(route: Route): void {
  const path = ROUTE_PATHS[route];
  if (window.location.pathname !== path) {
    if ((route === 'admin') !== loadedAsAdmin) {
      window.location.assign(path);
      return;
    }
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('cw:navigate'));
  }
}

// زر الرجوع/التقدّم بين المشرف وغيره: إعادة تحميل كاملة لنفس السبب
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if ((pathToRoute(window.location.pathname) === 'admin') !== loadedAsAdmin) window.location.reload();
  });
}

export function useRoute(): Route {
  const path = useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => '/',
  );
  return pathToRoute(path);
}
