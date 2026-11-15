import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { ArrowDown, ArrowUp, CalendarClock, Eye, EyeOff, GripVertical, Loader2, Pencil, Play, Plus, Square, Trash2, Video as VideoIcon, Volume2 } from 'lucide-react';
import { Button, ConfirmDialog, Field, Modal, Slider, Toggle, inputCls, useToast } from '../../components/ui';
import { postBus } from '../../lib/channel';
import { VIDEO_STOP } from '../../lib/constants';
import { addVideo, deleteVideo, patchVideoConfig, setVideoEnabled, setVideosOrder, swapOrder, triggerVideo, updateVideo } from '../../lib/db';
import { fromLocalInput, toLocalInput } from '../../lib/dates';
import { handleFirestoreError } from '../../lib/firebase';
import type { Video, VideoConfig } from '../../lib/types';
import { lastOccurrenceAt, nextOccurrenceAt } from '../../lib/videoSchedule';
import { checkVideo, parseYouTube, thumbnailUrl } from '../../lib/youtube';

function fmtSchedule(ms: number): string {
  return new Date(ms).toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' });
}

function ScheduleField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field
      label="موعد عرض مستقل (اختياري)"
      hint="يُعرض هذا الفيديو وحده في هذا التاريخ والوقت (بتوقيت هذا الجهاز) ثم تعود الشاشة للتهاني. اتركه فارغاً ليدخل في التناوب أو التشغيل اليدوي"
    >
      <div className="flex items-center gap-2">
        <input type="datetime-local" dir="ltr" className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
        {value ? (
          <Button variant="ghost" onClick={() => onChange('')}>
            مسح
          </Button>
        ) : null}
      </div>
    </Field>
  );
}

function DurationField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="مدة المقطع بالثواني (اختياري)" hint="يُعرض الفيديو هذه المدة فقط من لحظة بدئه ثم تعود الشاشة للتهاني. اتركه فارغاً ليُعرض حتى ينتهي">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={86400}
        step={1}
        dir="ltr"
        className={inputCls}
        value={value}
        placeholder="مثال: 30"
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

function RepeatFields({
  when,
  count,
  every,
  onCount,
  onEvery,
  until,
  onUntil,
}: {
  when: string;
  count: string;
  every: string;
  onCount: (v: string) => void;
  onEvery: (v: string) => void;
  until: string;
  onUntil: (v: string) => void;
}) {
  const many = Number(count) > 1;
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="عدد مرات العرض" hint={when ? '1 = مرة واحدة فقط' : 'كلما جاء دور الفيديو (بالتناوب أو بزر التشغيل) يُعرض هذا العدد من المرات. 1 = مرة'}>
        <input type="number" inputMode="numeric" min={1} max={100} step={1} dir="ltr" className={inputCls} value={count} onChange={(e) => onCount(e.target.value)} />
      </Field>
      {many ? (
        <Field label="الفاصل بين كل عرض والتالي (دقائق)" hint={when ? 'يُحسب من بداية العرض السابق' : 'من بداية العرض السابق، ويتوقف التكرار بزر «إيقاف الفيديو الجاري». لا يُحفظ عند إعادة تحميل الشاشة'}>
          <input type="number" inputMode="numeric" min={1} max={1440} step={1} dir="ltr" className={inputCls} value={every} onChange={(e) => onEvery(e.target.value)} />
        </Field>
      ) : null}
      <div className="col-span-2">
        <Field
          label="ينتهي العرض في (اختياري)"
          hint={
            when
              ? 'لا يُعرض الفيديو ولا يتكرر بعد هذا التاريخ والوقت (بتوقيت هذا الجهاز)، حتى لو لم يكتمل عدد المرات'
              : 'بعد هذا التاريخ والوقت يخرج الفيديو من التناوب التلقائي ولا يتكرر (يبقى التشغيل اليدوي متاحاً)'
          }
        >
          <div className="flex items-center gap-2">
            <input type="datetime-local" dir="ltr" className={inputCls} value={until} onChange={(e) => onUntil(e.target.value)} />
            {until ? (
              <Button variant="ghost" onClick={() => onUntil('')}>
                مسح
              </Button>
            ) : null}
          </div>
        </Field>
      </div>
    </div>
  );
}

