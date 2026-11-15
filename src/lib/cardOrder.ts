import type { Congrat } from './types';

const timeOf = (c: Congrat): number => c.approvedAt ?? c.createdAt;

/**
 * ترتيب صندوق التهاني: الأحدث اعتماداً هو رقم 1 والأقدم أخيراً.
 * عند اعتماد تهنئة جديدة تصبح رقم 1 وتنزل البقية رقماً، والدوران يتابع من البطاقة الحالية نزولاً
 * (نحو الأقدم) ثم يلتفّ من الأحدث، فلا تُهمَل تهنئة قديمة مهما توالت التهاني الجديدة.
 */
export function newestFirst(list: Congrat[]): Congrat[] {
  return [...list].sort((a, b) => timeOf(b) - timeOf(a) || b.createdAt - a.createdAt || (a.id < b.id ? -1 : 1));
}

/**
 * موضع البطاقة الحالية في القائمة: بمعرّفها إن وُجدت؛ وإن حُذفت أو أُخفيت فنفس موضعها السابق
 * (أو آخر موضع)، وعند عدم وجود حالية (أول عرض) الأولى أي الأحدث.
 */
export function resolveIndex(cards: Congrat[], currentId: string | null, lastIndex: number): number {
  if (!cards.length) return -1;
  const i = currentId ? cards.findIndex((c) => c.id === currentId) : -1;
  if (i >= 0) return i;
  return currentId ? Math.min(Math.max(lastIndex, 0), cards.length - 1) : 0;
}
