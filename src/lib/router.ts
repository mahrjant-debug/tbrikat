import { useSyncExternalStore } from 'react';

/** توجيه بسيط عبر History API بلا مكتبة */
export type Route = 'display' | 'guest' | 'admin';

export function pathToRoute(pathname: string): Route {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p.startsWith('/admin')) return 'admin';
  if (p.startsWith('/congratulate')) return 'guest';
  return 'display';
}

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
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('cw:navigate'));
  }
}

export function useRoute(): Route {
  const path = useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => '/',
  );
  return pathToRoute(path);
}
