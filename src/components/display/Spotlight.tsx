import { Fragment, useEffect, useState, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { celebrateBurst, celebrateFinale } from '../../lib/confetti';
import { playCelebration } from '../../lib/sound';

const GLYPHS = ['✦', '❤', '✧', '★', '❀', '✺'];
const COLORS = ['#fbbf24', '#fde68a', '#ffffff', '#fb7185', '#f59e0b', '#fcd34d'];

interface Floater {
  left: number;
  size: number;
  dur: number;
  delay: number;
  sway: number;
  glyph: string;
  color: string;
}

function makeFloaters(n: number): Floater[] {
  return Array.from({ length: n }, (_, i) => ({
    left: Math.random() * 100,
    size: 1.2 + Math.random() * 2.6,
    dur: 7 + Math.random() * 7,
    delay: -Math.random() * 12,
    sway: (Math.random() - 0.5) * 12,
    glyph: GLYPHS[i % GLYPHS.length],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));
}

/**
 * تسليط الضوء على العريس: صورة بملء الشاشة مع اسمه، أشعة ضوء دوّارة، رموز احتفالية صاعدة،
 * قصاصات متواصلة، وإطار ذهبي متوهج. تتكيف أحجامها مع الجوال والشاشات الكبيرة (vmin).
 */
export function Spotlight({
  src,
  name,
  label,
  festival,
  durationSec,
  sound,
  onDone,
}: {
  src: string;
  /** اسم صاحب الصورة (العريس) */
  name: string;
  /** وصف الصورة مثل «العريس» */
  label: string;
  /** اسم المهرجان/العرسان العام (يُعرض صغيراً) */
  festival: string;
  durationSec: number;
  sound: boolean;
  onDone: () => void;
}) {
  const [floaters] = useState(() => makeFloaters(26));
  const words = name.split(/\s+/).filter(Boolean);

  useEffect(() => {
    celebrateBurst();
    if (sound) playCelebration();
    const stop = celebrateFinale(Math.max(2000, durationSec * 1000 - 500));
    const t = window.setTimeout(onDone, durationSec * 1000);
    return () => {
      stop();
      window.clearTimeout(t);
    };
    // مرة واحدة لكل عرض
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-[2.4vmin] overflow-hidden bg-[#140d03] px-[4vw] py-[3vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
      role="dialog"
      aria-label="تسليط الضوء"
    >
      {/* خلفية: نسخة الصورة المموّهة + أشعة دوّارة + رموز صاعدة */}
      <img src={src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-2xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(120,70,5,0.15),rgba(10,6,0,0.85)_75%)]" />
      <div className="spot-rays" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {floaters.map((f, i) => (
          <span
            key={i}
            className="spot-float"
            style={
              {
                left: `${f.left}%`,
                fontSize: `${f.size}vmin`,
                color: f.color,
                '--dur': `${f.dur}s`,
                '--delay': `${f.delay}s`,
                '--sway': `${f.sway}vw`,
              } as CSSProperties
            }
          >
            {f.glyph}
          </span>
        ))}
      </div>

      {/* شعار التهنئة */}
      <motion.div
        className="relative z-10 flex items-center gap-[1.6vmin] font-cairo font-black text-amber-200"
        style={{ fontSize: 'clamp(1.2rem, 4.2vmin, 3rem)' }}
        initial={{ opacity: 0, scale: 0.5, y: -30 }}
        animate={{ opacity: 1, scale: [0.5, 1.18, 1], y: 0 }}
        transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
      >
        <span className="twinkle-always">✦</span>
        ألف مبروك
        <span className="twinkle-always">✦</span>
      </motion.div>

      {/* الصورة */}
      <motion.div
        className="relative z-10 spot-bob"
        initial={{ scale: 0.6, opacity: 0, rotate: -4 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 110, damping: 14, delay: 0.1 }}
      >
        <div className="spot-frame border-[0.7vmin] border-amber-400 bg-amber-400">
          <img
            src={src}
            alt={name || 'صورة العريس'}
            draggable={false}
            className="block max-h-[56dvh] max-w-[84vw] rounded-[1.1rem] object-contain"
          />
        </div>
      </motion.div>

      {/* لوحة الاسم */}
      <motion.div
        className="relative z-10 text-center"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.7, ease: 'easeOut' }}
      >
        {label ? (
          <div className="font-cairo font-extrabold text-amber-200/90" style={{ fontSize: 'clamp(1rem, 3vmin, 2rem)' }}>
            {label}
          </div>
        ) : null}
        {name ? (
          <h2 className="spot-name font-cairo font-black leading-tight" style={{ fontSize: 'clamp(2rem, 8vmin, 6rem)' }}>
            {words.map((w, i) => (
              <Fragment key={i}>
                <motion.span
                  className="inline-block"
                  initial={{ opacity: 0, y: 30, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.6, delay: 1 + i * 0.18, type: 'spring', stiffness: 160, damping: 14 }}
                >
                  {w}
                </motion.span>
                {i < words.length - 1 ? ' ' : null}
              </Fragment>
            ))}
          </h2>
        ) : null}
        {festival ? (
          <div className="mt-[0.8vmin] font-cairo font-bold text-amber-100/80" style={{ fontSize: 'clamp(0.9rem, 2.6vmin, 1.7rem)' }}>
            {festival}
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}
