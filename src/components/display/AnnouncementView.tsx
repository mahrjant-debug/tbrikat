import { memo, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { BellRing, Info, Megaphone, Sparkles, type LucideIcon } from 'lucide-react';
import type { AnnounceMode, AnnounceStyle } from '../../lib/types';

export interface AnnounceLook {
  label: string;
  /** لون عيّنة الاختيار في اللوحة */
  swatch: string;
  background: string;
  color: string;
  accent: string;
  Icon: LucideIcon;
}

/** القوالب الأربعة؛ تُستعمل على الشاشة وفي المعاينة نفسها */
export const ANNOUNCE_STYLES: Record<AnnounceStyle, AnnounceLook> = {
  gold: {
    label: 'ذهبي ملكي',
    swatch: '#d9a82f',
    background: 'linear-gradient(135deg,#fff8e1 0%,#f6e08a 55%,#e3b84a 100%)',
    color: '#3b2a05',
    accent: '#8a6414',
    Icon: Megaphone,
  },
  emerald: {
    label: 'زمردي',
    swatch: '#0b6b4a',
    background: 'linear-gradient(135deg,#064e3b 0%,#0b6b4a 60%,#10806a 100%)',
    color: '#ffffff',
    accent: '#f6e08a',
    Icon: Sparkles,
  },
  alert: {
    label: 'تنبيه عاجل',
    swatch: '#c62828',
    background: 'linear-gradient(135deg,#7f1d1d 0%,#b91c1c 55%,#dc2626 100%)',
    color: '#ffffff',
    accent: '#fde68a',
    Icon: BellRing,
  },
  info: {
    label: 'معلومة',
    swatch: '#1d3a7a',
    background: 'linear-gradient(135deg,#0f2a5c 0%,#1d3a7a 60%,#2b57b5 100%)',
    color: '#ffffff',
    accent: '#bfdbfe',
    Icon: Info,
  },
};

interface Props {
  title: string;
  text: string;
  style: AnnounceStyle;
  /** إن حُدّدت يظهر شريط وقت يتناقص خلالها (على الشاشة فقط، لا في المعاينة) */
  durationSec?: number;
}

/**
 * الإعلان بملء الشاشة. كل الأحجام بوحدة cqmin (نسبة إلى الحاوية) فيتكيف مع الشاشة الحقيقية
 * ومع صندوق المعاينة الصغير في اللوحة بالمظهر نفسه؛ ويصغّر الخط تلقائياً كلما طال النص.
 */
export const AnnouncementFull = memo(function AnnouncementFull({ title, text, style, durationSec }: Props) {
  const look = ANNOUNCE_STYLES[style];
  const Icon = look.Icon;
  const len = text.length;
  const textSize = len <= 80 ? 6.4 : len <= 160 ? 5 : len <= 300 ? 3.9 : len <= 450 ? 3.2 : 2.7;
  const titleSize = len > 300 ? 5 : 7;
  return (
    <div
      className="absolute inset-0 overflow-hidden font-cairo"
      style={{ background: look.background, color: look.color, containerType: 'size' } as CSSProperties}
    >
      <div
        className="absolute -right-[10cqmin] -top-[12cqmin] rounded-full opacity-25"
        style={{ width: '48cqmin', height: '48cqmin', background: `radial-gradient(circle, ${look.accent}, transparent 70%)` }}
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-[14cqmin] -left-[10cqmin] rounded-full opacity-20"
        style={{ width: '56cqmin', height: '56cqmin', background: `radial-gradient(circle, ${look.accent}, transparent 70%)` }}
        aria-hidden="true"
      />
      {durationSec ? (
        <div className="absolute inset-x-0 top-0 bg-black/25" style={{ height: '1.1cqmin' }} aria-hidden="true">
          <div className="bar-fill h-full" style={{ background: look.accent, animationDuration: `${durationSec}s` }} />
        </div>
      ) : null}
      <div
        className="relative z-10 flex h-full flex-col items-center justify-center text-center"
        style={{ padding: '5cqmin 8cqw', gap: '2.6cqmin' }}
      >
        <motion.div
          className="flex items-center justify-center rounded-full"
          style={{
            width: '13cqmin',
            height: '13cqmin',
            background: 'rgba(255,255,255,0.16)',
            boxShadow: `0 0 0 0.9cqmin ${look.accent}55`,
            color: look.accent,
          }}
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 150, damping: 12 }}
        >
          <Icon style={{ width: '6.8cqmin', height: '6.8cqmin' }} strokeWidth={2.2} />
        </motion.div>
        {title ? (
          <motion.h2
            className="font-extrabold leading-tight [text-wrap:balance]"
            style={{ fontSize: `${titleSize}cqmin`, color: look.accent }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6, ease: 'easeOut' }}
          >
            {title}
          </motion.h2>
        ) : null}
        <div className="rounded-full" style={{ width: '18cqmin', height: '0.7cqmin', background: look.accent, opacity: 0.8 }} aria-hidden="true" />
        <motion.p
          className="whitespace-pre-line font-bold [text-wrap:balance]"
          style={{ fontSize: `${textSize}cqmin`, lineHeight: 1.7, maxWidth: '88%' }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.7, ease: 'easeOut' }}
        >
          {text}
        </motion.p>
      </div>
    </div>
  );
});

