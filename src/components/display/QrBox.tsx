import { memo, useEffect, useState, type CSSProperties } from 'react';
import QRCode from 'qrcode';
import { Camera, ExternalLink, Maximize2 } from 'lucide-react';
import { Modal } from '../ui';

/** رمز QR دائم يفتح صفحة التهنئة بالنطاق الحالي، قابل للتكبير */
/** compact: يوجد شركاء تحته، فيصغر الرمز قليلاً ويُخفى السطر الثانوي ليتسع صندوق الشركاء */
export const QrBox = memo(function QrBox({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const [src, setSrc] = useState('');
  const [open, setOpen] = useState(false);
  const url = `${window.location.origin}/congratulate`;

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(url, { width: 720, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#3a2a10', light: '#ffffff' } })
      .then((d) => alive && setSrc(d))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [url]);

  return (
    <>
      <section
        className={`card-surface relative flex flex-col items-center gap-[0.7rem] rounded-[1.6rem] p-[1.1rem] text-center ${
          compact ? 'min-h-0 flex-1 gap-[0.5rem] overflow-hidden' : 'min-h-0 flex-1 justify-center'
        } ${className}`}
      >
        {/* زوايا ذهبية */}
        <span className="pointer-events-none absolute -left-[0.4rem] -top-[0.4rem] h-6 w-6 rounded-tl-xl border-l-[0.2rem] border-t-[0.2rem] border-gold" aria-hidden="true" />
        <span className="pointer-events-none absolute -right-[0.4rem] -top-[0.4rem] h-6 w-6 rounded-tr-xl border-r-[0.2rem] border-t-[0.2rem] border-gold" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-[0.4rem] -left-[0.4rem] h-6 w-6 rounded-bl-xl border-b-[0.2rem] border-l-[0.2rem] border-gold" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-[0.4rem] -right-[0.4rem] h-6 w-6 rounded-br-xl border-b-[0.2rem] border-r-[0.2rem] border-gold" aria-hidden="true" />

        <span className="flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-1 font-cairo text-[1rem] font-extrabold text-gold-deep">
          <Camera className="h-4 w-4" aria-hidden="true" />
          امسح الباركود للتهنئة
        </span>

        <div
          className={`relative aspect-square ${compact ? '' : 'w-full max-w-[16.5rem]'}`}
          style={compact ? { width: 'min(12rem, 20dvh)' } : undefined}
        >
          <span className="ping-ring" aria-hidden="true" />
          <span className="ping-ring delay" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="تكبير رمز QR"
            style={{ '--scan-h': compact ? 'min(10.4rem, 17.4dvh)' : '14.6rem' } as CSSProperties}
            className="relative h-full w-full overflow-hidden rounded-2xl border border-line bg-white p-2 shadow-md transition hover:shadow-xl"
          >
            {src ? <img src={src} alt="رمز QR لصفحة التهنئة" className="h-full w-full" draggable={false} /> : null}
            <span className="scan-line" aria-hidden="true" />
          </button>
        </div>

        <div className="leading-snug">
          <div className="font-cairo text-[1.15rem] font-extrabold text-ink">وجّه كاميرا هاتفك للمسح</div>
          {compact ? null : <div className="font-almarai text-[0.85rem] text-ink-soft">مخصص للالتقاط السريع من بعيد</div>}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <a
            href="/congratulate"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 font-almarai text-[0.95rem] font-bold text-gold-deep underline underline-offset-4"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            فتح صفحة التهنئة
          </a>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1 font-almarai text-[0.95rem] font-bold text-gold-deep transition hover:bg-accent-soft"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
            تكبير الباركود
          </button>
        </div>
      </section>
      <Modal open={open} onClose={() => setOpen(false)} title="امسح الرمز للتهنئة">
        <div className="flex flex-col items-center gap-3">
          {src ? <img src={src} alt="رمز QR مكبّر" className="aspect-square w-full max-w-[26rem] rounded-xl bg-white p-3" /> : null}
          <p dir="ltr" className="break-all text-center text-sm text-ink-soft">
            {url}
          </p>
        </div>
      </Modal>
    </>
  );
});
