import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { countWords } from '../../lib/arabic';
import { LONG_TEXT_WORDS } from '../../lib/constants';
import type { Congrat } from '../../lib/types';
import { CongratCard } from './CongratCard';

interface Props {
  cards: Congrat[];
  baseDuration: number;
  adaptive: boolean;
}

/** مدة بقاء البطاقة: مدة خاصة إن وُجدت، وإلا الأساس + زيادة للنصوص الطويلة (> 25 كلمة) */
export function cardDuration(card: Congrat, base: number, adaptive: boolean): number {
  if (card.displayDuration && card.displayDuration > 0) return card.displayDuration;
  if (!adaptive) return base;
  const extraWords = Math.max(0, countWords(card.text) - LONG_TEXT_WORDS);
  return base + Math.min(20, extraWords * 0.45);
}

/** نقاط الترقيم: حتى 7 نقاط حول البطاقة الحالية */
function Dots({ index, total }: { index: number; total: number }) {
  const max = 7;
  const start = Math.max(0, Math.min(index - Math.floor(max / 2), total - max));
  const end = Math.min(total, start + max);
  const items = Array.from({ length: end - start }, (_, k) => start + k);
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden="true">
      {items.map((i) => (
        <span
          key={i}
          className={`h-2.5 rounded-full transition-all duration-300 ${i === index ? 'w-9 bg-orange-400' : 'w-2.5 bg-line'}`}
        />
      ))}
    </div>
  );
}

const arrowCls =
  'absolute top-1/2 z-20 flex h-[2.8rem] w-[2.8rem] -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-gold-deep shadow-md transition hover:scale-105 hover:bg-accent-soft';

export const CardStage = memo(function CardStage({ cards, baseDuration, adaptive }: Props) {
  const [currentId, setCurrentId] = useState<string | null>(null);
  const cardsRef = useRef(cards);
  useEffect(() => {
    cardsRef.current = cards;
  });

  // ثبّت البطاقة الحالية عند تغيّر القائمة؛ وإن حُذفت انتقل لنفس الموضع
  const index = (() => {
    if (!cards.length) return -1;
    const i = currentId ? cards.findIndex((c) => c.id === currentId) : -1;
    return i >= 0 ? i : 0;
  })();
  const current = index >= 0 ? cards[index] : null;
  const currentKey = current?.id ?? null;

  useEffect(() => {
    if (currentKey !== currentId) setCurrentId(currentKey);
  }, [currentKey, currentId]);

  const step = useCallback((dir: 1 | -1) => {
    const list = cardsRef.current;
    if (!list.length) return;
    setCurrentId((id) => {
      const i = id ? list.findIndex((c) => c.id === id) : -1;
      const base = i >= 0 ? i : 0;
      return list[(base + dir + list.length) % list.length].id;
    });
  }, []);

  // مؤقت التبديل التلقائي: يُعاد ضبطه عند تغيّر البطاقة أو مدتها (والتنقل اليدوي يغيّر البطاقة)
  const duration = current ? cardDuration(current, baseDuration, adaptive) : 0;
  useEffect(() => {
    if (!currentKey || cardsRef.current.length < 2) return;
    const t = window.setTimeout(() => step(1), duration * 1000);
    return () => window.clearTimeout(t);
  }, [currentKey, duration, step, cards.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') step(1);
      if (e.key === 'ArrowRight') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  if (!current) {
    return (
      <div className="card-surface flex h-full w-full flex-col items-center justify-center rounded-[1.8rem] px-8 text-center">
        <Heart className="mb-5 h-16 w-16 text-gold" aria-hidden="true" />
        <p className="gold-text font-cairo text-[3.4rem] font-extrabold leading-snug">كن أول من يبارك للعرسان!</p>
        <p className="mt-4 font-cairo text-[1.5rem] text-ink-soft">امسح رمز QR وأرسل تهنئتك الآن</p>
      </div>
    );
  }

  const multi = cards.length > 1;
  return (
    <div className="flex h-full min-h-0 flex-col gap-[0.9rem]">
      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            className="h-full"
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.01, y: -10 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <CongratCard
              card={current}
              position={{ index: index + 1, total: cards.length }}
              durationSec={multi ? duration : undefined}
            />
          </motion.div>
        </AnimatePresence>
        {multi ? (
          <>
            <button type="button" aria-label="التهنئة التالية" onClick={() => step(1)} className={`${arrowCls} left-0 -translate-x-1/2`}>
              <ChevronLeft size={24} />
            </button>
            <button type="button" aria-label="التهنئة السابقة" onClick={() => step(-1)} className={`${arrowCls} right-0 translate-x-1/2`}>
              <ChevronRight size={24} />
            </button>
          </>
        ) : null}
      </div>
      {multi ? <Dots index={index} total={cards.length} /> : null}
    </div>
  );
});
