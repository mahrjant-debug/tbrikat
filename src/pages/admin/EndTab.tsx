import { useEffect, useState } from 'react';
import { BookOpen, Clock, FileSpreadsheet, Loader2, Lock, LockOpen, Sparkles } from 'lucide-react';
import { Button, ConfirmDialog, Field, inputCls, useToast } from '../../components/ui';
import { useNowAt } from '../../hooks/useReception';
import { fromLocalInput, toLocalInput } from '../../lib/dates';
import { fetchAllCongrats, patchSettings } from '../../lib/db';
import { buildBookHtml, downloadText, toCsv } from '../../lib/exporters';
import { handleFirestoreError } from '../../lib/firebase';
import { DEFAULT_CLOSING_MESSAGE, isReceptionClosed } from '../../lib/reception';
import type { Congrat, Settings } from '../../lib/types';

const stamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

const fmtWhen = (ms: number) => new Date(ms).toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' });

const MEMORY_OPTIONS: { id: Settings['memoryMode']; label: string; hint: string }[] = [
  { id: 'auto', label: 'تلقائي', hint: 'تتحول الشاشة إلى الذكرى عند إنهاء استقبال التهاني (الموصى به)' },
  { id: 'on', label: 'تشغيل دائم', hint: 'وضع الذكرى الآن بغض النظر عن حالة الاستقبال' },
  { id: 'off', label: 'إيقاف', hint: 'تبقى الشاشة بوضعها الحي دائماً' },
];

