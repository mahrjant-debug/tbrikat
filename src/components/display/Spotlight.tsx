import { useEffect } from 'react';
import { motion } from 'motion/react';
import { celebrateBurst } from '../../lib/confetti';
import { playCelebration } from '../../lib/sound';

/** تسليط الضوء: صورة بملء الشاشة لمدة محددة مع قصاصات */
export function Spotlight({
  src,
  names,
  durationSec,
  sound,
  onDone,
}: {
  src: string;
  names: string;
  durationSec: number;
  sound: boolean;
  onDone: () => void;
}) {
  useEffect(() => {
    celebrateBurst();
    if (sound) playCelebration();
    const t = window.setTimeout(onDone, durationSec * 1000);
    return () => window.clearTimeout(t);
    // مرة واحدة لكل عرض
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
      role="dialog"
      aria-label="تسليط الضوء"
    >
      <img src={src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-50 blur-2xl" />
      <motion.img
        src={src}
        alt="صورة العرسان"
        className="relative z-10 max-h-[88dvh] max-w-[92vw] rounded-3xl border-[0.5rem] border-gold object-contain shadow-[0_0_6rem_rgba(201,154,59,0.7)]"
        initial={{ scale: 0.85 }}
        animate={{ scale: [0.85, 1, 1.03] }}
        transition={{ duration: durationSec, ease: 'easeOut' }}
        draggable={false}
      />
      <div className="absolute inset-x-0 bottom-[3dvh] z-20 text-center">
        <span className="gold-text rounded-full bg-black/40 px-8 py-2 font-amiri text-[3rem] font-bold backdrop-blur">{names}</span>
      </div>
    </motion.div>
  );
}
