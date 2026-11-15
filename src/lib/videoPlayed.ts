import { safeStorage } from './storage';

/**
 * أحدث عرض مجدول بدأ على هذا الجهاز لكل فيديو (المفتاح: المعرّف + الموعد الأول، والقيمة رقم العرض).
 * يمنع تكرار العرض عند إعادة تحميل الصفحة؛ وتعديل الموعد الأول يعيد التفعيل لأن المفتاح يتغير.
 * الصيغة المخزنة "المعرّف@الموعد#الرقم"، والقديمة "المعرّف@الموعد" تعني العرض الأول.
 */
const KEY = 'cw.videosPlayed';
const MAX = 80;

const memory = new Map<string, number>();
for (const e of safeStorage.getJSON<string[]>(KEY, [])) {
  const m = /^(.*)#(\d+)$/.exec(e);
  const base = m ? m[1] : e;
  memory.set(base, Math.max(memory.get(base) ?? -1, m ? Number(m[2]) : 0));
}

const baseKey = (id: string, at: number) => `${id}@${at}`;

export function hasPlayedScheduled(id: string, at: number, k = 0): boolean {
  return (memory.get(baseKey(id, at)) ?? -1) >= k;
}

/** يعلّم العرض k وكل ما قبله كمعروض */
export function markScheduledPlayed(id: string, at: number, k = 0): void {
  const b = baseKey(id, at);
  const prev = memory.get(b) ?? -1;
  memory.delete(b);
  memory.set(b, Math.max(prev, k));
  safeStorage.setJSON(KEY, Array.from(memory).slice(-MAX).map(([base, i]) => `${base}#${i}`));
}
