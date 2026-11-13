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
  showPartners: boolean;
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
  order: number;
}

export interface BannedWord {
  id: string;
  word: string;
}

export type BusMessage =
  | { type: 'approved'; cards: Congrat[] }
  | { type: 'spotlight'; photoId: string; at: number };
