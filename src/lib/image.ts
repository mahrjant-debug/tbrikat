export interface CompressOptions {
  maxDim: number;
  maxBytes: number;
  /** jpeg للصور، png للشعارات (للحفاظ على الشفافية) */
  format: 'jpeg' | 'png';
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('تعذّر قراءة الصورة'));
    };
    img.src = url;
  });
}

function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  const b64 = dataUrl.length - comma - 1;
  return Math.floor((b64 * 3) / 4);
}

function render(img: HTMLImageElement, w: number, h: number, format: 'jpeg' | 'png', quality: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('المتصفح لا يدعم معالجة الصور');
  if (format === 'jpeg') {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
  }
  c.imageSmoothingQuality = 'high';
  c.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', quality);
}

/** ضغط تلقائي: يصغّر الأبعاد ويخفض الجودة حتى يقل الحجم عن الحد */
export async function compressImage(file: File, opts: CompressOptions): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('الملف ليس صورة');
  const img = await loadImage(file);
  let scale = Math.min(1, opts.maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  let quality = 0.86;
  let out = '';
  for (let i = 0; i < 14; i++) {
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    out = render(img, w, h, opts.format, quality);
    if (dataUrlBytes(out) <= opts.maxBytes) return out;
    if (opts.format === 'jpeg' && quality > 0.5) quality -= 0.1;
    else scale *= 0.85;
  }
  throw new Error('تعذّر ضغط الصورة إلى الحجم المطلوب، جرّب صورة أصغر.');
}

export const PHOTO_OPTS: CompressOptions = { maxDim: 1200, maxBytes: 180 * 1024, format: 'jpeg' };
export const BACKGROUND_OPTS: CompressOptions = { maxDim: 1600, maxBytes: 300 * 1024, format: 'jpeg' };
export const LOGO_OPTS: CompressOptions = { maxDim: 360, maxBytes: 90 * 1024, format: 'png' };
