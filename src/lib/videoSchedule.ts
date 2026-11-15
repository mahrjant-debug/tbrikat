import { VIDEO_SCHEDULE_GRACE_MS } from './constants';
import type { Video } from './types';

type Sched = Pick<Video, 'scheduleAt' | 'repeatCount' | 'repeatEveryMin'>;

/** وقت العرض رقم k (يبدأ من 0): الموعد الأول + k × الفاصل */
export const occurrenceAt = (v: Sched, k: number): number => v.scheduleAt + k * v.repeatEveryMin * 60_000;

export const lastOccurrenceAt = (v: Sched): number => occurrenceAt(v, Math.max(1, v.repeatCount) - 1);

/** أقرب عرض قادم (أو جارٍ الآن)، أو null إن مضت كل العروض */
export function nextOccurrenceAt(v: Sched, now: number): number | null {
  for (let k = 0; k < Math.max(1, v.repeatCount); k++) {
    const t = occurrenceAt(v, k);
    if (t >= now) return t;
  }
  return null;
}

/** رقم أحدث عرض حان موعده ولم تفت مهلته، أو -1 (يُعرض مرة واحدة حتى لو حان أكثر من موعد معاً) */
export function dueOccurrence(v: Sched, now: number): number {
  if (!(v.scheduleAt > 0)) return -1;
  for (let k = Math.max(1, v.repeatCount) - 1; k >= 0; k--) {
    const t = occurrenceAt(v, k);
    if (now >= t && now - t < VIDEO_SCHEDULE_GRACE_MS) return k;
  }
  return -1;
}
