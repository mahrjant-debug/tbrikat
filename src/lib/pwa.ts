import { useSyncExternalStore } from 'react';

/**
 * نمنع نافذة التثبيت التلقائية في كل الصفحات (preventDefault) ونحتفظ بالحدث؛
 * زر التثبيت يظهر فقط في شريط الشاشة/المشرف، ولا يظهر أبداً في صفحة الضيف.
 */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();

export function initInstallCapture(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useCanInstall(): boolean {
  return useSyncExternalStore(subscribe, () => deferred !== null, () => false);
}

export async function promptInstall(): Promise<void> {
  const ev = deferred;
  if (!ev) return;
  try {
    await ev.prompt();
    await ev.userChoice;
  } catch {
    /* تجاهل */
  }
  deferred = null;
  listeners.forEach((l) => l());
}
