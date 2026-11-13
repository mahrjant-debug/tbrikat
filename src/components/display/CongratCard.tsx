import { Fragment, memo } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import type { Congrat } from '../../lib/types';

const BLESSINGS = [
  'دامت ديارك عامرة بالأفراح والمسرات',
  'بارك الله لكما وبارك عليكما وجمع بينكما في خير',
  'ألف مبروك، وعقبى لكل شاب وشابة',
  'جعله الله زواجاً ميموناً وحياةً سعيدة',
  'أسعد الله أيامكم وأدام أفراحكم',
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function textSize(len: number): string {
  if (len <= 40) return 'text-[3.4rem] leading-[1.55]';
  if (len <= 90) return 'text-[2.9rem] leading-[1.6]';
  if (len <= 140) return 'text-[2.4rem] leading-[1.65]';
  return 'text-[2rem] leading-[1.7]';
}

export function initialOf(name: string): string {
  const ch = Array.from(name.trim())[0];
  return ch ?? '؟';
}

interface Props {
  card: Congrat;
  /** ترتيب البطاقة الحالية من الإجمالي، مثل 1 / 3 */
  position?: { index: number; total: number };
  /** عند تحديدها يظهر شريط تقدم يمتلئ خلال هذه المدة */
  durationSec?: number;
  /** شارة بارزة أعلى البطاقة (للتهنئة الجديدة) */
  badge?: string;
}

/** بطاقة التهنئة الكبيرة */
export const CongratCard = memo(function CongratCard({ card, position, durationSec, badge }: Props) {
  const blessing = BLESSINGS[hash(card.id) % BLESSINGS.length];
  // ظهور الكلمات تباعاً (بحد أقصى ~1.2 ثانية للنصوص الطويلة)
  const words = card.text.split(/\s+/).filter(Boolean);
  const step = Math.min(0.07, 1.2 / Math.max(words.length, 1));
  return (
    <article className="card-surface sheen relative flex h-full w-full flex-col overflow-hidden rounded-[1.8rem]">
      <div className="h-[0.5rem] shrink-0 bg-gradient-to-l from-amber-300 via-orange-400 to-amber-400" />
      {badge ? (
        <span className="absolute left-1/2 top-[1.1rem] z-10 -translate-x-1/2 rounded-full bg-accent px-6 py-1.5 font-cairo text-[1.15rem] font-extrabold text-white shadow-lg">
          {badge}
        </span>
      ) : null}

      <div className="flex shrink-0 items-center justify-between px-[3%] pt-[1.1rem]">
        <span className="flex items-center gap-2 font-cairo text-[1.15rem] font-extrabold text-gold-deep">
          <span className="h-3 w-3 rounded-full bg-gold/70" aria-hidden="true" />
          تهنئة مباركة للعروسين
        </span>
        {position ? (
          <span
            dir="ltr"
            className="rounded-full border border-line bg-accent-soft px-4 py-0.5 font-almarai text-[1.1rem] font-bold tabular-nums text-gold-deep"
            aria-label={`التهنئة ${position.index} من ${position.total}`}
          >
            {position.index} / {position.total}
          </span>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-[6%] py-4 text-center">
        <p className={`font-cairo font-extrabold text-ink [text-wrap:balance] ${textSize(card.text.length)}`} aria-label={card.text}>
          <span aria-hidden="true">“</span>
          {words.map((w, i) => (
            <Fragment key={i}>
              <motion.span
                aria-hidden="true"
                className="inline-block"
                initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.55, delay: 0.3 + i * step, ease: 'easeOut' }}
              >
                {w}
              </motion.span>
              {i < words.length - 1 ? ' ' : null}
            </Fragment>
          ))}
          <span aria-hidden="true">”</span>
        </p>
      </div>

      <div className="mx-[3%] shrink-0 border-t border-line/70" />
      <div className="flex shrink-0 items-center justify-between gap-6 px-[3%] py-[1rem]">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className="float-soft flex h-[3.4rem] w-[3.4rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-400 font-cairo text-[1.9rem] font-extrabold text-amber-900 shadow-sm"
            aria-hidden="true"
          >
            {initialOf(card.name)}
          </span>
          <div className="min-w-0 leading-tight">
            <div className="font-almarai text-[0.95rem] text-ink-soft">المهنئ الكريم:</div>
            <div className="truncate font-cairo text-[1.8rem] font-extrabold text-ink">{card.name}</div>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2 font-almarai text-[1.2rem] font-bold text-ink-soft">
          <Sparkles className="twinkle h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
          <span className="truncate">{blessing}</span>
        </div>
      </div>

      {durationSec ? (
        <div className="mx-[3%] mb-[1rem] h-[0.45rem] shrink-0 overflow-hidden rounded-full bg-line/70" aria-hidden="true">
          <div
            className="bar-fill h-full rounded-full bg-gradient-to-l from-orange-400 to-amber-400"
            style={{ animationDuration: `${durationSec}s` }}
          />
        </div>
      ) : (
        <div className="mb-[0.6rem]" />
      )}
    </article>
  );
});
