import { useSyncExternalStore } from 'react';
import { safeStorage } from './storage';

/** تفضيلات محلية لكل جهاز (كتم الصوت، إخفاء الجزيئات) تتزامن بين التبويبات */
export interface Prefs {
  muted: boolean;
  hideParticles: boolean;
}

const KEY = 'cw.prefs';
const listeners = new Set<() => void>();

function read(): Prefs {
  const v = safeStorage.getJSON<Partial<Prefs>>(KEY, {});
  return { muted: v.muted === true, hideParticles: v.hideParticles === true };
}

let snapshot: Prefs = read();

function emit(): void {
  listeners.forEach((l) => l());
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
  snapshot = { ...snapshot, [key]: value };
  safeStorage.setJSON(KEY, snapshot);
  emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = read();
      cb();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}
