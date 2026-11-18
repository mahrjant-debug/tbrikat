import { useEffect, useState } from 'react';

/**
 * الوقت الحالي، يُعاد حسابه مرة عند حلول الوقت `at` (إغلاق تلقائي) فتتحدّث الصفحة المفتوحة بلا إعادة تحميل.
 * لا مؤقتات متكررة: مؤقت واحد فقط إلى حين الموعد.
 */
export function useNowAt(at: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!(at > 0)) return;
    const ms = at - Date.now();
    if (ms <= 0 || ms > 2_000_000_000) return;
    const t = window.setTimeout(() => setNow(Date.now()), ms + 50);
    return () => window.clearTimeout(t);
  }, [at]);
  return now;
}
