import type { Settings } from './types';

export const DEFAULT_CLOSING_MESSAGE =
  'شكراً لحضوركم ومشاركتكم الفرحة. انتهى استقبال التهاني، بارك الله للعرسان وجمع بينهما في خير.';

type ReceptionSettings = Pick<Settings, 'acceptingCongrats' | 'closeAt'>;

/** هل انتهى استقبال التهاني (يدوياً أو بحلول وقت الإغلاق التلقائي)؟ */
export function isReceptionClosed(s: ReceptionSettings, now: number): boolean {
  return !s.acceptingCongrats || (s.closeAt > 0 && now >= s.closeAt);
}

/** وضع الذكرى على الشاشة: دائماً، أو تلقائياً عند إغلاق الاستقبال */
export function isMemoryMode(s: ReceptionSettings & Pick<Settings, 'memoryMode'>, now: number): boolean {
  return s.memoryMode === 'on' || (s.memoryMode === 'auto' && isReceptionClosed(s, now));
}
