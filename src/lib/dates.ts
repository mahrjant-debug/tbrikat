function parseLocalDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatGregorian(value: string): { dayName: string; full: string } | null {
  const d = parseLocalDate(value);
  if (!d) return null;
  try {
    const dayName = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { weekday: 'long' }).format(d);
    const rest = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
    return { dayName, full: `${rest.replace(/\s*م$/, '')} م` };
  } catch {
    return null;
  }
}

/** التاريخ الهجري (أم القرى) محسوباً من الميلادي، أو النص اليدوي إن وُجد */
export function formatHijri(value: string, override: string): string | null {
  const manual = override.trim();
  if (manual) return manual;
  const d = parseLocalDate(value);
  if (!d) return null;
  try {
    const s = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
    return s.includes('هـ') ? s : `${s} هـ`;
  } catch {
    return null;
  }
}

export function splitDuration(ms: number): { days: number; hours: number; minutes: number; seconds: number } {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** من قيمة datetime-local إلى مللي ثانية (توقيت الجهاز) */
export function fromLocalInput(value: string): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function toLocalInput(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function timeAgo(ms: number): string {
  const diff = Math.max(0, Date.now() - ms);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}
