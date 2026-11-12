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
      <div className="gold-frame mx-auto flex h-full w-full max-w-[72rem] flex-col items-center justify-center rounded-[2rem] px-8 text-center">
        <Heart className="mb-5 h-16 w-16 text-gold" aria-hidden="true" />
        <p className="gold-text font-amiri text-[3.6rem] font-bold leading-snug">كن أول من يبارك للعرسان!</p>
        <p className="mt-4 font-cairo text-[1.5rem] text-ink-soft">امسح رمز QR وأرسل تهنئتك الآن</p>
      </div>
    );
  }

  return (
    <div className="group relative h-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          className="h-full"
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.02, y: -12 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <CongratCard card={current} />
        </motion.div>
      </AnimatePresence>
      {cards.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="التهنئة التالية"
            onClick={() => step(1)}
            className="absolute end-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-accent opacity-0 shadow-lg transition group-hover:opacity-100 focus:opacity-100"
          >
            <ChevronLeft size={26} />
          </button>
          <button
            type="button"
            aria-label="التهنئة السابقة"
            onClick={() => step(-1)}
            className="absolute start-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-accent opacity-0 shadow-lg transition group-hover:opacity-100 focus:opacity-100"
          >
            <ChevronRight size={26} />
          </button>
        </>
      ) : null}
    </div>
  );
});
