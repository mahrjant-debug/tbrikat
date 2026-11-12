import { useMemo, useState } from 'react';
import { Check, EyeOff, Inbox, Pencil, Search, Trash2, TriangleAlert } from 'lucide-react';
import { Button, ConfirmDialog, Field, Modal, inputCls, useToast } from '../../components/ui';
import { findInWordList, normalizeArabic, type CompiledWordList } from '../../lib/arabic';
import { postBus } from '../../lib/channel';
import { NAME_MAX, TEXT_MAX } from '../../lib/constants';
import { timeAgo } from '../../lib/dates';
import { batchSetStatus, deleteCongrat, setCongratStatus, updateCongrat } from '../../lib/db';
import { handleFirestoreError } from '../../lib/firebase';
import type { Congrat, CongratStatus } from '../../lib/types';

const STATUS_TABS: { id: CongratStatus; label: string }[] = [
  { id: 'pending', label: 'قيد المراجعة' },
  { id: 'approved', label: 'معتمدة' },
  { id: 'hidden', label: 'مخفية' },
];

const CHIP: Record<CongratStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  hidden: 'bg-gray-200 text-gray-700',
};

const PAGE = 60;

export function CongratsTab({ list, banned }: { list: Congrat[]; banned: CompiledWordList }) {
  const toast = useToast();
  const [status, setStatus] = useState<CongratStatus>('pending');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<Congrat | null>(null);
  const [deleting, setDeleting] = useState<Congrat | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<CongratStatus, number> = { pending: 0, approved: 0, hidden: 0 };
    list.forEach((x) => (c[x.status] += 1));
    return c;
  }, [list]);

  const filtered = useMemo(() => {
    const q = normalizeArabic(search);
    return list.filter((c) => {
      if (c.status !== status) return false;
      if (!q) return true;
      return normalizeArabic(`${c.name} ${c.text}`).includes(q);
    });
  }, [list, status, search]);

  const pending = useMemo(() => list.filter((c) => c.status === 'pending'), [list]);
  const pendingFlagged = useMemo(
    () => pending.filter((c) => findInWordList(`${c.name} ${c.text}`, banned) !== null),
    [pending, banned],
  );

  const run = async (id: string, action: () => Promise<void>, ok: string) => {
    setBusyId(id);
    try {
      await action();
      toast.success(ok);
    } catch (e) {
      handleFirestoreError('admin-action', e);
      toast.error('تعذّر تنفيذ العملية. تحقق من الاتصال وصلاحياتك.');
    } finally {
      setBusyId(null);
    }
  };

  const approve = (c: Congrat) =>
    run(
      c.id,
      async () => {
        await setCongratStatus(c.id, 'approved');
        postBus({ type: 'approved', cards: [{ ...c, status: 'approved', approvedAt: Date.now() }] });
      },
      'تم اعتماد التهنئة',
    );

  const hide = (c: Congrat) => run(c.id, () => setCongratStatus(c.id, 'hidden'), 'تم إخفاء التهنئة');

  const doApproveAll = async () => {
    setConfirmAll(false);
    const items = pending.map((c) => ({
      id: c.id,
      status: (findInWordList(`${c.name} ${c.text}`, banned) !== null ? 'hidden' : 'approved') as CongratStatus,
    }));
    try {
      await batchSetStatus(items);
      const approvedIds = new Set(items.filter((i) => i.status === 'approved').map((i) => i.id));
      const now = Date.now();
      postBus({
        type: 'approved',
        cards: pending.filter((c) => approvedIds.has(c.id)).map((c) => ({ ...c, status: 'approved', approvedAt: now })),
      });
      toast.success(`اعتُمدت ${approvedIds.size} وأُخفيت ${items.length - approvedIds.size}`);
    } catch (e) {
      handleFirestoreError('approve-all', e);
      toast.error('تعذّر اعتماد الكل.');
    }
  };

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-line bg-white p-1" role="tablist" aria-label="حالة التهاني">
          {STATUS_TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={status === t.id}
              onClick={() => {
                setStatus(t.id);
                setLimit(PAGE);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                status === t.id ? 'bg-accent text-white' : 'text-ink hover:bg-accent-soft'
              }`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 text-xs tabular-nums ${status === t.id ? 'bg-white/25' : 'bg-accent-soft'}`}>
                {counts[t.id]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative min-w-[12rem] flex-1">
          <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو النص…"
            className={`${inputCls} ps-9`}
            aria-label="بحث"
          />
        </div>
        {status === 'pending' && pending.length > 0 ? (
          <Button variant="success" onClick={() => setConfirmAll(true)}>
            <Check size={16} /> اعتماد الكل ({pending.length})
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line py-14 text-ink-soft">
          <Inbox size={36} aria-hidden="true" />
          <p className="font-bold">لا توجد تهانٍ في هذه القائمة</p>
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {filtered.slice(0, limit).map((c) => {
            const flagged = findInWordList(`${c.name} ${c.text}`, banned) !== null;
            return (
              <li key={c.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-cairo font-extrabold text-ink">{c.name}</div>
                    <div className="text-xs text-ink-soft">{timeAgo(c.createdAt)}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {flagged ? (
                      <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                        <TriangleAlert size={12} /> كلمة محظورة
                      </span>
                    ) : null}
                    {c.displayDuration ? (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">{c.displayDuration} ث</span>
                    ) : null}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${CHIP[c.status]}`}>
                      {STATUS_TABS.find((t) => t.id === c.status)?.label}
                    </span>
                  </div>
                </div>
                <p className="mb-3 whitespace-pre-wrap break-words font-amiri text-lg leading-8 text-ink">{c.text}</p>
                <div className="flex flex-wrap gap-2">
                  {c.status !== 'approved' ? (
                    <Button variant="success" disabled={busyId === c.id} onClick={() => approve(c)}>
                      <Check size={16} /> اعتماد
                    </Button>
                  ) : null}
                  {c.status !== 'hidden' ? (
                    <Button variant="ghost" disabled={busyId === c.id} onClick={() => hide(c)}>
                      <EyeOff size={16} /> إخفاء
                    </Button>
                  ) : null}
                  <Button variant="soft" onClick={() => setEditing(c)}>
                    <Pencil size={16} /> تعديل
                  </Button>
                  <Button variant="ghost" className="ms-auto text-red-600" onClick={() => setDeleting(c)} aria-label="حذف">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {filtered.length > limit ? (
        <div className="mt-4 text-center">
          <Button variant="ghost" onClick={() => setLimit((l) => l + PAGE)}>
            عرض المزيد ({filtered.length - limit})
          </Button>
        </div>
      ) : null}

      <EditDialog
        card={editing}
        onClose={() => setEditing(null)}
        onSave={async (patch) => {
          if (!editing) return;
          const id = editing.id;
          setEditing(null);
          await run(id, () => updateCongrat(id, patch), 'تم حفظ التعديل');
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="حذف التهنئة"
        message={`سيتم حذف تهنئة «${deleting?.name ?? ''}» نهائياً ولا يمكن التراجع عن ذلك.`}
        confirmLabel="حذف نهائياً"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const c = deleting;
          setDeleting(null);
          if (c) void run(c.id, () => deleteCongrat(c.id), 'تم حذف التهنئة');
        }}
      />

      <ConfirmDialog
        open={confirmAll}
        title="اعتماد كل التهاني"
        message={`سيتم اعتماد ${pending.length - pendingFlagged.length} تهنئة${
          pendingFlagged.length ? `، وإخفاء ${pendingFlagged.length} تحتوي على كلمات محظورة` : ''
        }. هل تريد المتابعة؟`}
        confirmLabel="اعتماد الكل"
        danger={false}
        onCancel={() => setConfirmAll(false)}
        onConfirm={() => void doApproveAll()}
      />
    </section>
  );
}

function EditDialog({
  card,
  onClose,
  onSave,
}: {
  card: Congrat | null;
  onClose: () => void;
  onSave: (patch: { name: string; text: string; displayDuration?: number }) => void;
}) {
  // المفتاح يعيد تهيئة الحقول لكل تهنئة
  return (
    <Modal open={card !== null} onClose={onClose} title="تعديل التهنئة" wide>
      {card ? <EditForm key={card.id} card={card} onClose={onClose} onSave={onSave} /> : null}
    </Modal>
  );
}

function EditForm({
  card,
  onClose,
  onSave,
}: {
  card: Congrat;
  onClose: () => void;
  onSave: (patch: { name: string; text: string; displayDuration?: number }) => void;
}) {
  const [name, setName] = useState(card.name);
  const [text, setText] = useState(card.text);
  const [dur, setDur] = useState(card.displayDuration ? String(card.displayDuration) : '');
  const valid = name.trim().length >= 1 && text.trim().length >= 1;
  return (
    <div className="space-y-3">
      <Field label={`الاسم (حتى ${NAME_MAX} حرفاً)`}>
        <input className={inputCls} value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label={`نص التهنئة (${text.length}/${TEXT_MAX})`}>
        <textarea
          className={`${inputCls} font-amiri text-lg leading-8`}
          rows={5}
          value={text}
          maxLength={TEXT_MAX}
          onChange={(e) => setText(e.target.value)}
        />
      </Field>
      <Field label="مدة العرض (ثوانٍ)" hint="اتركه فارغاً لاستخدام المدة العامة من الإعدادات">
        <input
          className={inputCls}
          type="number"
          min={3}
          max={120}
          value={dur}
          onChange={(e) => setDur(e.target.value)}
          dir="ltr"
        />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose}>
          إلغاء
        </Button>
        <Button
          disabled={!valid}
          onClick={() => {
            const d = Number(dur);
            onSave({ name: name.trim(), text: text.trim(), displayDuration: d >= 3 ? Math.min(120, d) : undefined });
          }}
        >
          حفظ
        </Button>
      </div>
    </div>
  );
}
