import type { Settings, VideoConfig } from './types';

export const DEFAULT_SETTINGS: Settings = {
  wallTitle: 'جدارية التهاني والتبريكات',
  photoLabel: 'العريس',
  title: 'حفل الزواج الجماعي',
  names: 'مبروك للعرسان',
  gregorianDate: '',
  hijriDate: '',
  hall: '',
  hasLogo: false,
  backgroundMode: 'preset',
  backgroundPreset: 'arabesque',
  bgOpacity: 35,
  bgBlur: 0,
  theme: 'royal',
  autoApprove: false,
  requireAdminApproval: true,
  displayDuration: 10,
  adaptiveDuration: true,
  stripSpeed: 4,
  soundEnabled: true,
  particlesEnabled: true,
  partnersBox: 'off',
  sponsorEnabled: true,
  sponsorIntervalMin: 5,
  sponsorDurationSec: 10,
  sponsorRibbon: 'شركاء النجاح',
  sponsorMessage:
    'عطاؤكم سنابل خير ساهمت في نجاح مهرجان المنيزلة للزواج الجماعي لعام 1448هـ فشكراً لكم ودمتم لعمل الخير سالمين',
  festivalNumber: '28',
  sponsorFooterHandle: 'JMUNAIZILAH',
  sponsorFooterText: 'إدارة مهرجان الزواج الجماعي بمدينة المنيزلة',
  hasFooterImage: false,
  sponsorTriggerAt: 0,
  sponsorTriggerId: '',
  countdown: { enabled: false, title: 'يبدأ الحفل خلال', target: 0 },
  spotlight: { enabled: false, intervalMin: 10, durationSec: 12 },
  spotlightTriggerAt: 0,
  spotlightPhotoId: '',
  bannedWords: [],
};

export const DEFAULT_VIDEO_CONFIG: VideoConfig = { enabled: false, intervalMin: 15, maxMin: 0, triggerAt: 0, triggerId: '' };

export function normalizeVideoConfig(raw: Record<string, unknown> | undefined): VideoConfig {
  const d = DEFAULT_VIDEO_CONFIG;
  if (!raw) return d;
  return {
    enabled: bool(raw.enabled, d.enabled),
    intervalMin: num(raw.intervalMin, d.intervalMin, 1, 180),
    maxMin: num(raw.maxMin, d.maxMin, 0, 180),
    triggerAt: num(raw.triggerAt, 0, 0, Number.MAX_SAFE_INTEGER),
    triggerId: str(raw.triggerId, ''),
  };
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}
function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

/** دمج آمن لوثيقة الإعدادات الخام مع القيم الافتراضية */
export function normalizeSettings(raw: Record<string, unknown> | undefined): Settings {
  const d = DEFAULT_SETTINGS;
  if (!raw) return d;
  const cd = (raw.countdown ?? {}) as Record<string, unknown>;
  const sp = (raw.spotlight ?? {}) as Record<string, unknown>;
  const theme = raw.theme;
  return {
    wallTitle: str(raw.wallTitle, d.wallTitle),
    photoLabel: str(raw.photoLabel, d.photoLabel),
    title: str(raw.title, d.title),
    names: str(raw.names, d.names),
    gregorianDate: str(raw.gregorianDate, d.gregorianDate),
    hijriDate: str(raw.hijriDate, d.hijriDate),
    hall: str(raw.hall, d.hall),
    hasLogo: bool(raw.hasLogo, d.hasLogo),
    backgroundMode: raw.backgroundMode === 'custom' ? 'custom' : 'preset',
    backgroundPreset: str(raw.backgroundPreset, d.backgroundPreset),
    bgOpacity: num(raw.bgOpacity, d.bgOpacity, 0, 100),
    bgBlur: num(raw.bgBlur, d.bgBlur, 0, 30),
    theme: theme === 'emerald' || theme === 'rose' || theme === 'navy' || theme === 'royal' ? theme : d.theme,
    autoApprove: bool(raw.autoApprove, d.autoApprove),
    requireAdminApproval: bool(raw.requireAdminApproval, d.requireAdminApproval),
    displayDuration: num(raw.displayDuration, d.displayDuration, 3, 120),
    adaptiveDuration: bool(raw.adaptiveDuration, d.adaptiveDuration),
    stripSpeed: num(raw.stripSpeed, d.stripSpeed, 1, 10),
    soundEnabled: bool(raw.soundEnabled, d.soundEnabled),
    particlesEnabled: bool(raw.particlesEnabled, d.particlesEnabled),
    partnersBox: raw.partnersBox === 'mobile' || raw.partnersBox === 'all' ? raw.partnersBox : 'off',
    sponsorEnabled: bool(raw.sponsorEnabled, d.sponsorEnabled),
    sponsorIntervalMin: num(raw.sponsorIntervalMin, d.sponsorIntervalMin, 1, 180),
    sponsorDurationSec: num(raw.sponsorDurationSec, d.sponsorDurationSec, 3, 60),
    sponsorRibbon: str(raw.sponsorRibbon, d.sponsorRibbon),
    sponsorMessage: str(raw.sponsorMessage, d.sponsorMessage),
    festivalNumber: str(raw.festivalNumber, d.festivalNumber),
    sponsorFooterHandle: str(raw.sponsorFooterHandle, d.sponsorFooterHandle),
    sponsorFooterText: str(raw.sponsorFooterText, d.sponsorFooterText),
    hasFooterImage: bool(raw.hasFooterImage, d.hasFooterImage),
    sponsorTriggerAt: num(raw.sponsorTriggerAt, 0, 0, Number.MAX_SAFE_INTEGER),
    sponsorTriggerId: str(raw.sponsorTriggerId, ''),
    countdown: {
      enabled: bool(cd.enabled, d.countdown.enabled),
      title: str(cd.title, d.countdown.title),
      target: num(cd.target, 0, 0, Number.MAX_SAFE_INTEGER),
    },
    spotlight: {
      enabled: bool(sp.enabled, d.spotlight.enabled),
      intervalMin: num(sp.intervalMin, d.spotlight.intervalMin, 1, 180),
      durationSec: num(sp.durationSec, d.spotlight.durationSec, 3, 120),
    },
    spotlightTriggerAt: num(raw.spotlightTriggerAt, 0, 0, Number.MAX_SAFE_INTEGER),
    spotlightPhotoId: str(raw.spotlightPhotoId, ''),
    bannedWords: Array.isArray(raw.bannedWords) ? raw.bannedWords.filter((w): w is string => typeof w === 'string') : [],
  };
}
