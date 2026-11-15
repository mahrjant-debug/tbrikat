import { useEffect, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { celebrateSoft } from '../../lib/confetti';
import type { Partner, Settings } from '../../lib/types';
import { Logo } from '../Logo';

/** أيقونة إنستغرام (لا تتوفر أيقونات العلامات التجارية في lucide) */
function InstagramGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5.2" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const vmin = (n: number, min: string, max: string) => `clamp(${min}, ${n}vmin, ${max})`;

/**
 * شاشة الشريك بملء الشاشة (تصميم «شركاء النجاح»): شعار المهرجان ورقم الدورة، ميدالية بشريط،
 * شعار الشريك واسمه في لافتة داكنة، رسالة الشكر، وتذييل بمعرّف التواصل. تتكيف أحجامها بوحدة vmin.
 */
export function SponsorSlide({
  partner,
  settings,
  festivalLogo,
  footerImage,
  onDone,
}: {
  partner: Partner;
  settings: Settings;
  festivalLogo: string;
  footerImage: string;
  onDone: () => void;
}) {
  const duration = settings.sponsorDurationSec;
  const message = partner.message.trim() || settings.sponsorMessage;
  const ribbonWords = settings.sponsorRibbon.trim().split(/\s+/).filter(Boolean);

  useEffect(() => {
    celebrateSoft();
    const t = window.setTimeout(onDone, duration * 1000);
    return () => window.clearTimeout(t);
    // مرة واحدة لكل عرض
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[125] overflow-hidden bg-[#f6f6fb] font-cairo"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      role="dialog"
      aria-label={`شريك النجاح: ${partner.name}`}
    >
      {/* خطوط قطرية على الجانب الأيمن */}
      <div
        className="absolute inset-y-0 right-0 w-[36%] opacity-80"
        style={{ background: 'repeating-linear-gradient(135deg, transparent 0 1.6vmin, rgba(148,163,184,0.28) 1.6vmin 2.1vmin)' }}
        aria-hidden="true"
      />

      {/* أشرطة الزاوية العلوية اليمنى */}
      <svg className="absolute right-0 top-0 h-[44%] w-[78%]" viewBox="0 0 780 440" preserveAspectRatio="xMaxYMin slice" aria-hidden="true">
        <defs>
          <linearGradient id="sp-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f6e08a" />
            <stop offset="0.5" stopColor="#c99a2e" />
            <stop offset="1" stopColor="#8a6414" />
          </linearGradient>
        </defs>
        <polygon points="270,0 520,0 780,300 780,380" fill="#c7cde0" opacity="0.75" />
        <polygon points="500,0 600,0 780,190 780,250" fill="url(#sp-gold)" />
        <polygon points="640,0 780,0 780,150" fill="#343c4e" />
      </svg>

      {/* مؤشر الوقت */}
      <div className="absolute inset-x-0 top-0 z-30 h-[0.9vmin] bg-slate-300/50" aria-hidden="true">
        <div className="bar-fill h-full bg-gradient-to-l from-amber-400 to-orange-400" style={{ animationDuration: `${duration}s` }} />
      </div>

      {/* شعار المهرجان ورقم الدورة (أعلى اليسار) */}
      <motion.div
        className="absolute left-[3.5%] top-[4%] z-20 flex items-center gap-[3vmin]"
        initial={{ opacity: 0, x: -60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
      >
        <div className="whitespace-nowrap text-right leading-tight text-slate-600">
          <div className="font-black" style={{ fontSize: vmin(5.2, '1.3rem', '3.6rem') }}>
            {settings.names}
          </div>
          <div className="font-bold text-slate-500" style={{ fontSize: vmin(2.6, '0.8rem', '1.9rem') }}>
            {settings.title}
          </div>
        </div>
        <div
          className="shrink-0 pe-[1vmin] font-black italic leading-none text-teal-700"
          style={{ fontSize: vmin(11, '2.6rem', '7.5rem'), textShadow: '0.5vmin 0.5vmin 0 rgba(15,23,42,0.18)' }}
          aria-label={`الدورة ${settings.festivalNumber}`}
        >
          {settings.festivalNumber}
        </div>
      </motion.div>

      {/* الميدالية وشريط «شركاء النجاح» (أعلى اليمين) */}
      <div className="absolute right-[3.5%] top-[3%] z-20 flex flex-col items-center">
        <motion.div
          className="rounded-full p-[1.1vmin] shadow-xl"
          style={{
            width: vmin(25, '5.5rem', '17rem'),
            height: vmin(25, '5.5rem', '17rem'),
            background: 'conic-gradient(from 20deg, #f6e08a, #b8860b, #f6e08a, #fff3c2, #b8860b, #f6e08a)',
          }}
          initial={{ scale: 0, rotate: -220, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 90, damping: 13, delay: 0.2 }}
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white p-[1.2vmin] ring-[0.5vmin] ring-amber-200/80">
            <Logo src={festivalLogo || undefined} className="h-full w-full" />
          </div>
        </motion.div>
        <motion.div
          className="-mt-[2.2vmin] flex items-center justify-center bg-[#343c4e] text-center font-black leading-tight text-amber-300 shadow-lg"
          style={{
            width: vmin(14, '3.4rem', '9.4rem'),
            paddingTop: '2.6vmin',
            paddingBottom: '4.4vmin',
            fontSize: vmin(3.2, '0.8rem', '2.1rem'),
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 88%, 0 100%)',
          }}
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7, ease: 'easeOut' }}
        >
          <span>
            {ribbonWords.map((w, i) => (
              <span key={i} className="block">
                {w}
              </span>
            ))}
          </span>
        </motion.div>
      </div>

      {/* المحتوى الوسطي */}
      <div
        className="relative z-10 flex h-full flex-col items-center justify-center gap-[2.6vmin] px-[5%]"
        style={{ paddingTop: vmin(20, '5rem', '14rem'), paddingBottom: vmin(16, '4rem', '11rem') }}
      >
        <motion.div
          className="spot-bob"
          initial={{ scale: 0.3, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 110, damping: 13, delay: 0.55 }}
        >
          {partner.logo ? (
            <img
              src={partner.logo}
              alt=""
              draggable={false}
              className="object-contain drop-shadow-xl"
              style={{ maxHeight: vmin(32, '6rem', '24rem'), maxWidth: vmin(48, '9rem', '34rem') }}
            />
          ) : (
            <div
              className="flex items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 font-black text-[#343c4e] shadow-xl"
              style={{ width: vmin(22, '5rem', '15rem'), height: vmin(22, '5rem', '15rem'), fontSize: vmin(12, '2.6rem', '8rem') }}
            >
              {Array.from(partner.name.trim())[0] ?? '؟'}
            </div>
          )}
        </motion.div>

        <motion.div
          className="rounded-[1.6vmin] bg-[#343c4e] text-center shadow-xl"
          style={{ padding: `${vmin(1.8, '0.6rem', '1.6rem')} ${vmin(5, '1.2rem', '4rem')}`, maxWidth: '94%' }}
          initial={{ opacity: 0, y: 50, scaleX: 0.7 }}
          animate={{ opacity: 1, y: 0, scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.95, ease: 'easeOut' }}
        >
          <h2 className="spot-name font-black leading-snug" style={{ fontSize: vmin(7.2, '1.7rem', '5.6rem') }}>
            {partner.name}
          </h2>
          {partner.category ? (
            <div className="font-bold text-amber-100/80" style={{ fontSize: vmin(2.6, '0.8rem', '1.8rem') }}>
              {partner.category}
            </div>
          ) : null}
        </motion.div>

        <motion.p
          className="max-w-[min(94%,78rem)] text-center font-extrabold text-slate-800 [text-wrap:balance]"
          style={{ fontSize: vmin(3.5, '1rem', '2.7rem'), lineHeight: 1.85 } as CSSProperties}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.35, ease: 'easeOut' }}
        >
          {message}
        </motion.p>
      </div>

      {/* التذييل */}
      <motion.div
        className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between border-t-[0.5vmin] border-slate-500 bg-[#343c4e] px-[3.5%] text-white"
        style={{ height: vmin(9, '2.8rem', '6.2rem') }}
        initial={{ y: 120 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
      >
        <div
          className="font-bold leading-tight"
          style={{ fontSize: vmin(2.8, '0.7rem', '2rem'), maxWidth: footerImage ? 'calc(50% - 15vmin)' : undefined }}
        >
          {settings.sponsorFooterText}
        </div>
        {settings.sponsorFooterHandle ? (
          <div
            dir="ltr"
            className="flex items-center gap-[1.2vmin] font-bold tracking-wide"
            style={{ fontSize: vmin(3, '0.8rem', '2.1rem'), maxWidth: footerImage ? 'calc(50% - 15vmin)' : undefined }}
          >
            <InstagramGlyph className="h-[1.4em] w-[1.4em]" />
            {settings.sponsorFooterHandle}
          </div>
        ) : null}
      </motion.div>

      {/* صورة دائرية بين الجانبين فوق التذييل (اختيارية) */}
      {footerImage ? (
        <motion.div
          className="absolute bottom-0 left-1/2 z-30 -translate-x-1/2"
          initial={{ opacity: 0, y: 90, scale: 0.7 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 90, damping: 14, delay: 1.1 }}
        >
          <div
            className="rounded-full border-[0.6vmin] border-white shadow-2xl ring-[0.35vmin] ring-slate-300"
            style={{ width: vmin(25, '5rem', '17rem'), height: vmin(25, '5rem', '17rem'), overflow: 'hidden', transform: 'translateY(32%)' }}
          >
            <img src={footerImage} alt="" draggable={false} className="h-full w-full object-cover" />
          </div>
        </motion.div>
      ) : null}
    </motion.div>
  );
}
