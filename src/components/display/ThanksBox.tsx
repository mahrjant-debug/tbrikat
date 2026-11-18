import { memo } from 'react';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import { DEFAULT_CLOSING_MESSAGE } from '../../lib/reception';

/** صندوق الشكر: يحلّ محل رمز QR في وضع الذكرى بعد انتهاء استقبال التهاني */
export const ThanksBox = memo(function ThanksBox({
  names,
  message,
  className = '',
}: {
  names: string;
  message: string;
  className?: string;
}) {
  return (
    <section
      className={`card-surface relative flex min-h-0 flex-1 flex-col items-center justify-center gap-[0.8rem] rounded-[1.6rem] p-[1.4rem] text-center ${className}`}
    >
      <motion.div animate={{ scale: [1, 1.14, 1] }} transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}>
        <Heart className="h-[3.6rem] w-[3.6rem] text-gold" fill="currentColor" aria-hidden="true" />
      </motion.div>
      <div className="gold-text font-cairo text-[2.3rem] font-extrabold leading-snug">شكراً لحضوركم</div>
      {names ? <div className="font-cairo text-[1.25rem] font-bold text-ink">{names}</div> : null}
      <p className="max-w-[22rem] font-almarai text-[1.05rem] leading-8 text-ink-soft">{message.trim() || DEFAULT_CLOSING_MESSAGE}</p>
    </section>
  );
});
