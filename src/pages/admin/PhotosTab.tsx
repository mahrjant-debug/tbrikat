import { useRef, useState } from 'react';
import { ArrowRight, ArrowLeft, ImagePlus, Loader2, Play, Trash2 } from 'lucide-react';
import { Button, ConfirmDialog, useToast } from '../../components/ui';
import { postBus } from '../../lib/channel';
import { addPhoto, deleteAllPhotos, deletePhoto, swapOrder, triggerSpotlight, updatePhotoName } from '../../lib/db';
import { handleFirestoreError } from '../../lib/firebase';
import { PHOTO_OPTS, compressImage } from '../../lib/image';
import type { Photo } from '../../lib/types';

function kb(dataUrl: string): number {
  return Math.round((dataUrl.length * 0.75) / 1024);
}

export function PhotosTab({ photos }: { photos: Photo[] }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Photo | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    let order = photos.reduce((m, p) => Math.max(m, p.order), 0);
    let ok = 0;
    for (const file of Array.from(files)) {
      try {
        const dataUrl = await compressImage(file, PHOTO_OPTS);
        order += 1;
        await addPhoto(dataUrl, order);
        ok += 1;
      } catch (e) {
        handleFirestoreError('photo-add', e);
        toast.error(`${file.name}: ${e instanceof Error ? e.message : 'فشل الرفع'}`);
      }
    }
    if (fileRef.current) fileRef.current.value = '';
    setBusy(false);
    if (ok) toast.success(`تم رفع ${ok} صورة`);
  };

  const move = async (i: number, dir: -1 | 1) => {
    const a = photos[i];
    const b = photos[i + dir];
    if (!a || !b) return;
    try {
      // لو تساوى ترتيبهما نُفرّق بينهما
      const aOrder = a.order;
      const bOrder = b.order === a.order ? b.order + dir : b.order;
      await swapOrder('photos', { id: a.id, order: aOrder }, { id: b.id, order: bOrder });
    } catch (e) {
      handleFirestoreError('photo-move', e);
      toast.error('تعذّر تغيير الترتيب.');
    }
  };

  const spotlight = async (photoId: string) => {
    try {
      const at = await triggerSpotlight(photoId);
      postBus({ type: 'spotlight', photoId, at });
      toast.success('أُرسل أمر التسليط إلى شاشات العرض');
    } catch (e) {
      handleFirestoreError('spotlight', e);
      toast.error('تعذّر إرسال الأمر.');
    }
  };

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void onFiles(e.target.files)}
        />
        <Button disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
          {busy ? 'جارٍ الضغط والرفع…' : 'رفع صور'}
        </Button>
        <Button variant="soft" disabled={!photos.length} onClick={() => void spotlight('')}>
          <Play size={16} /> تسليط الضوء الآن (صورة تالية)
        </Button>
        <Button variant="danger" disabled={!photos.length} onClick={() => setConfirmAll(true)}>
          <Trash2 size={16} /> حذف الكل ({photos.length})
        </Button>
        <p className="text-xs text-ink-soft">تُضغط الصور تلقائياً (JPEG، أقصى بُعد 1200px، أقل من 180KB).</p>
      </div>

      {photos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line py-14 text-center font-bold text-ink-soft">لا توجد صور بعد.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {photos.map((p, i) => (
            <li key={p.id} className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
              {p.dataUrl ? (
                <img src={p.dataUrl} alt={`صورة ${i + 1}`} className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-gray-100 px-2 text-center text-xs font-bold text-ink-soft">
                  صورة بلا بيانات (من نظام قديم)
                </div>
              )}
              <input
                key={`${p.id}:${p.name}`}
                defaultValue={p.name}
                maxLength={50}
                placeholder="اسم صاحب الصورة"
                aria-label={`اسم صاحب الصورة ${i + 1}`}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== p.name) {
                    updatePhotoName(p.id, v).catch((err) => {
                      handleFirestoreError('photo-name', err);
                      toast.error('تعذّر حفظ الاسم.');
                    });
                  }
                }}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="w-full border-0 border-b border-line bg-transparent px-2 py-1.5 text-center text-sm font-bold text-ink outline-none placeholder:font-normal placeholder:text-ink-soft/60 focus:bg-accent-soft"
              />
              <div className="flex items-center justify-between gap-1 p-2">
                <span className="text-xs text-ink-soft tabular-nums">{kb(p.dataUrl)} KB</span>
                <div className="flex items-center">
                  <button type="button" aria-label="تقديم" disabled={i === 0} onClick={() => void move(i, -1)} className="rounded-lg p-1.5 text-ink hover:bg-accent-soft disabled:opacity-30">
                    <ArrowRight size={16} />
                  </button>
                  <button type="button" aria-label="تأخير" disabled={i === photos.length - 1} onClick={() => void move(i, 1)} className="rounded-lg p-1.5 text-ink hover:bg-accent-soft disabled:opacity-30">
                    <ArrowLeft size={16} />
                  </button>
                  <button type="button" aria-label="تسليط الضوء على هذه الصورة" onClick={() => void spotlight(p.id)} className="rounded-lg p-1.5 text-accent hover:bg-accent-soft">
                    <Play size={16} />
                  </button>
                  <button type="button" aria-label="حذف" onClick={() => setDeleting(p)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="حذف الصورة"
        message="سيتم حذف هذه الصورة نهائياً من شريط الصور."
        confirmLabel="حذف"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          const p = deleting;
          setDeleting(null);
          if (!p) return;
          try {
            await deletePhoto(p.id);
            toast.success('تم حذف الصورة');
          } catch (e) {
            handleFirestoreError('photo-delete', e);
            toast.error('تعذّر الحذف.');
          }
        }}
      />
      <ConfirmDialog
        open={confirmAll}
        title="حذف كل الصور"
        message={`سيتم حذف ${photos.length} صورة نهائياً من شريط الصور، ولا يمكن التراجع عن ذلك.`}
        confirmLabel="حذف الكل نهائياً"
        onCancel={() => setConfirmAll(false)}
        onConfirm={async () => {
          setConfirmAll(false);
          try {
            await deleteAllPhotos(photos.map((p) => p.id));
            toast.success('تم حذف كل الصور');
          } catch (e) {
            handleFirestoreError('photos-delete-all', e);
            toast.error('تعذّر حذف الصور.');
          }
        }}
      />
    </section>
  );
}
