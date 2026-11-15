import { safeStorage } from './storage';

/**
 * الفيديوهات المجدولة التي بدأ عرضها على هذا الجهاز (المفتاح: المعرّف + الموعد).
 * تمنع تكرار العرض عند إعادة تحميل الصفحة؛ وتعديل الموعد من اللوحة يعيد تفعيله لأن المفتاح يتغير.
 */
const KEY = 'cw.videosPlayed';
const MAX = 60;

const memory = new Set<string>(safeStorage.getJSON<string[]>(KEY, []));
const key = (id: string, at: number) => `${id}@${at}`;

export function hasPlayedScheduled(id: string, at: number): boolean {
  return memory.has(key(id, at));
}

export function markScheduledPlayed(id: string, at: number): void {
  memory.add(key(id, at));
  safeStorage.setJSON(KEY, Array.from(memory).slice(-MAX));
}