/** الشريط العلوي: حتى ~250 حرفاً، والتهاني تستمر تحته. الأحجام بوحدة cqw (نسبة إلى عرض الحاوية). */
export const AnnouncementBanner = memo(function AnnouncementBanner({ title, text, style, durationSec }: Props) {
  const look = ANNOUNCE_STYLES[style];
  const Icon = look.Icon;
  const textSize = text.length <= 90 ? 2.7 : text.length <= 170 ? 2.3 : 2;
  return (
    <div
      className="w-full overflow-hidden font-cairo shadow-2xl"
      style={{ background: look.background, color: look.color, containerType: 'inline-size' } as CSSProperties}
    >
      <div className="flex items-center" style={{ gap: '1.8cqw', padding: '1.3cqw 3cqw' }}>
        <div
          className="flex shrink-0 items-center justify-center rounded-full"
          style={{ width: '5.2cqw', height: '5.2cqw', background: 'rgba(255,255,255,0.16)', color: look.accent }}
          aria-hidden="true"
        >
          <Icon style={{ width: '2.8cqw', height: '2.8cqw' }} strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          {title ? (
            <div className="font-extrabold leading-tight" style={{ fontSize: '2.3cqw', color: look.accent }}>
              {title}
            </div>
          ) : null}
          <p className="whitespace-pre-line font-bold" style={{ fontSize: `${textSize}cqw`, lineHeight: 1.55 }}>
            {text}
          </p>
        </div>
      </div>
      {durationSec ? (
        <div className="bg-black/25" style={{ height: '0.5cqw' }} aria-hidden="true">
          <div className="bar-fill h-full" style={{ background: look.accent, animationDuration: `${durationSec}s` }} />
        </div>
      ) : null}
    </div>
  );
});

/** معاينة 16:9 للوحة المشرف بنفس مظهر الشاشة */
export function AnnouncementPreview({ title, text, style, mode }: Omit<Props, 'durationSec'> & { mode: AnnounceMode }) {
  const shown = text.trim() || 'نص الإعلان يظهر هنا…';
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-line bg-gradient-to-br from-amber-50 via-white to-amber-100">
      {mode === 'full' ? (
        <AnnouncementFull title={title.trim()} text={shown} style={style} />
      ) : (
        <>
          <div className="absolute inset-x-0 top-0 z-10">
            <AnnouncementBanner title={title.trim()} text={shown} style={style} />
          </div>
          <div className="absolute inset-x-0 bottom-0 top-[30%] flex items-center justify-center text-sm font-bold text-ink-soft/60" aria-hidden="true">
            (التهاني تستمر هنا)
          </div>
        </>
      )}
    </div>
  );
}