function parseRepeat(v: string, min: number, max: number): number | null {
  const n = Math.round(Number(v));
  return v.trim() !== '' && Number.isFinite(n) && n >= min && n <= max ? n : null;
}

/** نص الإدخال → ثوانٍ صحيحة (فارغ = 0)، أو null إن كان غير صالح */
function parseDuration(v: string): number | null {
  if (v.trim() === '') return 0;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= 86400 ? n : null;
}

function fmtStart(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(s).padStart(2, '0')}`;
}

export function VideosTab({ videos, config }: { videos: Video[]; config: VideoConfig }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Video | null>(null);
  const [deleting, setDeleting] = useState<Video | null>(null);
  const [preview, setPreview] = useState<Video | null>(null);

  // مسودة محلية لجدولة العرض التلقائي؛ تُحفظ بزر (حتى لا تُكتب كل حركة للمنزلق)
  const [draft, setDraft] = useState({ enabled: config.enabled, intervalMin: config.intervalMin, maxMin: config.maxMin });
  useEffect(() => {
    setDraft({ enabled: config.enabled, intervalMin: config.intervalMin, maxMin: config.maxMin });
  }, [config.enabled, config.intervalMin, config.maxMin]);
  const dirty = draft.enabled !== config.enabled || draft.intervalMin !== config.intervalMin || draft.maxMin !== config.maxMin;

  const saveSchedule = async () => {
    try {
      await patchVideoConfig(draft);
      toast.success('تم حفظ إعدادات الفيديو');
    } catch (e) {
      handleFirestoreError('video-config', e);
      toast.error('تعذّر الحفظ.');
    }
  };

  const command = async (id: string, okMsg: string) => {
    try {
      const at = await triggerVideo(id);
      postBus({ type: 'video', videoId: id, at });
      toast.success(okMsg);
    } catch (e) {
      handleFirestoreError('video-trigger', e);
      toast.error('تعذّر إرسال الأمر.');
    }
  };

  const toggleEnabled = async (v: Video) => {
    try {
      await setVideoEnabled(v.id, !v.enabled);
      toast.success(v.enabled ? 'أُخفي الفيديو ولن يُعرض حتى تُظهره' : 'أُظهر الفيديو');
    } catch (e) {
      handleFirestoreError('video-enabled', e);
      toast.error('تعذّر التغيير.');
    }
  };

  const move = async (i: number, dir: -1 | 1) => {
    const a = videos[i];
    const b = videos[i + dir];
    if (!a || !b) return;
    try {
      const bOrder = b.order === a.order ? b.order + dir : b.order;
      await swapOrder('videos', { id: a.id, order: a.order }, { id: b.id, order: bOrder });
    } catch (e) {
      handleFirestoreError('video-move', e);
      toast.error('تعذّر تغيير الترتيب.');
    }
  };

  // نسخة محلية مرتبة تتبع السحب فوراً، وتُحفظ عند الإفلات
  const [items, setItems] = useState<Video[]>(videos);
  const itemsRef = useRef<Video[]>(videos);
  const draggingRef = useRef(false);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    if (!draggingRef.current) setItems(videos);
  }, [videos]);

  const persistOrder = async () => {
    draggingRef.current = false;
    const list = itemsRef.current;
    if (list.length === videos.length && list.every((v, i) => v.id === videos[i]?.id)) return;
    try {
      await setVideosOrder(list.map((v) => v.id));
    } catch (e) {
      handleFirestoreError('video-reorder', e);
      toast.error('تعذّر حفظ الترتيب.');
      setItems(videos);
    }
  };

  const nextOrder = videos.reduce((m, v) => Math.max(m, v.order), 0) + 1;

  return (
    <section className="space-y-5">
      <div className="space-y-3 rounded-2xl border border-line bg-white p-4">
        <h2 className="font-cairo text-lg font-extrabold text-ink">العرض التلقائي</h2>
        <Toggle
          checked={draft.enabled}
          onChange={(v) => setDraft((d) => ({ ...d, enabled: v }))}
          label="عرض الفيديوهات تلقائياً بالتناوب"
          hint="يظهر فيديو بملء الشاشة كل فترة بالترتيب أدناه، وتنتظر التهاني الجديدة وتظهر بعد انتهائه. الفيديوهات التي لها موعد مستقل لا تدخل في هذا التناوب"
        />
        <Field label="كل كم دقيقة؟">
          <Slider value={draft.intervalMin} min={1} max={60} suffix=" د" onChange={(v) => setDraft((d) => ({ ...d, intervalMin: v }))} />
        </Field>
        <Field label="أقصى مدة للفيديو" hint="يُقطع الفيديو عند هذه المدة وتعود الشاشة للتهاني. 0 = يُعرض حتى ينتهي. المدة المحددة للفيديو نفسه بالثواني تتقدم على هذا الحد">
          <Slider value={draft.maxMin} min={0} max={60} suffix=" د" onChange={(v) => setDraft((d) => ({ ...d, maxMin: v }))} />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={!dirty} onClick={() => void saveSchedule()}>
            حفظ
          </Button>
          <Button variant="ghost" onClick={() => void command(VIDEO_STOP, 'أُرسل أمر إيقاف الفيديو')}>
            <Square size={15} /> إيقاف الفيديو الجاري
          </Button>
        </div>
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">
          <Volume2 size={16} className="mt-1 shrink-0" />
          <span>
            لتشغيل الصوت: اضغط على شاشة العرض مرة واحدة قبل الحفل (أو اضغط زر «تفعيل الصوت» حين يظهر مع أول فيديو). تحتاج الشاشة إلى إنترنت لتشغيل يوتيوب،
            وإن تعذّر تشغيل فيديو لأي سبب تعود الشاشة للتهاني تلقائياً بعد قليل. ويمكن إيقاف الفيديو من شاشة العرض نفسها: حرّك المؤشر أو المس الشاشة ثم اضغط «إيقاف الفيديو»، أو اضغط Esc.
          </span>
        </p>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-cairo text-lg font-extrabold text-ink">الفيديوهات ({videos.length})</h2>
          <Button onClick={() => setAdding(true)}>
            <Plus size={16} /> إضافة فيديو
          </Button>
        </div>

        {videos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line py-14 text-center font-bold text-ink-soft">
            لا توجد فيديوهات. أضف رابط فيديو من يوتيوب.
          </p>
        ) : (
          <>
            <p className="mb-2 text-xs text-ink-soft">اسحب المقبض ⠿ لإعادة الترتيب (أو استخدم السهمين)، ويُحفظ الترتيب عند الإفلات.</p>
            <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-2">
              {items.map((v, i) => (
                <VideoRow
                  key={v.id}
                  v={v}
                  first={i === 0}
                  last={i === items.length - 1}
                  onDragStart={() => {
                    draggingRef.current = true;
                  }}
                  onDragEnd={() => void persistOrder()}
                  onPlay={() => void command(v.id, `أُرسل أمر تشغيل «${v.title || 'الفيديو'}» إلى شاشات العرض`)}
                  onPreview={() => setPreview(v)}
                  onToggle={() => void toggleEnabled(v)}
                  onMove={(dir) => void move(i, dir)}
                  onEdit={() => setEditing(v)}
                  onDelete={() => setDeleting(v)}
                />
              ))}
            </Reorder.Group>
          </>
        )}
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="إضافة فيديو من يوتيوب">
        {adding ? (
          <AddVideoForm
            existing={videos}
            order={nextOrder}
            onCancel={() => setAdding(false)}
            onDone={() => {
              setAdding(false);
              toast.success('أُضيف الفيديو');
            }}
          />
        ) : null}
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="تعديل الفيديو">
        {editing ? (
          <EditVideoForm
            key={editing.id}
            video={editing}
            onCancel={() => setEditing(null)}
            onDone={() => {
              setEditing(null);
              toast.success('تم الحفظ');
            }}
          />
        ) : null}
      </Modal>

      <Modal open={preview !== null} onClose={() => setPreview(null)} title={preview?.title || 'معاينة الفيديو'} wide>
        {preview ? (
          <div className="space-y-2">
            <VideoPreview videoId={preview.videoId} start={preview.start} />
            <p className="text-xs leading-6 text-ink-soft">
              معاينة خاصة بهذه اللوحة فقط، ولا تظهر على شاشة العرض.
              {preview.durationSec > 0 ? ` على الشاشة سيُعرض ${preview.durationSec} ثانية فقط من لحظة بدئه.` : ''}
            </p>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="حذف الفيديو"
        message={`سيُحذف «${deleting?.title || 'الفيديو'}» من القائمة (لا يتأثر الفيديو على يوتيوب).`}
        confirmLabel="حذف"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          const v = deleting;
          setDeleting(null);
          if (!v) return;
          try {
            await deleteVideo(v.id);
            toast.success('تم الحذف');
          } catch (e) {
            handleFirestoreError('video-delete', e);
            toast.error('تعذّر الحذف.');
          }
        }}
      />
    </section>
  );
}

function AddVideoForm({
  existing,
  order,
  onCancel,
  onDone,
}: {
  existing: Video[];
  order: number;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [dur, setDur] = useState('');
  const [rep, setRep] = useState('1');
  const [repEvery, setRepEvery] = useState('10');
  const [until, setUntil] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const parsed = parseYouTube(url);
    if ('error' in parsed) return setError(parsed.error);
    if (existing.some((v) => v.videoId === parsed.videoId)) return setError('هذا الفيديو مضاف بالفعل.');
    const scheduleAt = fromLocalInput(when);
    if (when && scheduleAt <= Date.now()) return setError('اختر موعداً في المستقبل.');
    const durationSec = parseDuration(dur);
    if (durationSec === null) return setError('اكتب مدة صحيحة بالثواني (من 0 إلى 86400).');
    const repeatCount = parseRepeat(rep, 1, 100);
    const repeatEveryMin = parseRepeat(repEvery, 1, 1440);
    if (repeatCount === null || repeatEveryMin === null) return setError('عدد مرات العرض من 1 إلى 100، والفاصل من 1 إلى 1440 دقيقة.');
    const repeatUntil = fromLocalInput(until);
    if (until && repeatUntil <= Date.now()) return setError('اختر تاريخ انتهاء في المستقبل.');
    if (until && when && repeatUntil < scheduleAt) return setError('تاريخ الانتهاء يجب أن يلي موعد العرض الأول.');

    setBusy(true);
    setError('');
    try {
      let finalTitle = title.trim();
      // بعد التحذير يعني الضغط مرة ثانية «حفظ رغم ذلك»
      if (!warning) {
        const check = await checkVideo(parsed.videoId);
        if (check.status === 'not-found') return setError('الفيديو غير موجود أو خاص أو محذوف. تحقق من الرابط.');
        if (check.status === 'blocked') {
          setWarning('صاحب الفيديو لا يسمح بتشغيله خارج يوتيوب غالباً، فقد لا يعمل على الشاشة. اختر فيديو آخر أو اضغط «حفظ رغم ذلك».');
          return;
        }
        if (check.status === 'ok' && !finalTitle) finalTitle = check.title;
      }
      await addVideo({ title: finalTitle.slice(0, 150), videoId: parsed.videoId, start: parsed.start, scheduleAt, durationSec, repeatCount, repeatEveryMin, repeatUntil: until ? repeatUntil : 0 }, order);
      onDone();
    } catch (err) {
      handleFirestoreError('video-add', err);
      setError('تعذّر الحفظ. تحقق من الاتصال وصلاحياتك.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <Field label="رابط الفيديو" hint="مثال: https://www.youtube.com/watch?v=... أو https://youtu.be/... ويُحفظ وقت البدء إن كان في الرابط (t=90)">
        <input
          type="url"
          dir="ltr"
          className={inputCls}
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError('');
            setWarning('');
            setShowPreview(false);
          }}
          autoFocus
          autoComplete="off"
        />
      </Field>
      <Field label="العنوان (اختياري)" hint="إن تركته فارغاً يُجلب عنوان الفيديو تلقائياً">
        <input className={inputCls} value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} autoComplete="off" />
      </Field>
      {(() => {
        const p = url.trim() ? parseYouTube(url) : null;
        if (!p || !('videoId' in p)) return null;
        return showPreview ? (
          <VideoPreview videoId={p.videoId} start={p.start} />
        ) : (
          <Button variant="soft" onClick={() => setShowPreview(true)}>
            <Eye size={16} /> معاينة الفيديو
          </Button>
        );
      })()}
      <ScheduleField value={when} onChange={setWhen} />
      <RepeatFields when={when} count={rep} every={repEvery} onCount={setRep} onEvery={setRepEvery} until={until} onUntil={setUntil} />
      <DurationField value={dur} onChange={setDur} />
      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}
      {warning ? (
        <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
          {warning}
        </p>
      ) : null}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          إلغاء
        </Button>
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <VideoIcon size={16} />} {warning ? 'حفظ رغم ذلك' : 'إضافة'}
        </button>
      </div>
    </form>
  );
}

function EditVideoForm({ video, onCancel, onDone }: { video: Video; onCancel: () => void; onDone: () => void }) {
  const [title, setTitle] = useState(video.title);
  const [when, setWhen] = useState(toLocalInput(video.scheduleAt));
  const [dur, setDur] = useState(video.durationSec > 0 ? String(video.durationSec) : '');
  const [rep, setRep] = useState(String(video.repeatCount));
  const [repEvery, setRepEvery] = useState(String(video.repeatEveryMin));
  const [until, setUntil] = useState(toLocalInput(video.repeatUntil));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const scheduleAt = fromLocalInput(when);
    // الموعد الماضي مقبول فقط إن لم يتغير (فيديو فائت موعده)؛ أي تغيير يجب أن يكون في المستقبل
    if (when && scheduleAt !== video.scheduleAt && scheduleAt <= Date.now()) return setError('اختر موعداً في المستقبل.');
    const durationSec = parseDuration(dur);
    if (durationSec === null) return setError('اكتب مدة صحيحة بالثواني (من 0 إلى 86400).');
    const repeatCount = parseRepeat(rep, 1, 100);
    const repeatEveryMin = parseRepeat(repEvery, 1, 1440);
    if (repeatCount === null || repeatEveryMin === null) return setError('عدد مرات العرض من 1 إلى 100، والفاصل من 1 إلى 1440 دقيقة.');
    const repeatUntil = fromLocalInput(until);
    if (until && repeatUntil !== video.repeatUntil && repeatUntil <= Date.now()) return setError('اختر تاريخ انتهاء في المستقبل.');
    if (until && when && repeatUntil < scheduleAt) return setError('تاريخ الانتهاء يجب أن يلي موعد العرض الأول.');
    setBusy(true);
    setError('');
    try {
      await updateVideo(video.id, { title: title.trim().slice(0, 150), scheduleAt: when ? scheduleAt : 0, durationSec, repeatCount, repeatEveryMin, repeatUntil: until ? repeatUntil : 0 });
      onDone();
    } catch (err) {
      handleFirestoreError('video-update', err);
      setError('تعذّر الحفظ. تحقق من الاتصال وصلاحياتك.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="العنوان">
        <input className={inputCls} value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </Field>
      <ScheduleField value={when} onChange={setWhen} />
      <RepeatFields when={when} count={rep} every={repEvery} onCount={setRep} onEvery={setRepEvery} until={until} onUntil={setUntil} />
      <DurationField value={dur} onChange={setDur} />
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
          {busy ? <Loader2 size={16} className="animate-spin" /> : null} حفظ
        </button>
      </div>
    </form>
  );
}

function VideoRow({
  v,
  first,
  last,
  onDragStart,
  onDragEnd,
  onPlay,
  onPreview,
  onToggle,
  onMove,
  onEdit,
  onDelete,
}: {
  v: Video;
  first: boolean;
  last: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onPlay: () => void;
  onPreview: () => void;
  onToggle: () => void;
  onMove: (dir: -1 | 1) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const controls = useDragControls();
  const next = nextOccurrenceAt(v, Date.now());
  return (
    <Reorder.Item
      value={v}
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      whileDrag={{ scale: 1.02, zIndex: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.18)' }}
      style={{ position: 'relative' }}
      className={`flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3 ${v.enabled ? '' : 'opacity-60'}`}
    >
      <button
        type="button"
        aria-label="اسحب لإعادة الترتيب"
        title="اسحب لإعادة الترتيب"
        onPointerDown={(e) => controls.start(e)}
        style={{ touchAction: 'none' }}
        className="cursor-grab rounded-lg p-1.5 text-ink-soft hover:bg-accent-soft active:cursor-grabbing"
      >
        <GripVertical size={20} />
      </button>
      <img src={thumbnailUrl(v.videoId)} alt="" loading="lazy" draggable={false} className="h-14 w-24 shrink-0 rounded-lg border border-line bg-black object-cover" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-cairo font-extrabold text-ink">{v.title || 'فيديو بلا عنوان'}</div>
        {!v.enabled ? (
          <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-700">
            <EyeOff size={12} /> مخفي — لا يُعرض
          </div>
        ) : null}
        <div dir="ltr" className="truncate text-start text-xs text-ink-soft">
          youtu.be/{v.videoId}
          {v.start > 0 ? ` · يبدأ من ${fmtStart(v.start)}` : ''}
          {v.durationSec > 0 ? ` · مدة العرض ${v.durationSec} ث` : ''}
        </div>
        {v.scheduleAt > 0 ? (
          <div
            className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
              next !== null ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <CalendarClock size={12} />
            {next !== null ? 'يُعرض: ' : 'مضى موعده: '}
            {fmtSchedule(next ?? lastOccurrenceAt(v))}
            {v.repeatCount > 1 ? ` · ${v.repeatCount} مرات كل ${v.repeatEveryMin} د` : ''}
            {v.repeatUntil > 0 ? ` · حتى ${fmtSchedule(v.repeatUntil)}` : ''}
          </div>
        ) : v.repeatCount > 1 || v.repeatUntil > 0 ? (
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-900">
            {v.repeatCount > 1 ? `يتكرر ${v.repeatCount} مرات كل ${v.repeatEveryMin} د` : 'يُعرض بالتناوب'}
            {v.repeatUntil > 0 ? ` · ${v.repeatUntil > Date.now() ? 'حتى' : 'انتهى في'} ${fmtSchedule(v.repeatUntil)}` : ''}
          </div>
        ) : null}
      </div>
      <div className="flex items-center">
        <button
          type="button"
          role="switch"
          aria-checked={v.enabled}
          aria-label={v.enabled ? 'إخفاء الفيديو (إيقاف عرضه)' : 'إظهار الفيديو'}
          title={v.enabled ? 'ظاهر: اضغط لإخفائه وإيقاف عرضه' : 'مخفي: اضغط لإظهاره'}
          onClick={onToggle}
          className={`relative me-2 h-6 w-11 shrink-0 rounded-full transition ${v.enabled ? 'bg-accent' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${v.enabled ? 'right-0.5' : 'right-[1.375rem]'}`} />
        </button>
        <button type="button" aria-label="معاينة الفيديو" title="معاينة هنا في اللوحة (لا تُرسل إلى الشاشة)" onClick={onPreview} className="rounded-lg p-2 text-accent hover:bg-accent-soft">
          <Eye size={16} />
        </button>
        <button type="button" aria-label="تشغيل الآن على الشاشة" title={v.enabled ? 'تشغيل الآن على الشاشة' : 'أظهر الفيديو أولاً'} disabled={!v.enabled} onClick={onPlay} className="rounded-lg p-2 text-accent hover:bg-accent-soft disabled:opacity-30">
          <Play size={16} />
        </button>
        <button type="button" aria-label="تقديم" disabled={first} onClick={() => onMove(-1)} className="rounded-lg p-2 hover:bg-accent-soft disabled:opacity-30">
          <ArrowUp size={16} />
        </button>
        <button type="button" aria-label="تأخير" disabled={last} onClick={() => onMove(1)} className="rounded-lg p-2 hover:bg-accent-soft disabled:opacity-30">
          <ArrowDown size={16} />
        </button>
        <button type="button" aria-label="تعديل" onClick={onEdit} className="rounded-lg p-2 text-accent hover:bg-accent-soft">
          <Pencil size={16} />
        </button>
        <button type="button" aria-label="حذف" onClick={onDelete} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
          <Trash2 size={16} />
        </button>
      </div>
    </Reorder.Item>
  );
}

/** مشغّل يوتيوب بأزرار التحكم الكاملة للمعاينة داخل اللوحة (يتوقف بإغلاق النافذة أو الإخفاء) */
function VideoPreview({ videoId, start }: { videoId: string; start: number }) {
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1${start > 0 ? `&start=${start}` : ''}`;
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <iframe
        title="معاينة الفيديو"
        src={src}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="h-full w-full border-0"
      />
    </div>
  );
}
