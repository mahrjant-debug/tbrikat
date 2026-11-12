import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { PartyPopper } from 'lucide-react';
import { splitDuration } from '../../lib/dates';
import { FINALE_MS } from '../../lib/constants';
import { celebrateFinale } from '../../lib/confetti';
import { playCelebration } from '../../lib/sound';

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="gold-frame flex min-w-[9rem] flex-col items-center rounded-[1.4rem] px-5 py-4">
      <span className="gold-text font-almarai text-[5.5rem] font-extrabold leading-none tabular-nums">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-2 font-cairo text-[1.4rem] font-bold text-ink-soft">{label}</span>
    </div>
  );
}

/** لوحة العدّ التنازلي: وحدها من يُحدَّث كل ثانية، فلا تُعاد رسم بقية الصفحة */
export function CountdownPanel({ title, target }: { title: string; target: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const { days, hours, minutes, seconds } = splitDuration(target - now);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 text-center">
      <h2 className="gold-text font-amiri text-[4.2rem] font-bold">{title}</h2>
      <div className="flex flex-wrap items-center justify-center gap-4" role="timer" aria-live="off">
        <Unit value={days} label="يوم" />
        <Unit value={hours} label="ساعة" />
        <Unit value={minutes} label="دقيقة" />
        <Unit value={seconds} label="ثانية" />
      </div>
    </div>
  );
}

/** إعلان احتفالي عند الصفر لمدة 15 ثانية */
export function FinalePanel({ title, sound }: { title: string; sound: boolean }) {
  useEffect(() => {
    const stop = celebrateFinale(FINALE_MS - 500);
    if (sound) playCelebration();
    return stop;
  }, []);
  return (
    <motion.div
      className="flex h-full flex-col items-center justify-center gap-6 text-center"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <PartyPopper className="h-24 w-24 text-gold" aria-hidden="true" />
      <h2 className="gold-text font-amiri text-[6.5rem] font-bold leading-tight">حان الموعد!</h2>
      <p className="font-cairo text-[2.6rem] font-extrabold text-accent">{title.replace(/\s*خلال\s*$/, '')}</p>
      <p className="font-amiri text-[2.4rem] text-ink-soft">بارك الله لهم وبارك عليهم وجمع بينهم في خير</p>
    </motion.div>
  );
}
