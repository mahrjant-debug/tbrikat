/** خلفيات جاهزة مرسومة برمجياً (SVG مضمّن) — لا ملفات خارجية */

function svg(body: string, size: number): string {
  const s = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
}

export interface BackgroundPreset {
  id: string;
  label: string;
  /** قيمة خاصية background-image أو '' */
  image: string;
  size: string;
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { id: 'none', label: 'سادة', image: '', size: 'auto' },
  {
    id: 'arabesque',
    label: 'نجمة إسلامية',
    size: '120px 120px',
    image: svg(
      `<g fill='none' stroke='#b8892b' stroke-width='1.2'>
        <path d='M60 6 L74 30 L102 30 L88 54 L102 78 L74 78 L60 102 L46 78 L18 78 L32 54 L18 30 L46 30 Z' transform='translate(0 8)'/>
        <circle cx='60' cy='60' r='14'/>
        <path d='M0 60 H18 M102 60 H120 M60 0 V10 M60 110 V120'/>
      </g>`,
      120,
    ),
  },
  {
    id: 'lattice',
    label: 'شبكة معينات',
    size: '64px 64px',
    image: svg(
      `<g fill='none' stroke='#b8892b' stroke-width='1'><path d='M32 0 L64 32 L32 64 L0 32 Z'/><path d='M32 16 L48 32 L32 48 L16 32 Z'/></g>`,
      64,
    ),
  },
  {
    id: 'dots',
    label: 'نقاط ذهبية',
    size: '36px 36px',
    image: svg(`<circle cx='18' cy='18' r='2.2' fill='#b8892b'/><circle cx='0' cy='0' r='1.4' fill='#b8892b'/><circle cx='36' cy='36' r='1.4' fill='#b8892b'/>`, 36),
  },
  {
    id: 'waves',
    label: 'أمواج ناعمة',
    size: '160px 40px',
    image: `url("data:image/svg+xml,${encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='40' viewBox='0 0 160 40'><path d='M0 20 Q20 0 40 20 T80 20 T120 20 T160 20' fill='none' stroke='#b8892b' stroke-width='1.2'/></svg>",
    )}")`,
  },
];

export function getPreset(id: string): BackgroundPreset {
  return BACKGROUND_PRESETS.find((p) => p.id === id) ?? BACKGROUND_PRESETS[1];
}
