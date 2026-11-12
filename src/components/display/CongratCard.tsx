import { Quote } from 'lucide-react';
import type { Congrat } from '../../lib/types';

function textSize(len: number): string {
  if (len <= 50) return 'text-[3.4rem] leading-[1.7]';
  if (len <= 100) return 'text-[2.8rem] leading-[1.7]';
  if (len <= 150) return 'text-[2.3rem] leading-[1.75]';
  return 'text-[1.95rem] leading-[1.8]';
}

/** بطاقة التهنئة الكبيرة */
export function CongratCard({ card, badge }: { card: Congrat; badge?: string }) {
  return (
    <div className="gold-frame relative mx-auto flex h-full w-full max-w-[72rem] flex-col items-center justify-center rounded-[2rem] px-[6%] py-8 text-center">
      {badge ? (
        <span className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-6 py-1.5 font-cairo text-lg font-extrabold text-white shadow-lg">
          {badge}
        </span>
      ) : null}
      <Quote className="mb-3 h-12 w-12 rotate-180 text-gold" aria-hidden="true" />
      <p className={`font-amiri font-bold text-ink [text-wrap:balance] ${textSize(card.text.length)}`}>{card.text}</p>
      <div className="mt-6 flex items-center gap-4">
        <span className="h-px w-16 bg-gradient-to-l from-gold to-transparent" />
        <span className="gold-text font-cairo text-[2rem] font-extrabold">{card.name}</span>
        <span className="h-px w-16 bg-gradient-to-r from-gold to-transparent" />
      </div>
    </div>
  );
}
