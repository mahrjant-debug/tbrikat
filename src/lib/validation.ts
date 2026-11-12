import { containsLinkOrAd, findInWordList, type CompiledWordList } from './arabic';
import { NAME_MAX, TEXT_MAX } from './constants';
import type { CongratStatus, Settings } from './types';

export interface GuestValidation {
  ok: boolean;
  error?: string;
  /** وُجدت كلمة محظورة → تُخفى التهنئة */
  banned: boolean;
  matched?: string;
}

export function cleanSpaces(s: string): string {
  return s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function validateGuest(
  rawName: string,
  rawText: string,
  banned: CompiledWordList,
): GuestValidation {
  const name = cleanSpaces(rawName);
  const text = cleanSpaces(rawText);
  if (name.length < 2) return { ok: false, error: 'يرجى كتابة اسمك (حرفان على الأقل).', banned: false };
  if (name.length > NAME_MAX) return { ok: false, error: `الاسم يجب ألا يتجاوز ${NAME_MAX} حرفاً.`, banned: false };
  if (text.length < 3) return { ok: false, error: 'يرجى كتابة نص التهنئة.', banned: false };
  if (text.length > TEXT_MAX) return { ok: false, error: `التهنئة يجب ألا تتجاوز ${TEXT_MAX} حرفاً.`, banned: false };
  if (containsLinkOrAd(name) || containsLinkOrAd(text)) {
    return { ok: false, error: 'لا يُسمح بالروابط أو الإعلانات أو أرقام الهواتف في التهاني.', banned: false };
  }
  const matched = findInWordList(`${name} ${text}`, banned);
  return { ok: true, banned: matched !== null, matched: matched ?? undefined };
}

/** الحالة الابتدائية للتهنئة: محظورة → hidden، اعتماد تلقائي دون اشتراط المشرف → approved، وإلا pending */
export function initialStatus(
  isBanned: boolean,
  settings: Pick<Settings, 'autoApprove' | 'requireAdminApproval'>,
): CongratStatus {
  if (isBanned) return 'hidden';
  if (settings.autoApprove && !settings.requireAdminApproval) return 'approved';
  return 'pending';
}

