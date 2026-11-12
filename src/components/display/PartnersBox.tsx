import { memo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Handshake } from 'lucide-react';
import { PARTNERS_ROTATE_MS } from '../../lib/constants';
import type { Partner } from '../../lib/types';

/** «شركاء النجاح»: شريكان في كل عرض، يتبدلان كل 5 ثوانٍ */
export const PartnersBox = memo(function PartnersBox({ partners }: { partners: Partner[] }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(partners.length / 2));

  useEffect(() => {
    if (pages < 2) return;
    const t = window.setInterval(() => setPage((p) => (p + 1) % pages), PARTNERS_ROTATE_MS);
    return () => window.clearInterval(t);
  }, [pages]);

  if (!partners.length) return null;
  const safePage = page % pages;
  const view = partners.slice(safePage * 2, safePage * 2 + 2);

  return (
    <section className="glass flex min-h-0 flex-1 flex-col rounded-[1.4rem] p-3" aria-label="شركاء النجاح">
      <h2 className="mb-2 flex items-center justify-center gap-2 font-cairo text-[1.15rem] font-extrabold text-accent">
        <Handshake className="h-5 w-5" aria-hidden="true" />
        شركاء النجاح
      </h2>
      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={safePage}
            className="grid h-full grid-rows-2 gap-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45 }}
          >
            {view.map((p) => (
              <div key={p.id} className="flex min-h-0 items-center gap-3 rounded-xl bg-white/70 px-3 py-2">
                {p.logo ? (
                  <img src={p.logo} alt="" className="h-[3.6rem] w-[3.6rem] shrink-0 rounded-lg object-contain" draggable={false} />
                ) : (
                  <div className="flex h-[3.6rem] w-[3.6rem] shrink-0 items-center justify-center rounded-lg bg-accent-soft font-cairo text-2xl font-extrabold text-accent">
                    {p.name.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate font-cairo text-[1.15rem] font-extrabold text-ink">{p.name}</div>
                  {p.category ? <div className="truncate font-almarai text-[0.95rem] text-gold-deep">{p.category}</div> : null}
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
});
