import { useState, type FormEvent } from 'react';
import { Clock, Loader2, Megaphone, PanelTop, Pencil, Play, Plus, Repeat, Square, Trash2, Tv } from 'lucide-react';
import { ANNOUNCE_STYLES, AnnouncementPreview } from '../../components/display/AnnouncementView';
import { Button, ConfirmDialog, Field, Modal, inputCls, useToast } from '../../components/ui';
import { postBus } from '../../lib/channel';
import {
  ANNOUNCE_BANNER_TEXT_MAX,
  ANNOUNCE_MAX_SEC,
  ANNOUNCE_MIN_SEC,
  ANNOUNCE_STOP,
  ANNOUNCE_TEXT_MAX,
  ANNOUNCE_TITLE_MAX,
} from '../../lib/constants';
import { fromLocalInput, toLocalInput } from '../../lib/dates';
import { addAnnouncement, deleteAnnouncement, triggerAnnouncement, updateAnnouncement } from '../../lib/db';
import { handleFirestoreError } from '../../lib/firebase';
import type { AnnounceMode, AnnounceStyle, Announcement } from '../../lib/types';

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m && s) return `${m} د و${s} ث`;
  return m ? `${m} د` : `${s} ث`;
}

function fmtWhen(ms: number): string {
  return new Date(ms).toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' });
}

