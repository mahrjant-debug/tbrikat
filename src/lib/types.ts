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

export interface BannedWord {
  id: string;
  word: string;
}

export type BusMessage =
  | { type: 'approved'; cards: Congrat[] }
  | { type: 'spotlight'; photoId: string; at: number }
  | { type: 'sponsor'; partnerId: string; at: number }
  | { type: 'video'; videoId: string; at: number };

export interface AdminProfile {
  /** بريد المشرف بأحرف صغيرة، وهو أيضاً معرّف الوثيقة */
  email: string;
  name: string;
  /** owner = المشرف الرئيسي (لا يُحذف) */
  role: 'admin' | 'owner';
  createdAt: number;
  createdBy?: string;
}
