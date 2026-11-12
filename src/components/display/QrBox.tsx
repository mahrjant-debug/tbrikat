import { memo, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Maximize2, Smartphone } from 'lucide-react';
import { Modal } from '../ui';

/** رمز QR دائم يفتح صفحة التهنئة بالنطاق الحالي، قابل للتكبير */
export const QrBox = memo(function QrBox() {
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass group flex w-full flex-col items-center gap-2 rounded-[1.4rem] p-3 text-center transition hover:shadow-xl"
        aria-label="تكبير رمز QR"
      >
        <div className="flex items-center gap-2 font-cairo text-[1.15rem] font-extrabold text-accent">
          <Smartphone className="h-5 w-5" aria-hidden="true" />
          بارك للعرسان من هاتفك
        </div>
        <div className="relative aspect-square w-full max-w-[15rem] overflow-hidden rounded-xl bg-white p-2 shadow-inner">
          {src ? <img src={src} alt="رمز QR لصفحة التهنئة" className="h-full w-full" draggable={false} /> : null}
          <span className="absolute bottom-1.5 start-1.5 rounded-full bg-paper/90 p-1 text-ink-soft opacity-0 transition group-hover:opacity-100">
            <Maximize2 size={14} />
          </span>
        </div>
        <div className="font-almarai text-[0.95rem] text-ink-soft">امسح الرمز لإرسال تهنئتك</div>
      </button>
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