export function AnnouncementsTab({ announcements }: { announcements: Announcement[] }) {
  const toast = useToast();
  const [editing, setEditing] = useState<Announcement | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Announcement | null>(null);

  const publish = async (id: string, okMsg: string) => {
    try {
      const at = await triggerAnnouncement(id);
      postBus({ type: 'announce', id, at });
      toast.success(okMsg);
    } catch (e) {
      handleFirestoreError('announce-trigger', e);
      toast.error('تعذّر إرسال الأمر.');
    }
  };

  const list = [...announcements].reverse(); // الأحدث أولاً

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm leading-7 text-ink-soft">
          اكتب الإعلان واختر تصميمه ومدته، ثم اضغط <span className="font-bold">▶ نشر الآن</span> ليظهر على الشاشة الرئيسية خلال ثانية. الإنشاء وحده لا يُظهر شيئاً.
          الإعلان بملء الشاشة يوقف صندوق التهاني والفيديو مؤقتاً ثم يستأنفان بعده، أما الشريط العلوي فتستمر التهاني تحته.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => void publish(ANNOUNCE_STOP, 'سُحب الإعلان الجاري')}>
            <Square size={15} /> إيقاف الإعلان الجاري
          </Button>
          <Button onClick={() => setEditing('new')}>
            <Plus size={16} /> إعلان جديد
          </Button>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line py-14 text-center font-bold text-ink-soft">لا توجد إعلانات بعد.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((a) => {
            const look = ANNOUNCE_STYLES[a.style];
            const Icon = look.Icon;
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                  style={{ background: look.swatch }}
                  aria-hidden="true"
                >
                  <Icon size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-cairo font-extrabold text-ink">{a.title || a.text}</div>
                  {a.title ? <div className="line-clamp-2 text-sm text-ink-soft">{a.text}</div> : null}
                  <div className="mt-1 flex flex-wrap gap-1.5 text-xs font-bold">
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-accent">
                      {a.mode === 'full' ? <Tv size={12} /> : <PanelTop size={12} />}
                      {a.mode === 'full' ? 'ملء الشاشة' : 'شريط علوي'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                      <Clock size={12} /> {fmtDuration(a.durationSec)}
                    </span>
                    {a.repeatEveryMin > 0 && a.repeatUntil > 0 ? (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${a.repeatUntil > Date.now() ? 'bg-sky-100 text-sky-900' : 'bg-gray-100 text-gray-600'}`}>
                        <Repeat size={12} /> كل {a.repeatEveryMin} د حتى {fmtWhen(a.repeatUntil)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center">
                  <Button onClick={() => void publish(a.id, `نُشر الإعلان على الشاشة (${fmtDuration(a.durationSec)})`)} title="نشر الآن على الشاشة الرئيسية">
                    <Play size={15} /> نشر الآن
                  </Button>
                  <button type="button" aria-label="تعديل" onClick={() => setEditing(a)} className="rounded-lg p-2 text-accent hover:bg-accent-soft">
                    <Pencil size={16} />
                  </button>
                  <button type="button" aria-label="حذف" onClick={() => setDeleting(a)} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'إعلان جديد' : 'تعديل الإعلان'} wide>
        {editing ? (
          <AnnouncementForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? null : editing}
            onCancel={() => setEditing(null)}
            onDone={() => {
              setEditing(null);
              toast.success('تم الحفظ. اضغط «نشر الآن» ليظهر على الشاشة.');
            }}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="حذف الإعلان"
        message={`سيُحذف «${deleting?.title || deleting?.text.slice(0, 40) || ''}»، وإن كان ظاهراً الآن على الشاشة فسيُسحب فوراً.`}
        confirmLabel="حذف"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          const a = deleting;
          setDeleting(null);
          if (!a) return;
          try {
            await deleteAnnouncement(a.id);
            toast.success('تم الحذف');
          } catch (e) {
            handleFirestoreError('announce-delete', e);
            toast.error('تعذّر الحذف.');
          }
        }}
      />
    </section>
  );
}

function AnnouncementForm({ initial, onCancel, onDone }: { initial: Announcement | null; onCancel: () => void; onDone: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [text, setText] = useState(initial?.text ?? '');
  const [style, setStyle] = useState<AnnounceStyle>(initial?.style ?? 'gold');
  const [mode, setMode] = useState<AnnounceMode>(initial?.mode ?? 'full');
  const [minutes, setMinutes] = useState(String(Math.floor((initial?.durationSec ?? 30) / 60)));
  const [seconds, setSeconds] = useState(String((initial?.durationSec ?? 30) % 60));
  const [every, setEvery] = useState(initial && initial.repeatEveryMin > 0 ? String(initial.repeatEveryMin) : '');
  const [until, setUntil] = useState(initial && initial.repeatUntil > 0 ? toLocalInput(initial.repeatUntil) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const textMax = mode === 'banner' ? ANNOUNCE_BANNER_TEXT_MAX : ANNOUNCE_TEXT_MAX;
  const len = text.trim().length;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const cleanText = text.trim();
    const cleanTitle = title.trim().replace(/\s+/g, ' ');
    if (!cleanText) return setError('اكتب نص الإعلان.');
    if (cleanText.length > ANNOUNCE_TEXT_MAX) return setError(`النص يجب ألا يتجاوز ${ANNOUNCE_TEXT_MAX} حرفاً.`);
    if (mode === 'banner' && cleanText.length > ANNOUNCE_BANNER_TEXT_MAX) {
      return setError(`الشريط العلوي يتسع لـ ${ANNOUNCE_BANNER_TEXT_MAX} حرفاً؛ اختر «ملء الشاشة» للنص الأطول.`);
    }
    if (cleanTitle.length > ANNOUNCE_TITLE_MAX) return setError(`العنوان يجب ألا يتجاوز ${ANNOUNCE_TITLE_MAX} حرفاً.`);

    const m = minutes.trim() === '' ? 0 : Number(minutes);
    const s = seconds.trim() === '' ? 0 : Number(seconds);
    if (!Number.isInteger(m) || !Number.isInteger(s) || m < 0 || s < 0) return setError('اكتب المدة بأرقام صحيحة للدقائق والثواني.');
    const durationSec = m * 60 + s;
    if (durationSec < ANNOUNCE_MIN_SEC || durationSec > ANNOUNCE_MAX_SEC) {
      return setError(`المدة من ${ANNOUNCE_MIN_SEC} ثوانٍ إلى ${ANNOUNCE_MAX_SEC / 60} دقيقة.`);
    }

    let repeatEveryMin = 0;
    let repeatUntil = 0;
    if (every.trim() !== '') {
      repeatEveryMin = Number(every);
      if (!Number.isInteger(repeatEveryMin) || repeatEveryMin < 1 || repeatEveryMin > 1440) return setError('الفاصل بين التكرار من 1 إلى 1440 دقيقة.');
      if (!until) return setError('حدّد وقت انتهاء التكرار.');
      repeatUntil = fromLocalInput(until);
      if (repeatUntil <= Date.now() && repeatUntil !== initial?.repeatUntil) return setError('اختر وقت انتهاء في المستقبل.');
    }

    setBusy(true);
    setError('');
    try {
      const data = { title: cleanTitle, text: cleanText, style, mode, durationSec, repeatEveryMin, repeatUntil };
      if (initial) await updateAnnouncement(initial.id, { ...data });
      else await addAnnouncement(data);
      onDone();
    } catch (err) {
      handleFirestoreError('announce-save', err);
      setError('تعذّر الحفظ. تحقق من الاتصال وصلاحياتك.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <AnnouncementPreview title={title} text={text} style={style} mode={mode} />

      <div>
        <span className="mb-1 block text-sm font-bold text-ink">التصميم</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="التصميم">
          {(Object.keys(ANNOUNCE_STYLES) as AnnounceStyle[]).map((id) => {
            const l = ANNOUNCE_STYLES[id];
            const Icon = l.Icon;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={style === id}
                onClick={() => setStyle(id)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${style === id ? 'border-accent ring-2 ring-accent/40' : 'border-line hover:bg-accent-soft'}`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ background: l.swatch }}>
                  <Icon size={15} />
                </span>
                {l.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <span className="mb-1 block text-sm font-bold text-ink">طريقة العرض</span>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="طريقة العرض">
          {(
            [
              ['full', 'ملء الشاشة', 'للإعلانات المهمة؛ يوقف التهاني والفيديو مؤقتاً', Tv],
              ['banner', 'شريط علوي', 'تستمر التهاني تحته (حتى 250 حرفاً)', PanelTop],
            ] as const
          ).map(([id, label, hint, Icon]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={mode === id}
              onClick={() => setMode(id)}
              className={`rounded-xl border px-3 py-2 text-start transition ${mode === id ? 'border-accent ring-2 ring-accent/40' : 'border-line hover:bg-accent-soft'}`}
            >
              <span className="flex items-center gap-2 text-sm font-bold text-ink">
                <Icon size={16} /> {label}
              </span>
              <span className="block text-xs text-ink-soft">{hint}</span>
            </button>
          ))}
        </div>
      </div>

      <Field label="العنوان (اختياري)">
        <input className={inputCls} value={title} maxLength={ANNOUNCE_TITLE_MAX} onChange={(e) => setTitle(e.target.value)} autoComplete="off" placeholder="مثال: تنبيه، إعلان هام" />
      </Field>

      <Field label="نص الإعلان" hint={`${len} / ${textMax} حرف${mode === 'banner' ? ' (الشريط)' : ''}`}>
        <textarea className={inputCls} rows={mode === 'banner' ? 3 : 6} value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب الإعلان هنا…" />
      </Field>
      {len > textMax ? <p className="text-xs font-bold text-red-700">تجاوزتَ الحد بـ {len - textMax} حرفاً.</p> : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label="مدة الظهور: دقائق">
          <input type="number" inputMode="numeric" min={0} max={60} dir="ltr" className={inputCls} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </Field>
        <Field label="مدة الظهور: ثوانٍ" hint={`الحد الأدنى ${ANNOUNCE_MIN_SEC} ثوانٍ، والأقصى ساعة`}>
          <input type="number" inputMode="numeric" min={0} max={59} dir="ltr" className={inputCls} value={seconds} onChange={(e) => setSeconds(e.target.value)} />
        </Field>
      </div>

      <div className="rounded-xl border border-line bg-white/60 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
          <Repeat size={16} /> إعادة إظهار الإعلان (اختياري)
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="كل كم دقيقة؟" hint="اتركه فارغاً لإظهاره مرة واحدة عند كل نشر">
            <input type="number" inputMode="numeric" min={1} max={1440} dir="ltr" className={inputCls} value={every} onChange={(e) => setEvery(e.target.value)} placeholder="مثال: 10" />
          </Field>
          <Field label="حتى متى؟" hint="بتوقيت هذا الجهاز؛ ويتوقف التكرار بزر «إيقاف الإعلان الجاري»">
            <input type="datetime-local" dir="ltr" className={inputCls} value={until} onChange={(e) => setUntil(e.target.value)} disabled={every.trim() === ''} />
          </Field>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          إلغاء
        </Button>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />} حفظ
        </button>
      </div>
    </form>
  );
}
