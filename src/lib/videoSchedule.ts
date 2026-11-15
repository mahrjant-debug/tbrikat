import { VIDEO_SCHEDULE_GRACE_MS } from './constants';
import type { Video } from './types';

type Sched = Pick<Video, 'scheduleAt' | 'repeatCount' | 'repeatEveryMin' | 'repeatUntil'>;

/** وقت العرض رقم k (يبدأ من 0): الموعد الأول + k × الفاصل */
export const occurrenceAt = (v: Sched, k: number): number => v.scheduleAt + k * v.repeatEveryMin * 60_000;

/** عدد العروض الفعلي: العدد المحدد مقيّداً بتاريخ الانتهاء (لا عرض بعده)، وصفر إن سبق الانتهاءُ الموعدَ الأول */
export function occurrenceCount(v: Sched): number {
  const n = Math.max(1, v.repeatCount);
  if (!(v.repeatUntil > 0)) return n;
  if (v.repeatUntil < v.scheduleAt) return 0;
  return Math.min(n, Math.floor((v.repeatUntil - v.scheduleAt) / (v.repeatEveryMin * 60_000)) + 1);
}

export const lastOccurrenceAt = (v: Sched): number => occurrenceAt(v, Math.max(1, occurrenceCount(v)) - 1);

/** أقرب عرض قادم (أو جارٍ الآن)، أو null إن مضت كل العروض */
export function nextOccurrenceAt(v: Sched, now: number): number | null {
  const n = occurrenceCount(v);
  for (let k = 0; k < n; k++) {
    const t = occurrenceAt(v, k);
    if (t >= now) return t;
  }
  return null;
}

/** رقم أحدث عرض حان موعده ولم تفت مهلته، أو -1 (يُعرض مرة واحدة حتى لو حان أكثر من موعد معاً) */
export function dueOccurrence(v: Sched, now: number): number {
  if (!(v.scheduleAt > 0)) return -1;
  for (let k = occurrenceCount(v) - 1; k >= 0; k--) {
    const t = occurrenceAt(v, k);
    if (now >= t && now - t < VIDEO_SCHEDULE_GRACE_MS) return k;
  }
  return -1;
}
