import { memo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Handshake } from 'lucide-react';
import { PARTNERS_ROTATE_MS } from '../../lib/constants';
import type { Partner } from '../../lib/types';

/** «شركاء النجاح»: شريك واحد في كل عرض بشعار كبير واسم كامل، يتبدلون كل 5 ثوانٍ */
export const PartnersBox = memo(function PartnersBox({ partners }: { partners: Partner[] }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, partners.length);

  useEffect(() => {
    if (pages < 2) return;
    const t = window.setInterval(() => setPage((p) => (p + 1) % pages), PARTNERS_ROTATE_MS);
    return () => window.clearInterval(t);
  }, [pages]);

  if (!partners.length) return null;
  const safePage = page % pages;
  const view = partners.slice(safePage, safePage + 1);

  return (
    <section className="card-surface flex shrink-0 flex-col rounded-[1.6rem] p-[1rem]" aria-label="شركاء النجاح">
      <h2 className="mb-2 flex items-center justify-center gap-2 font-cairo text-[1.15rem] font-extrabold text-accent">
        <Handshake className="h-5 w-5" aria-hidden="true" />
        شركاء النجاح
      </h2>
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={safePage}
            className="flex flex-col justify-center gap-[0.7rem]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45 }}
          >
            {view.map((p) => (
              <div key={p.id} className="flex min-h-[6.4rem] items-center gap-[1rem] rounded-2xl border border-line bg-white px-[1rem] py-[0.7rem]">
                {p.logo ? (
                  <img src={p.logo} alt="" className="h-[5rem] w-[5rem] shrink-0 rounded-xl object-contain" draggable={false} />
                ) : (
                  <div className="flex h-[5rem] w-[5rem] shrink-0 items-center justify-center rounded-xl bg-accent-soft font-cairo text-3xl font-extrabold text-accent">
                    {p.name.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0 flex-1 leading-snug">
                  <div className="line-clamp-2 break-words font-cairo text-[1.3rem] font-extrabold text-ink">{p.name}</div>
                  {p.category ? <div className="line-clamp-1 break-words font-almarai text-[1rem] font-bold text-gold-deep">{p.category}</div> : null}
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
});
