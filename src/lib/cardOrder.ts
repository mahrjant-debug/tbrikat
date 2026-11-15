import { RECENT_APPROVAL_MS } from './constants';
import type { Congrat } from './types';

const timeOf = (c: Congrat): number => c.approvedAt ?? c.createdAt;

/**
 * ترتيب عرض التهاني في الصندوق (قائمة معرّفات).
 * - أول مرة: بترتيب الاعتماد (الأقدم أولاً).
 * - تهنئة اعتُمدت للتو (خلال 3 دقائق): تدخل بعد البطاقة الحالية مباشرة فتكون التالية في الدوران.
 * - تهنئة قديمة وصلت متأخرة (لقطة بدء ثانية): توضع في موضعها الزمني.
 * - المحذوفة/المخفية تخرج، ويبقى باقي الترتيب ثابتاً بين اللقطات.
 */
export function mergeOrder(prevIds: string[], incoming: Congrat[], currentId: string | null, now: number): string[] {
  const byId = new Map(incoming.map((c) => [c.id, c]));
  const prev = prevIds.filter((id) => byId.has(id));
  const known = new Set(prev);
  const fresh = incoming.filter((c) => !known.has(c.id));
  if (!prev.length) return incoming.map((c) => c.id);
  if (!fresh.length) return prev;

  const next = [...prev];
  const byTime = [...fresh].sort((x, y) => timeOf(x) - timeOf(y));
  const recent = byTime.filter((c) => now - timeOf(c) < RECENT_APPROVAL_MS);
  const older = byTime.filter((c) => now - timeOf(c) >= RECENT_APPROVAL_MS);
  for (const c of older) {
    const at = next.findIndex((id) => {
      const other = byId.get(id);
      return other ? timeOf(other) > timeOf(c) : false;
    });
    next.splice(at < 0 ? next.length : at, 0, c.id);
  }
  if (recent.length) {
    const cur = currentId ? next.indexOf(currentId) : -1;
    next.splice(cur >= 0 ? cur + 1 : 0, 0, ...recent.map((c) => c.id));
  }
  return next;
}
