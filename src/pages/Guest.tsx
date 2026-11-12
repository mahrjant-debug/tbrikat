import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, Clock, Loader2, PenLine, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { LogoMark } from '../components/Logo';
import { Particles } from '../components/Particles';
import { useBannedWords, useSettings } from '../hooks/useData';
import { celebrateGuest } from '../lib/confetti';
import { GUEST_COOLDOWN_MS, NAME_MAX, QUICK_PHRASES, TEXT_MAX } from '../lib/constants';
import { countCongratulations, submitCongrat } from '../lib/db';
import { handleFirestoreError } from '../lib/firebase';
import { safeStorage } from '../lib/storage';
import { initialStatus, validateGuest } from '../lib/validation';
import type { CongratStatus } from '../lib/types';

const LAST_KEY = 'cw.lastSubmit';
const NAME_KEY = 'cw.guestName';

type Result = { status: CongratStatus; queued: boolean };

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return Promise.race([p, new Promise<'timeout'>((r) => window.setTimeout(() => r('timeout'), ms))]);
}

export default function Guest() {
  const { settings } = useSettings();
  const { compiled } = useBannedWords();
  const [name, setName] = useState(() => safeStorage.get(NAME_KEY) ?? '');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [wait, setWait] = useState(0); // ثوانٍ متبقية للمهلة
  const lastSentRef = useRef(Number(safeStorage.get(LAST_KEY) ?? 0) || 0);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // عدّاد المهلة بين تهنئتين: يعمل فقط أثناء الانتظار
  const startCooldown = useCallback(() => {
    const tick = () => {
      const left = Math.ceil((lastSentRef.current + GUEST_COOLDOWN_MS - Date.now()) / 1000);
      setWait(Math.max(0, left));
      return left > 0;
    };
    if (!tick()) return () => undefined;
    const id = window.setInterval(() => {
      if (!tick()) window.clearInterval(id);
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => startCooldown(), [startCooldown]);

  useEffect(() => {
    document.title = `أرسل تهنئتك — ${settings.names}`;
  }, [settings.names]);

  useEffect(() => {
    let alive = true;
    countCongratulations().then((n) => alive && setCount(n));
    return () => {
      alive = false;
    };
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (sending || wait > 0) return;
    setError('');
    const v = validateGuest(name, text, compiled);
    if (!v.ok) {
      setError(v.error ?? 'تعذّر الإرسال.');
      return;
    }
    const cleanName = name.replace(/\s+/g, ' ').trim();
    const cleanText = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    let status = initialStatus(v.banned, settings);
    setSending(true);
    try {
      const attempt = async (s: CongratStatus) => {
        const p = submitCongrat(cleanName, cleanText, s);
        // دون اتصال تبقى الكتابة معلّقة وتُرسل تلقائياً لاحقاً: لا نُبقي المستخدم منتظراً
        p.catch((err) => handleFirestoreError('submit', err));
        return withTimeout(p, 6000);
      };
      let out: unknown;
      try {
        out = await attempt(status);
      } catch (err) {
        // قد يكون الاعتماد التلقائي أُوقف للتو في الخادم: نعيد المحاولة كقيد المراجعة
        if (status === 'approved' && (err as { code?: string }).code === 'permission-denied') {
          status = 'pending';
          out = await attempt(status);
        } else {
          throw err;
        }
      }
      lastSentRef.current = Date.now();
      safeStorage.set(LAST_KEY, String(lastSentRef.current));
      safeStorage.set(NAME_KEY, cleanName);
      startCooldown();
      setResult({ status, queued: out === 'timeout' });
      setText('');
      celebrateGuest();
      countCongratulations().then((n) => n !== null && setCount(n));
    } catch (err) {
      handleFirestoreError('submit', err);
      setError('تعذّر إرسال التهنئة الآن. تحقق من الاتصال وحاول مرة أخرى.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div data-theme={settings.theme} className="stage-bg relative min-h-dvh overflow-x-hidden pb-10">
      <Particles count={14} />
      <div className="relative z-10 mx-auto max-w-lg px-4 pt-6">
        <header className="mb-5 text-center">
          <LogoMark className="mx-auto h-16 w-16" />
          <h1 className="gold-text mt-1 font-amiri text-4xl font-bold leading-tight">{settings.names}</h1>
          <p className="font-cairo text-base font-bold text-ink-soft">{settings.title}</p>
          {count !== null ? (
            <p className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full bg-accent-soft px-4 py-1.5 font-almarai text-sm font-bold text-accent">
              <Sparkles size={16} aria-hidden="true" />
              وصلت {count} تهنئة حتى الآن
            </p>
          ) : null}
        </header>

        {result ? (
          <section className="gold-frame rounded-3xl p-6 text-center" aria-live="polite">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" aria-hidden="true" />
            <h2 className="mt-3 font-cairo text-2xl font-extrabold text-ink">شكراً لك، وصلت تهنئتك!</h2>
            <p className="mt-2 flex items-center justify-center gap-2 font-almarai text-base leading-7 text-ink-soft">
              {result.status === 'approved' ? (
                <>تم اعتماد تهنئتك وستظهر على شاشة القاعة خلال لحظات.</>
              ) : (
                <>
                  <ShieldCheck size={20} className="shrink-0 text-gold-deep" aria-hidden="true" />
                  استلمنا تهنئتك وهي الآن قيد المراجعة، وستظهر على الشاشة فور اعتمادها.
                </>
              )}
            </p>
            {result.queued ? (
              <p className="mt-2 text-sm font-bold text-amber-700">الاتصال ضعيف؛ ستُرسل تهنئتك تلقائياً فور عودته.</p>
            ) : null}
            <button
              type="button"
              onClick={() => setResult(null)}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-accent px-6 py-3 font-cairo text-base font-extrabold text-white shadow-lg"
            >
              <PenLine size={18} aria-hidden="true" />
              إرسال تهنئة أخرى
            </button>
          </section>
        ) : (
          <form onSubmit={onSubmit} className="gold-frame rounded-3xl p-5" noValidate>
            <label className="block">
              <span className="mb-1 block font-cairo text-sm font-extrabold text-ink">اسمك</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
                maxLength={NAME_MAX}
                autoComplete="name"
                placeholder="مثال: أبو محمد"
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-base text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1 flex items-center justify-between font-cairo text-sm font-extrabold text-ink">
                <span>تهنئتك</span>
                <span dir="ltr" className={`font-almarai text-xs tabular-nums ${text.length >= TEXT_MAX - 20 ? 'text-red-600' : 'text-ink-soft'}`}>
                  {text.length} / {TEXT_MAX}
                </span>
              </span>
              <textarea
                ref={textRef}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, TEXT_MAX))}
                maxLength={TEXT_MAX}
                rows={5}
                placeholder="اكتب تهنئتك للعرسان…"
                className="w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 font-amiri text-xl leading-9 text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
              />
            </label>

            <div className="mt-3">
              <p className="mb-2 font-cairo text-xs font-bold text-ink-soft">أو اختر عبارة جاهزة:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PHRASES.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setText(p);
                      textRef.current?.focus();
                    }}
                    className="rounded-full border border-line bg-accent-soft px-3 py-1.5 text-start font-almarai text-xs font-bold text-accent transition active:scale-95"
                  >
                    {p.length > 34 ? `${p.slice(0, 34)}…` : p}
                  </button>
                ))}
              </div>
            </div>

            {error ? (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={sending || wait > 0}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-3.5 font-cairo text-lg font-extrabold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60"
            >
              {sending ? (
                <>
                  <Loader2 className="animate-spin" size={20} aria-hidden="true" /> جارٍ الإرسال…
                </>
              ) : wait > 0 ? (
                <>
                  <Clock size={20} aria-hidden="true" /> يمكنك الإرسال بعد {wait} ثانية
                </>
              ) : (
                <>
                  <Send size={20} className="-scale-x-100" aria-hidden="true" /> إرسال التهنئة
                </>
              )}
            </button>
            <p className="mt-3 text-center font-almarai text-xs text-ink-soft">
              تُراجَع التهاني قبل عرضها على الشاشة. لا تُقبل الروابط أو الإعلانات.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
