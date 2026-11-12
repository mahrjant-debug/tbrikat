import { safeStorage } from './storage';

/** معرّفات التهاني التي سبق الاحتفال بها (تمنع التكرار عند إعادة تحميل الصفحة أو وصول الحدث مرتين) */
const KEY = 'cw.celebrated';
const MAX = 80;

const memory = new Set<string>(safeStorage.getJSON<string[]>(KEY, []));

export function hasCelebrated(id: string): boolean {
  return memory.has(id);
}

export function markCelebrated(id: string): void {
  memory.add(id);
  const arr = Array.from(memory).slice(-MAX);
  safeStorage.setJSON(KEY, arr);
}
