import { useEffect } from 'react';
import { motion } from 'motion/react';
import { HIGHLIGHT_MS } from '../../lib/constants';
import { celebrateBurst } from '../../lib/confetti';
import { playCelebration } from '../../lib/sound';
import type { Congrat } from '../../lib/types';
import { CongratCard } from './CongratCard';

/** بطاقة بارزة عند اعتماد تهنئة جديدة: وميض ذهبي + قصاصات + نغمة (إن كان الصوت مفعلاً) لمدة 7 ثوانٍ */
export function Highlight({
  card,
  sound,
  onDone,
}: {
  card: Congrat;
  sound: boolean;
  onDone: () => void;
}) {
  useEffect(() => {
    celebrateBurst();
    if (sound) playCelebration();
    const t = window.setTimeout(onDone, HIGHLIGHT_MS);
    return () => window.clearTimeout(t);
    // يُنفَّذ مرة لكل بطاقة (key في الأب)
  }, []);

  return (
    <motion.div
      className="absolute inset-0 z-30 flex items-center justify-center rounded-[2rem] bg-paper/70 p-2 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="gold-flash pointer-events-none absolute inset-0 rounded-[2rem]" />
      <motion.div
        className="relative h-full w-full pt-6"
        initial={{ scale: 0.7, rotate: -2, opacity: 0 }}
        animate={{ scale: [0.7, 1.06, 1], rotate: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <CongratCard card={card} badge="✦ تهنئة جديدة ✦" />
      </motion.div>
    </motion.div>
  );
}
