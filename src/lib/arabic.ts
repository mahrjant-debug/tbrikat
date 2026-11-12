/**
 * أدوات النص العربي: التطبيع، التقطيع، ومطابقة الكلمات المحظورة بمطابقة كلمة كاملة
 * مع إزالة البوادئ العربية (و، ف، ب، ل، ال) — لا بمطابقة جزء من الكلمة.
 */

const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
const INVISIBLES = /[​-‏‪-‮⁠﻿]/g;

const DIGIT_MAP: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

export function toLatinDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (d) => DIGIT_MAP[d] ?? d);
}

/**
 * تطبيع: التشكيل، التطويل، توحيد الهمزات (أإآٱ→ا، ؤ→و، ئ→ي)،
 * التاء المربوطة→هاء، الألف المقصورة→ياء، دمج تكرار الحروف، وتحويل الترقيم إلى فراغات.
 */
export function normalizeArabic(input: string): string {
  let s = input.normalize('NFKC').toLowerCase();
  s = s.replace(INVISIBLES, '').replace(DIACRITICS, '').replace(/ـ/g, '');
  s = toLatinDigits(s);
  s = s
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ک/g, 'ك')
    .replace(/[یې]/g, 'ي')
    .replace(/ہ|ھ/g, 'ه');
  s = s.replace(/(\p{L})\1+/gu, '$1');
  s = s.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return s;
}

export function tokenize(normalized: string): string[] {
  return normalized.length ? normalized.split(' ') : [];
}

const PREFIXES = ['ال', 'و', 'ف', 'ب', 'ل'];
const MAX_PREFIX_DEPTH = 3;

/**
 * كل الصيغ الممكنة للكلمة بعد إزالة سلسلة بوادئ (مثل: وبالنصب → بالنصب → النصب → نصب).
 * لا تُزال البادئة إذا بقي أقل من حرفين.
 */
export function prefixVariants(token: string): Set<string> {
  const out = new Set<string>([token]);
  let frontier = [token];
  for (let depth = 0; depth < MAX_PREFIX_DEPTH; depth++) {
    const next: string[] = [];
    for (const t of frontier) {
      for (const p of PREFIXES) {
        if (t.length - p.length >= 2 && t.startsWith(p)) {
          const rest = t.slice(p.length);
          if (!out.has(rest)) {
            out.add(rest);
            next.push(rest);
          }
        }
      }
    }
    if (!next.length) break;
    frontier = next;
  }
  return out;
}

/** هل تتطابق عبارة محظورة (كلمات مطبّعة) مع الكلمات ابتداءً من الموضع i؟ */
function phraseMatchesAt(variants: Set<string>[], i: number, phrase: string[]): boolean {
  if (i + phrase.length > variants.length) return false;
  for (let j = 0; j < phrase.length; j++) {
    if (!variants[i + j].has(phrase[j])) return false;
  }
  return true;
}

export interface CompiledWordList {
  phrases: { raw: string; tokens: string[] }[];
}

export function compileWordList(words: string[]): CompiledWordList {
  const phrases: CompiledWordList['phrases'] = [];
  const seen = new Set<string>();
  for (const raw of words) {
    const tokens = tokenize(normalizeArabic(raw));
    if (!tokens.length) continue;
    const key = tokens.join(' ');
    if (seen.has(key)) continue;
    seen.add(key);
    phrases.push({ raw, tokens });
  }
  return { phrases };
}

/** يعيد أول كلمة/عبارة مطابقة (بصيغتها الأصلية) أو null. */
export function findInWordList(text: string, list: CompiledWordList): string | null {
  if (!list.phrases.length) return null;
  const tokens = tokenize(normalizeArabic(text));
  if (!tokens.length) return null;
  const variants = tokens.map(prefixVariants);
  for (const phrase of list.phrases) {
    for (let i = 0; i < tokens.length; i++) {
      if (phraseMatchesAt(variants, i, phrase.tokens)) return phrase.raw;
    }
  }
  return null;
}

export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

// ---------- الروابط والإعلانات ----------

const LINK_PATTERNS: RegExp[] = [
  /(?:https?:\/\/|www\.)\S+/i,
  /\b[a-z0-9-]+\.(?:com|net|org|info|biz|me|io|co|sa|ae|kw|qa|bh|om|eg|app|link|ly|tv|xyz|shop|store|site|online|cc|ws)\b/i,
  /\b(?:t\.me|wa\.me|bit\.ly|goo\.gl|instagram\.com|snapchat\.com|tiktok\.com)\b/i,
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  /(?:^|\s)@[a-z0-9_.]{3,}/i,
];

const AD_WORDS = compileWordList([
  'للبيع',
  'اطلب الان',
  'اطلبه الان',
  'كود خصم',
  'خصم',
  'تخفيضات',
  'عروض خاصه',
  'للتواصل',
  'تواصل معنا',
  'واتساب',
  'واتس اب',
  'سناب',
  'انستقرام',
  'تيك توك',
  'تابعونا',
  'اشترك معنا',
  'رابط',
]);

export function containsLinkOrAd(text: string): boolean {
  const latin = toLatinDigits(text);
  if (LINK_PATTERNS.some((re) => re.test(latin))) return true;
  // أرقام هواتف: 7 أرقام متصلة، أو 9 أرقام فأكثر مفصولة بمسافات/شرطات (التاريخ 12-11-2026 لا يُحسب)
  if (/\d{7,}/.test(latin)) return true;
  for (const m of latin.matchAll(/\+?\d[\d ()\-.]{7,}\d/g)) {
    if (m[0].replace(/\D/g, '').length >= 9) return true;
  }
  return findInWordList(text, AD_WORDS) !== null;
}
