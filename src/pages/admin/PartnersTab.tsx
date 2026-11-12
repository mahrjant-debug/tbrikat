import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Handshake, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, ConfirmDialog, Field, Modal, inputCls, useToast } from '../../components/ui';
import { deletePartner, savePartner, swapOrder } from '../../lib/db';
import { handleFirestoreError } from '../../lib/firebase';
import { LOGO_OPTS, compressImage } from '../../lib/image';
import type { Partner } from '../../lib/types';

export function PartnersTab({ partners }: { partners: Partner[] }) {
  const toast = useToast();
  const [editing, setEditing] = useState<Partner | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Partner | null>(null);

  const move = async (i: number, dir: -1 | 1) => {
    const a = partners[i];
    const b = partners[i + dir];
    if (!a || !b) return;
    try {
      const bOrder = b.order === a.order ? b.order + dir : b.order;
      await swapOrder('partners', { id: a.id, order: a.order }, { id: b.id, order: bOrder });
    } catch (e) {
      handleFirestoreError('partner-move', e);
      toast.error('تعذّر تغيير الترتيب.');
    }
  };

  const nextOrder = partners.reduce((m, p) => Math.max(m, p.order), 0) + 1;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm text-ink-soft">يظهر شريكان في كل عرض ويتبدلان كل 5 ثوانٍ على الشاشة.</p>
        <Button onClick={() => setEditing('new')}>
          <Plus size={16} /> إضافة شريك
        </Button>
      </div>

      {partners.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line py-14 text-center font-bold text-ink-soft">لا يوجد شركاء بعد.</p>
      ) : (
        <ul className="space-y-2">
          {partners.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
              {p.logo ? (
                <img src={p.logo} alt="" className="h-14 w-14 rounded-xl border border-line object-contain" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Handshake size={24} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-cairo font-extrabold text-ink">{p.name}</div>
                <div className="truncate text-sm text-gold-deep">{p.category}</div>
              </div>
              <div className="flex items-center">
                <button type="button" aria-label="تقديم" disabled={i === 0} onClick={() => void move(i, -1)} className="rounded-lg p-2 hover:bg-accent-soft disabled:opacity-30">
                  <ArrowUp size={16} />
                </button>
                <button type="button" aria-label="تأخير" disabled={i === partners.length - 1} onClick={() => void move(i, 1)} className="rounded-lg p-2 hover:bg-accent-soft disabled:opacity-30">
                  <ArrowDown size={16} />
                </button>
                <button type="button" aria-label="تعديل" onClick={() => setEditing(p)} className="rounded-lg p-2 text-accent hover:bg-accent-soft">
                  <Pencil size={16} />
                </button>
                <button type="button" aria-label="حذف" onClick={() => setDeleting(p)} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'إضافة شريك' : 'تعديل الشريك'}>
        {editing ? (
          <PartnerForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? null : editing}
            onCancel={() => setEditing(null)}
            onSave={async (data) => {
              const id = editing === 'new' ? null : editing.id;
              setEditing(null);
              try {
                await savePartner(id, data, nextOrder);
                toast.success('تم الحفظ');
              } catch (e) {
                handleFirestoreError('partner-save', e);
                toast.error('تعذّر الحفظ.');
              }
            }}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="حذف الشريك"
        message={`سيتم حذف «${deleting?.name ?? ''}» من شركاء النجاح.`}
        confirmLabel="حذف"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          const p = deleting;
          setDeleting(null);
          if (!p) return;
          try {
            await deletePartner(p.id);
            toast.success('تم الحذف');
          } catch (e) {
            handleFirestoreError('partner-delete', e);
            toast.error('تعذّر الحذف.');
          }
        }}
      />
    </section>
  );
}

function PartnerForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Partner | null;
  onSave: (d: { name: string; category: string; logo: string }) => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [logo, setLogo] = useState(initial?.logo ?? '');
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <Field label="اسم الراعي">
        <input className={inputCls} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="الفئة" hint="مثال: الراعي الذهبي، شريك التقنية">
        <input className={inputCls} value={category} maxLength={40} onChange={(e) => setCategory(e.target.value)} />
      </Field>
      <div>
        <span className="mb-1 block text-sm font-bold text-ink">الشعار</span>
        <div className="flex items-center gap-3">
          {logo ? <img src={logo} alt="" className="h-16 w-16 rounded-xl border border-line object-contain" /> : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                setLogo(await compressImage(f, LOGO_OPTS));
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'تعذّر معالجة الصورة');
              }
              e.target.value = '';
            }}
          />
          <Button variant="soft" onClick={() => fileRef.current?.click()}>
            <ImagePlus size={16} /> {logo ? 'تغيير' : 'رفع شعار'}
          </Button>
          {logo ? (
            <Button variant="ghost" onClick={() => setLogo('')}>
              إزالة
            </Button>
          ) : null}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>
          إلغاء
        </Button>
        <Button disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), category: category.trim(), logo })}>
          حفظ
        </Button>
      </div>
    </div>
  );
}
