import { useMemo, useState } from 'react';
import { Ban, CheckCircle2, FlaskConical, Plus, Trash2, XCircle } from 'lucide-react';
import { Button, inputCls, useToast } from '../../components/ui';
import { containsLinkOrAd, findInWordList, normalizeArabic, type CompiledWordList } from '../../lib/arabic';
import { SUGGESTED_BANNED } from '../../lib/constants';
import { addBannedWords, deleteBannedWord } from '../../lib/db';
import { handleFirestoreError } from '../../lib/firebase';
import type { BannedWord } from '../../lib/types';

export function BannedTab({ words, compiled }: { words: BannedWord[]; compiled: CompiledWordList }) {
  const toast = useToast();
  const [input, setInput] = useState('');
  const [test, setTest] = useState('');
  const [busy, setBusy] = useState(false);

  const existing = useMemo(() => new Set(words.map((w) => normalizeArabic(w.word))), [words]);

  const add = async (raw: string[]) => {
    const fresh = Array.from(new Set(raw.map((w) => w.trim()).filter(Boolean))).filter((w) => {
      const n = normalizeArabic(w);
      return n.length > 0 && !existing.has(n);
    });
    if (!fresh.length) {
      toast.info('لا توجد كلمات جديدة للإضافة.');
      return;
    }
    setBusy(true);
    try {
      await addBannedWords(fresh);
      toast.success(`أُضيفت ${fresh.length} كلمة`);
      setInput('');
    } catch (e) {
      handleFirestoreError('banned-add', e);
      toast.error('تعذّرت الإضافة.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteBannedWord(id);
    } catch (e) {
      handleFirestoreError('banned-delete', e);
      toast.error('تعذّر الحذف.');
    }
  };

  const hit = test.trim() ? findInWordList(test, compiled) : null;
  const adHit = test.trim() ? containsLinkOrAd(test) : false;

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_22rem]">
      <div>
        <div className="mb-4 rounded-2xl border border-line bg-white p-4">
          <label className="mb-1 block text-sm font-bold text-ink">إضافة كلمات أو عبارات محظورة</label>
          <p className="mb-2 text-xs text-ink-soft">
            افصل بين الكلمات بفاصلة أو سطر جديد. المطابقة لكلمة كاملة مع البوادئ (و، ف، ب، ل، ال) وبتطبيع الهمزات والتشكيل؛ لذلك «نصب» تحجب «والنصب» لكن لا تحجب «المنصب».
          </p>
          <textarea
            className={`${inputCls} min-h-20`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="مثال: نصب، احتيال"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button disabled={busy || !input.trim()} onClick={() => void add(input.split(/[,،\n]+/))}>
              <Plus size={16} /> إضافة
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => void add(SUGGESTED_BANNED)}>
              إضافة مقترحات أولية
            </Button>
          </div>
        </div>

        <h3 className="mb-2 flex items-center gap-2 font-cairo font-extrabold text-ink">
          <Ban size={18} /> القائمة الحالية ({words.length})
        </h3>
        {words.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line py-8 text-center text-ink-soft">لا توجد كلمات محظورة بعد.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {words.map((w) => (
              <li key={w.id} className="flex items-center gap-1 rounded-full border border-line bg-white py-1 ps-3 pe-1 text-sm font-bold text-ink">
                {w.word}
                <button
                  type="button"
                  onClick={() => void remove(w.id)}
                  aria-label={`حذف ${w.word}`}
                  className="rounded-full p-1 text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="h-fit rounded-2xl border border-line bg-white p-4">
        <h3 className="mb-2 flex items-center gap-2 font-cairo font-extrabold text-ink">
          <FlaskConical size={18} /> اختبار نص
        </h3>
        <textarea
          className={`${inputCls} min-h-24`}
          value={test}
          onChange={(e) => setTest(e.target.value)}
          placeholder="اكتب نصاً لمعرفة هل سيُحجب…"
          aria-label="نص الاختبار"
        />
        {test.trim() ? (
          <p
            role="status"
            className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
              hit || adHit ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {hit || adHit ? <XCircle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
            {hit
              ? `سيُخفى تلقائياً بسبب الكلمة: «${hit}»`
              : adHit
                ? 'سيُرفض عند الإرسال: يحتوي رابطاً أو إعلاناً أو رقم هاتف'
                : 'النص سليم ولا توجد كلمة محظورة.'}
          </p>
        ) : null}
      </aside>
    </section>
  );
}