export function EndTab({ settings }: { settings: Settings }) {
  const toast = useToast();
  const now = useNowAt(settings.closeAt);
  const closed = isReceptionClosed(settings, now);

  const [confirmClose, setConfirmClose] = useState(false);
  const [closeAtInput, setCloseAtInput] = useState(settings.closeAt > 0 ? toLocalInput(settings.closeAt) : '');
  const [msg, setMsg] = useState(settings.closingMessage);
  const [scope, setScope] = useState<'approved' | 'all'>('approved');
  const [busy, setBusy] = useState<'csv' | 'book' | null>(null);

  useEffect(() => setCloseAtInput(settings.closeAt > 0 ? toLocalInput(settings.closeAt) : ''), [settings.closeAt]);
  useEffect(() => setMsg(settings.closingMessage), [settings.closingMessage]);

  const patch = async (p: Partial<Settings>, okMsg: string) => {
    try {
      await patchSettings(p);
      toast.success(okMsg);
    } catch (e) {
      handleFirestoreError('end-settings', e);
      toast.error('تعذّر الحفظ.');
    }
  };

  const saveCloseAt = async () => {
    const ms = fromLocalInput(closeAtInput);
    if (!ms || ms <= Date.now()) return toast.error('اختر وقتاً في المستقبل.');
    await patch({ closeAt: ms }, `سيُغلق الاستقبال تلقائياً في ${fmtWhen(ms)}`);
  };

  const exportData = async (kind: 'csv' | 'book') => {
    setBusy(kind);
    try {
      const all = await fetchAllCongrats();
      const list: Congrat[] = scope === 'approved' ? all.filter((c) => c.status === 'approved') : all;
      if (!list.length) {
        toast.info('لا توجد تهانٍ للتصدير.');
        return;
      }
      if (kind === 'csv') {
        downloadText(`congratulations-${stamp()}.csv`, toCsv(list), 'text/csv;charset=utf-8');
        toast.success(`نُزّل ملف Excel/CSV بـ ${list.length} تهنئة`);
      } else {
        const chrono = [...list].sort((a, b) => (a.approvedAt ?? a.createdAt) - (b.approvedAt ?? b.createdAt));
        const html = buildBookHtml(chrono, settings);
        const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
        const w = window.open(url, '_blank');
        if (!w) {
          // حاجب النوافذ المنبثقة: ننزّل الملف ليُفتح من المتصفح
          downloadText(`book-${stamp()}.html`, html, 'text/html;charset=utf-8');
          toast.info('نُزّل «كتاب التهاني» كملف HTML؛ افتحه ثم اطبعه أو احفظه PDF.');
        } else {
          toast.success(`فُتح «كتاب التهاني» (${list.length} تهنئة)؛ اختر «حفظ كـ PDF» من نافذة الطباعة.`);
        }
        window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
      }
    } catch (e) {
      handleFirestoreError('export', e);
      toast.error('تعذّر التصدير. تحقق من الاتصال.');
    } finally {
      setBusy(null);
    }
  };

  const card = 'space-y-3 rounded-2xl border border-line bg-white p-4';

  return (
    <section className="space-y-5">
      {/* 1) إنهاء الاستقبال */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-cairo text-lg font-extrabold text-ink">استقبال التهاني</h2>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${closed ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}
            role="status"
          >
            {closed ? <Lock size={14} /> : <LockOpen size={14} />}
            {closed ? 'الاستقبال مغلق' : settings.closeAt > 0 ? `مفتوح — يُغلق تلقائياً ${fmtWhen(settings.closeAt)}` : 'الاستقبال مفتوح'}
          </span>
        </div>
        <p className="text-sm leading-7 text-ink-soft">
          عند الإغلاق لا يستطيع أحد إرسال تهنئة جديدة (يُفرض في قاعدة البيانات نفسها لا في الصفحة فقط)، وتعرض صفحة الضيف رسالة شكر. تصل التغييرات إلى
          الضيوف عند فتحهم الصفحة، لكن الإرسال نفسه يُرفض فور الإغلاق.
        </p>
        <div className="flex flex-wrap gap-2">
          {closed && settings.acceptingCongrats && settings.closeAt > 0 ? (
            <Button variant="ghost" onClick={() => void patch({ closeAt: 0 }, 'أُلغي موعد الإغلاق التلقائي وأُعيد فتح الاستقبال')}>
              <LockOpen size={16} /> إعادة فتح الاستقبال
            </Button>
          ) : closed ? (
            <Button variant="ghost" onClick={() => void patch({ acceptingCongrats: true, closeAt: 0 }, 'أُعيد فتح استقبال التهاني')}>
              <LockOpen size={16} /> إعادة فتح الاستقبال
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setConfirmClose(true)}>
              <Lock size={16} /> إنهاء الاستقبال الآن
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="إغلاق تلقائي في (اختياري)" hint="بتوقيت هذا الجهاز؛ يُغلق الاستقبال وحده في هذا الوقت">
            <input type="datetime-local" dir="ltr" className={inputCls} value={closeAtInput} onChange={(e) => setCloseAtInput(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button disabled={!closeAtInput} onClick={() => void saveCloseAt()}>
              <Clock size={16} /> حفظ الموعد
            </Button>
            {settings.closeAt > 0 ? (
              <Button variant="ghost" onClick={() => void patch({ closeAt: 0 }, 'أُلغي موعد الإغلاق التلقائي')}>
                إلغاء الموعد
              </Button>
            ) : null}
          </div>
        </div>

        <Field label="رسالة الشكر (اختيارية)" hint="تظهر في صفحة الضيف وعلى شاشة العرض بعد الإغلاق. الفارغ = الرسالة الافتراضية">
          <textarea className={inputCls} rows={3} maxLength={300} value={msg} placeholder={DEFAULT_CLOSING_MESSAGE} onChange={(e) => setMsg(e.target.value)} />
        </Field>
        <Button disabled={msg === settings.closingMessage} onClick={() => void patch({ closingMessage: msg.trim().slice(0, 300) }, 'حُفظت رسالة الشكر')}>
          حفظ الرسالة
        </Button>
      </div>

      {/* 2) وضع الذكرى */}
      <div className={card}>
        <h2 className="flex items-center gap-2 font-cairo text-lg font-extrabold text-ink">
          <Sparkles size={18} className="text-gold-deep" /> وضع الذكرى على الشاشة
        </h2>
        <p className="text-sm leading-7 text-ink-soft">
          تتحول الشاشة إلى «شكراً لحضوركم»: يحلّ صندوق الشكر محل رمز QR، وتستمر التهاني وصور العرسان بالدوران، ويتوقف الفيديو والإعلانات وشاشة الشريك.
        </p>
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="وضع الذكرى">
          {MEMORY_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={settings.memoryMode === o.id}
              onClick={() => void patch({ memoryMode: o.id }, `وضع الذكرى: ${o.label}`)}
              className={`rounded-xl border px-3 py-2 text-start transition ${settings.memoryMode === o.id ? 'border-accent ring-2 ring-accent/40' : 'border-line hover:bg-accent-soft'}`}
            >
              <span className="block text-sm font-bold text-ink">{o.label}</span>
              <span className="block text-xs text-ink-soft">{o.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3) التصدير */}
      <div className={card}>
        <h2 className="font-cairo text-lg font-extrabold text-ink">تصدير التهاني (قبل أي حذف)</h2>
        <p className="text-sm leading-7 text-ink-soft">
          يُقرأ كل التهاني مرة واحدة من قاعدة البيانات (قراءة لكل تهنئة)، لا من قائمة المراجعة المحدودة بآخر 600.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-ink">
          <label className="flex items-center gap-2">
            <input type="radio" name="scope" checked={scope === 'approved'} onChange={() => setScope('approved')} /> المعتمدة فقط
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} /> الكل (مع قيد المراجعة والمخفية)
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy !== null} onClick={() => void exportData('csv')}>
            {busy === 'csv' ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />} تنزيل Excel (CSV)
          </Button>
          <Button variant="soft" disabled={busy !== null} onClick={() => void exportData('book')}>
            {busy === 'book' ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />} كتاب التهاني (طباعة / PDF)
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmClose}
        title="إنهاء استقبال التهاني"
        message="لن يستطيع أي ضيف إرسال تهنئة جديدة، وستتحول الشاشة إلى وضع الذكرى (إن كان على «تلقائي»). يمكنك إعادة فتح الاستقبال في أي وقت."
        confirmLabel="إنهاء الاستقبال"
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false);
          void patch({ acceptingCongrats: false }, 'أُنهي استقبال التهاني');
        }}
      />
    </section>
  );
}
