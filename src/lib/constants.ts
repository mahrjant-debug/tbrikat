export const NAME_MAX = 50;
export const TEXT_MAX = 200;
export const GUEST_COOLDOWN_MS = 30_000;
export const LONG_TEXT_WORDS = 25;
export const HIGHLIGHT_MS = 7_000;
export const RECENT_APPROVAL_MS = 3 * 60 * 1000;
export const FINALE_MS = 15_000;
export const PARTNERS_ROTATE_MS = 5_000;
/** قيمة triggerId لإيقاف الفيديو الجاري */
export const VIDEO_STOP = '__stop__';
/** قيمة triggerId لسحب الإعلان الجاري */
export const ANNOUNCE_STOP = '__stop__';
export const ANNOUNCE_TEXT_MAX = 600;
/** الشريط العلوي يتسع لنص أقصر؛ للنص الأطول استخدم ملء الشاشة */
export const ANNOUNCE_BANNER_TEXT_MAX = 250;
export const ANNOUNCE_TITLE_MAX = 80;
export const ANNOUNCE_MIN_SEC = 5;
export const ANNOUNCE_MAX_SEC = 3600;
/** أقصى عدد تهانٍ معتمدة تقرأها شاشة العرض (الأحدث أولاً) — يثبّت عدد القراءات لكل تحميل مهما كثرت التهاني */
export const DISPLAY_MAX_CARDS = 150;
/** إن فُتحت الشاشة متأخرة عن موعد فيديو بأقل من هذه المدة يُعرض فور فتحها، وإلا يُعدّ فائتاً */
export const VIDEO_SCHEDULE_GRACE_MS = 10 * 60_000;

export const QUICK_PHRASES: string[] = [
  'ألف مبروك للعرسان، بارك الله لكما وبارك عليكما وجمع بينكما في خير.',
  'اللهم ألّف بين قلبيهما، وارزقهما الذرية الصالحة، وأسعدهما في الدنيا والآخرة.',
  'مبارك الزواج، وعقبى لكل شاب وشابة، والحياة السعيدة لكم بإذن الله.',
  'بارك الله لكم، ورزقكم حياة هانئة مليئة بالحب والمودة والرحمة.',
  'فرحتنا بكم لا توصف، دامت أفراحكم وأسعد الله أيامكم.',
  'تهانينا القلبية للعرسان وأهلهم، جعله الله زواجاً ميمونا مباركاً.',
];

export const THEMES: { id: 'royal' | 'emerald' | 'rose' | 'navy'; label: string; swatch: string }[] = [
  { id: 'royal', label: 'ذهبي ملكي', swatch: '#c99a3b' },
  { id: 'emerald', label: 'زمردي', swatch: '#0b6b4a' },
  { id: 'rose', label: 'وردي', swatch: '#b03a5f' },
  { id: 'navy', label: 'كحلي', swatch: '#1d3a7a' },
];

/** مقترحات أولية للكلمات المحظورة (إعلانات واحتيال) — يضيف المشرف ما يناسبه */
export const SUGGESTED_BANNED: string[] = ['نصب', 'احتيال', 'تسويق', 'استثمار مضمون', 'ربح سريع'];
