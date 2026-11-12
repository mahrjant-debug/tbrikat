import { memo, useMemo, type CSSProperties } from 'react';
import type { Photo } from '../../lib/types';

/** شريط صور الزوجين المتحرك؛ سرعته من الإعدادات (1 بطيء … 10 سريع) */
export const PhotoStrip = memo(function PhotoStrip({ photos, speed }: { photos: Photo[]; speed: number }) {
  const { items, duration } = useMemo(() => {
    if (!photos.length) return { items: [] as Photo[], duration: 60 };
    // المجموعة الواحدة يجب أن تغطي عرض الشاشة (≥ 14 صورة ≈ 143rem > 120rem، وهو أقصى عرض بوحدة rem)،
    // ثم نضاعفها لحلقة سلسة عند الإزاحة بمقدار 50%
    const reps = Math.max(1, Math.ceil(14 / photos.length));
    const set = Array.from({ length: reps }, () => photos).flat();
    const remPerSecond = 1.2 + speed * 0.9;
    const setWidthRem = set.length * 10.25; // الصورة 9.5rem + فراغ 0.75rem
    return { items: [...set, ...set], duration: Math.max(12, setWidthRem / remPerSecond) };
  }, [photos, speed]);

  if (!items.length) return null;

  return (
    <div className="glass shrink-0 overflow-hidden rounded-[1.4rem] py-2" dir="ltr" aria-label="صور العرسان">
      <div className="marquee-track gap-3 ps-3" style={{ '--marquee-duration': `${duration}s` } as CSSProperties}>
        {items.map((p, i) => (
          <img
            key={`${p.id}-${i}`}
            src={p.dataUrl}
            alt=""
            draggable={false}
            className="h-[9.5rem] w-[9.5rem] shrink-0 rounded-2xl border-2 border-gold-soft object-cover shadow-md"
          />
        ))}
      </div>
    </div>
  );
});
