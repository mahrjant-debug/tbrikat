export type CongratStatus = 'pending' | 'approved' | 'hidden';
export type ThemeId = 'royal' | 'emerald' | 'rose' | 'navy';
export type BackgroundMode = 'preset' | 'custom';

export interface Congrat {
  id: string;
  name: string;
  text: string;
  status: CongratStatus;
  /** مللي ثانية منذ 1970 */
  createdAt: number;
  approvedAt?: number;
  /** مدة عرض خاصة بالثواني */
  displayDuration?: number;
}

export interface CountdownSettings {
  enabled: boolean;
  title: string;
  /** وقت مستهدف بالمللي ثانية، 0 = غير محدد */
  target: number;
}

export interface SpotlightSettings {
  enabled: boolean;
  intervalMin: number;
  durationSec: number;
}

export interface Settings {
  /** عنوان الجدارة في وسط الترويسة */
  wallTitle: string;
  /** وصف الصور تحت كل صورة (مثل «العريس») */
  photoLabel: string;
  title: string;
  names: string;
  gregorianDate: string; // YYYY-MM-DD
  hijriDate: string; // تجاوز يدوي (اختياري)
  hall: string;
  hasLogo: boolean;
  backgroundMode: BackgroundMode;
  backgroundPreset: string;
  bgOpacity: number; // 0..100
  bgBlur: number; // px
  theme: ThemeId;
  autoApprove: boolean;
  requireAdminApproval: boolean;
  displayDuration: number; // ثوانٍ
  adaptiveDuration: boolean;
  stripSpeed: number; // 1..10
  soundEnabled: boolean;
  particlesEnabled: boolean;
  /** الصندوق الصغير لشركاء النجاح في الشاشة الرئيسية: مخفي / للجوال فقط / للجميع */
  partnersBox: 'off' | 'mobile' | 'all';
  /** شاشة الشريك بملء الشاشة */
  sponsorEnabled: boolean;
  sponsorIntervalMin: number;
  sponsorDurationSec: number;
  sponsorRibbon: string;
  sponsorMessage: string;
  festivalNumber: string;
  sponsorFooterHandle: string;
  sponsorFooterText: string;
  hasFooterImage: boolean;
  /** يُحدَّث من لوحة المشرف لعرض شريك الآن */
  sponsorTriggerAt: number;
  sponsorTriggerId: string;
  countdown: CountdownSettings;
  spotlight: SpotlightSettings;
  /** يُحدَّث من لوحة المشرف لتشغيل التسليط على الشاشات */
  spotlightTriggerAt: number;
  spotlightPhotoId: string;
  /** نسخة مجمّعة من الكلمات المحظورة (تُزامَن من تبويب الكلمات) ليقرأها الضيف في قراءة واحدة */
  bannedWords: string[];
  /** false = أُنهي استقبال التهاني (تفرضه القواعد أيضاً) */
  acceptingCongrats: boolean;
  /** إغلاق تلقائي للاستقبال في هذا الوقت (مللي ثانية)؛ 0 = بلا */
  closeAt: number;
  /** رسالة الشكر لصفحة الضيف ولصندوق الشكر بالشاشة (فارغة = الرسالة الافتراضية) */
  closingMessage: string;
  /** وضع الذكرى على الشاشة: off = أبداً، auto = عند إغلاق الاستقبال، on = دائماً */
  memoryMode: 'off' | 'auto' | 'on';
}

export interface Photo {
  id: string;
  dataUrl: string;
  /** اسم صاحب الصورة (يظهر تحتها) */
  name: string;
  order: number;
  createdAt: number;
}

export interface Partner {
  id: string;
  name: string;
  category: string;
  logo: string; // dataUrl أو ''
  /** رسالة خاصة بهذا الشريك (اختيارية؛ الافتراضي الرسالة العامة) */
  message: string;
  order: number;
}

/** فيديو يوتيوب يُعرض بملء الشاشة */
export interface Video {
  id: string;
  title: string;
  /** معرّف يوتيوب (11 حرفاً) */
  videoId: string;
  /** ثانية البدء، 0 = من البداية */
  start: number;
  /** موعد عرض مستقل بالمللي ثانية؛ 0 = بلا موعد (يدخل في التناوب/التشغيل اليدوي) */
  scheduleAt: number;
  /** مدة العرض بالثواني؛ 0 = حتى ينتهي الفيديو (أو الحد الأقصى العام) */
  durationSec: number;
  /** عدد مرات عرض الفيديو المجدول (1 = مرة واحدة) */
  repeatCount: number;
  /** الفاصل بين كل عرض والتالي بالدقائق */
  repeatEveryMin: number;
  /** تاريخ انتهاء عرض الفيديو بالمللي ثانية: لا عروض ولا تكرار بعده؛ 0 = بلا تاريخ */
  repeatUntil: number;
  /** false = مخفي: لا يُعرض أبداً (لا تناوب ولا موعد ولا تشغيل يدوي) حتى يُظهَر */
  enabled: boolean;
  order: number;
  createdAt: number;
}

/** إعدادات الفيديو في وثيقة مستقلة settings/video حتى لا يطغى عليها حفظ الإعدادات العامة */
export interface VideoConfig {
  enabled: boolean;
  intervalMin: number;
  /** أقصى مدة للعرض بالدقائق، 0 = حتى ينتهي الفيديو */
  maxMin: number;
  /** يُحدَّث من لوحة المشرف لتشغيل/إيقاف فيديو الآن */
  triggerAt: number;
  /** '' = التالي بالتناوب، VIDEO_STOP = إيقاف، وإلا معرّف وثيقة الفيديو */
  triggerId: string;
}

export type AnnounceStyle = 'gold' | 'emerald' | 'alert' | 'info';
export type AnnounceMode = 'full' | 'banner';

/** إعلان نصي يُنشر من لوحة المشرف ويظهر على الشاشة الرئيسية */
export interface Announcement {
  id: string;
  title: string;
  text: string;
  style: AnnounceStyle;
  /** full = ملء الشاشة، banner = شريط علوي والتهاني تستمر تحته */
  mode: AnnounceMode;
  durationSec: number;
  /** 0 = لا يتكرر؛ وإلا يُعاد كل N دقيقة حتى repeatUntil */
  repeatEveryMin: number;
  repeatUntil: number;
  createdAt: number;
}

export type AnnouncementInput = Omit<Announcement, 'id' | 'createdAt'>;

export interface BannedWord {
  id: string;
  word: string;
}

export type BusMessage =
  | { type: 'approved'; cards: Congrat[] }
  | { type: 'spotlight'; photoId: string; at: number }
  | { type: 'sponsor'; partnerId: string; at: number }
  | { type: 'video'; videoId: string; at: number }
  | { type: 'announce'; id: string; at: number };

export interface AdminProfile {
  /** بريد المشرف بأحرف صغيرة، وهو أيضاً معرّف الوثيقة */
  email: string;
  name: string;
  /** owner = المشرف الرئيسي (لا يُحذف) */
  role: 'admin' | 'owner';
  createdAt: number;
  createdBy?: string;
}
