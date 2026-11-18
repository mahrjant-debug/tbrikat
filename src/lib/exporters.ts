import { formatGregorian, formatHijri } from './dates';
import type { Congrat, Settings } from './types';

const STATUS_AR: Record<string, string> = { approved: 'معتمدة', pending: 'قيد المراجعة', hidden: 'مخفية' };

const pad = (n: number) => String(n).padStart(2, '0');
function fmtTime(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** خلية CSV: تُحمى من حقن الصيغ في Excel (= + - @) ومن فواصل الأسطر */
function cell(v: unknown): string {
  let s = String(v ?? '').replace(/\r?\n/g, ' ');
  if (/^[=+\-@\t]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

/** CSV بترميز UTF-8 مع BOM ليفتح Excel العربية صحيحة */
export function toCsv(list: Congrat[]): string {
  const rows = [['الرقم', 'الاسم', 'نص التهنئة', 'الحالة', 'وقت الإرسال', 'وقت الاعتماد'].map(cell).join(',')];
  list.forEach((c, i) => {
    rows.push(
      [i + 1, c.name, c.text, STATUS_AR[c.status] ?? c.status, fmtTime(c.createdAt), c.approvedAt ? fmtTime(c.approvedAt) : '']
        .map(cell)
        .join(','),
    );
  });
  return '\ufeff' + rows.join('\r\n') + '\r\n';
}

export function downloadText(filename: string, text: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * «كتاب التهاني»: صفحة HTML مستقلة جاهزة للطباعة (A4) أو الحفظ PDF؛ بالترتيب الزمني، مع غلاف باسم العرسان.
 * تفتح نافذة الطباعة تلقائياً. كل النصوص تُهرَّب فلا يدخل HTML من الضيوف.
 */
export function buildBookHtml(list: Congrat[], settings: Pick<Settings, 'names' | 'title' | 'gregorianDate' | 'hijriDate' | 'hall'>): string {
  const g = formatGregorian(settings.gregorianDate);
  const h = formatHijri(settings.gregorianDate, settings.hijriDate);
  const dateLine = [g ? `${g.dayName} ${g.full}` : '', h ?? ''].filter(Boolean).join(' — ');
  const cards = list
    .map(
      (c) => `<article class="card"><p class="text">“${esc(c.text)}”</p><div class="by"><span class="name">${esc(c.name)}</span><span class="time">${esc(fmtTime(c.approvedAt ?? c.createdAt))}</span></div></article>`,
    )
    .join('\n');
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>كتاب التهاني — ${esc(settings.names)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@600;800&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Amiri', 'Cairo', 'Traditional Arabic', serif; color: #2b2112; background: #fff; }
  .cover { min-height: 250mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; page-break-after: always; border: 3px double #c99a3b; padding: 20mm; }
  .cover h1 { font-family: 'Cairo', sans-serif; font-weight: 800; font-size: 40pt; margin: 0 0 8mm; color: #8a6414; }
  .cover .title { font-family: 'Cairo', sans-serif; font-size: 20pt; margin: 0 0 6mm; }
  .cover .date { font-size: 15pt; color: #5c4a22; margin: 0 0 4mm; }
  .cover .count { font-family: 'Cairo', sans-serif; font-size: 13pt; color: #8a6414; margin-top: 12mm; }
  .card { break-inside: avoid; page-break-inside: avoid; border-right: 4px solid #c99a3b; background: #fbf6e8; padding: 5mm 6mm; margin: 0 0 5mm; border-radius: 3mm; }
  .text { font-size: 15pt; line-height: 1.9; margin: 0 0 3mm; white-space: pre-line; }
  .by { display: flex; justify-content: space-between; gap: 6mm; font-family: 'Cairo', sans-serif; font-size: 10.5pt; color: #6b5a30; }
  .name { font-weight: 800; color: #8a6414; }
  .time { direction: ltr; }
  .note { text-align: center; font-family: 'Cairo', sans-serif; font-size: 9pt; color: #8a7a52; margin-top: 8mm; }
  @media screen { body { max-width: 190mm; margin: 0 auto; padding: 8mm; } }
</style>
</head>
<body>
<section class="cover">
  <h1>${esc(settings.names)}</h1>
  <p class="title">${esc(settings.title)}</p>
  ${dateLine ? `<p class="date">${esc(dateLine)}</p>` : ''}
  ${settings.hall ? `<p class="date">${esc(settings.hall)}</p>` : ''}
  <p class="count">كتاب التهاني — ${list.length} تهنئة</p>
</section>
<main>
${cards}
</main>
<p class="note">للحفظ كملف PDF: اختر «حفظ كـ PDF» من نافذة الطباعة.</p>
<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 700); });</script>
</body>
</html>`;
}
