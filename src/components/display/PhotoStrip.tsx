import { memo, useMemo, type CSSProperties } from 'react';
import type { Photo } from '../../lib/types';

const ITEM_REM = 14; // تقدير عرض العنصر مع الفراغ (يُستخدم لحساب مدة الحركة فقط)

/** شريط صور العرسان المتحرك مع الاسم تحت كل صورة؛ سرعته من الإعدادات (1 بطيء … 10 سريع) */
export const PhotoStrip = memo(function PhotoStrip({
  photos,
  speed,
  label,
}: {
  photos: Photo[];
  speed: number;
  label: string;
}) {
  const { items, duration } = useMemo(() => {
    if (!photos.length) return { items: [] as Photo[], duration: 60 };
    // المجموعة الواحدة يجب أن تغطي عرض الشريط (≥ 8 عناصر ≈ 131rem > 120rem، وهو أقصى عرض بوحدة rem)،
    // ثم نضاعفها لحلقة سلسة عند الإزاحة بمقدار 50%
    const reps = Math.max(1, Math.ceil(9 / photos.length));
    const set = Array.from({ length: reps }, () => photos).flat();
    const remPerSecond = 1.2 + speed * 0.9;
    return { items: [...set, ...set], duration: Math.max(12, (set.length * ITEM_REM) / remPerSecond) };
  }, [photos, speed]);

  if (!items.length) return null;

  return (
    <div className="card-surface shrink-0 overflow-hidden rounded-[1.6rem] py-[0.8rem]" dir="ltr" aria-label="صور العرسان">
      <div className="marquee-track gap-[1rem] ps-[1rem]" style={{ '--marquee-duration': `${duration}s` } as CSSProperties}>
        {items.map((p, i) => (
          <figure key={`${p.id}-${i}`} className="m-0 shrink-0 text-center"
            style={{ width: 'min(15rem, 22dvh)' }} dir="rtl">
            <div className="photo-frame" style={{ '--glint-delay': `${(i % 9) * 0.8}s` } as CSSProperties}>
              <img src={p.dataUrl} alt={p.name || ''} draggable={false} className="aspect-[1/1] w-full rounded-[0.85rem] object-cover object-top" />
            </div>
            {label || p.name ? (
              <figcaption className="mt-[0.35rem] leading-tight">
                {label ? <div className="font-almarai text-[1.05rem] font-bold text-ink-soft">{label}</div> : null}
                {p.name ? <div className="truncate font-cairo text-[1.3rem] font-extrabold text-ink">{p.name}</div> : null}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </div>
  );
});
