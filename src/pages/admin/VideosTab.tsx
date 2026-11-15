import { useEffect, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Loader2, Pencil, Play, Plus, Square, Trash2, Video as VideoIcon, Volume2 } from 'lucide-react';
import { Button, ConfirmDialog, Field, Modal, Slider, Toggle, inputCls, useToast } from '../../components/ui';
import { postBus } from '../../lib/channel';
import { VIDEO_STOP } from '../../lib/constants';
import { addVideo, deleteVideo, patchVideoConfig, swapOrder, triggerVideo, updateVideoTitle } from '../../lib/db';
import { handleFirestoreError } from '../../lib/firebase';
import type { Video, VideoConfig } from '../../lib/types';
import { checkVideo, parseYouTube, thumbnailUrl } from '../../lib/youtube';

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

  const nextOrder = videos.reduce((m, v) => Math.max(m, v.order), 0) + 1;

  return (
    <section className="space-y-5">
      <div className="space-y-3 rounded-2xl border border-line bg-white p-4">
        <h2 className="font-cairo text-lg font-extrabold text-ink">العرض التلقائي</h2>
        <Toggle
          checked={draft.enabled}
          onChange={(v) => setDraft((d) => ({ ...d, enabled: v }))}
          label="عرض الفيديوهات تلقائياً بالتناوب"
          hint="يظهر فيديو بملء الشاشة كل فترة بالترتيب أدناه، وتنتظر التهاني الجديدة وتظهر بعد انتهائه"
        />
        <Field label="كل كم دقيقة؟">
          <Slider value={draft.intervalMin} min={1} max={60} suffix=" د" onChange={(v) => setDraft((d) => ({ ...d, intervalMin: v }))} />
        </Field>
        <Field label="أقصى مدة للفيديو" hint="يُقطع الفيديو عند هذه المدة وتعود الشاشة للتهاني. 0 = يُعرض حتى ينتهي">
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
            وإن تعذّر تشغيل فيديو لأي سبب تعود الشاشة للتهاني تلقائياً بعد قليل.
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
          <ul className="space-y-2">
            {videos.map((v, i) => (
              <li key={v.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3">
                <img src={thumbnailUrl(v.videoId)} alt="" loading="lazy" className="h-14 w-24 shrink-0 rounded-lg border border-line bg-black object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-cairo font-extrabold text-ink">{v.title || 'فيديو بلا عنوان'}</div>
                  <div dir="ltr" className="truncate text-start text-xs text-ink-soft">
                    youtu.be/{v.videoId}
                    {v.start > 0 ? ` · يبدأ من ${fmtStart(v.start)}` : ''}
                  </div>
                </div>
                <div className="flex items-center">
                  <button type="button" aria-label="تشغيل الآن على الشاشة" title="تشغيل الآن على الشاشة" onClick={() => void command(v.id, `أُرسل أمر تشغيل «${v.title || 'الفيديو'}» إلى شاشات العرض`)} className="rounded-lg p-2 text-accent hover:bg-accent-soft">
                    <Play size={16} />
                  </button>
                  <button type="button" aria-label="تقديم" disabled={i === 0} onClick={() => void move(i, -1)} className="rounded-lg p-2 hover:bg-accent-soft disabled:opacity-30">
                    <ArrowUp size={16} />
                  </button>
                  <button type="button" aria-label="تأخير" disabled={i === videos.length - 1} onClick={() => void move(i, 1)} className="rounded-lg p-2 hover:bg-accent-soft disabled:opacity-30">
                    <ArrowDown size={16} />
                  </button>
                  <button type="button" aria-label="تعديل العنوان" onClick={() => setEditing(v)} className="rounded-lg p-2 text-accent hover:bg-accent-soft">
                    <Pencil size={16} />
                  </button>
                  <button type="button" aria-label="حذف" onClick={() => setDeleting(v)} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
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

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="تعديل عنوان الفيديو">
        {editing ? (
          <EditTitleForm
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const parsed = parseYouTube(url);
    if ('error' in parsed) return setError(parsed.error);
    if (existing.some((v) => v.videoId === parsed.videoId)) return setError('هذا الفيديو مضاف بالفعل.');

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
      await addVideo({ title: finalTitle.slice(0, 150), videoId: parsed.videoId, start: parsed.start }, order);
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
          }}
          autoFocus
          autoComplete="off"
        />
      </Field>
      <Field label="العنوان (اختياري)" hint="إن تركته فارغاً يُجلب عنوان الفيديو تلقائياً">
        <input className={inputCls} value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} autoComplete="off" />
      </Field>
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

function EditTitleForm({ video, onCancel, onDone }: { video: Video; onCancel: () => void; onDone: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState(video.title);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await updateVideoTitle(video.id, title.trim().slice(0, 150));
      onDone();
    } catch (err) {
      handleFirestoreError('video-title', err);
      toast.error('تعذّر الحفظ.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="العنوان">
        <input className={inputCls} value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </Field>
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
