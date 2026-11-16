/** أدوات يوتيوب: تحليل الرابط، فحص صلاحية الفيديو للتضمين، وتحميل مشغّل IFrame API مرة واحدة. */

export interface ParsedYouTube {
  videoId: string;
  /** ثانية البدء (من t= أو start=)، 0 إن لم تُحدد */
  start: number;
}

const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
  'www.youtu.be',
]);

/** يقبل 90 أو 90s أو 1m30s أو 1h2m3s */
function parseStart(v: string | null): number {
  if (!v) return 0;
  if (/^\d+$/.test(v)) return Math.min(Number(v), 86_400);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(v);
  if (!m || (!m[1] && !m[2] && !m[3])) return 0;
  return Math.min(Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0), 86_400);
}

export function parseYouTube(input: string): ParsedYouTube | { error: string } {
  const raw = input.trim();
  if (!raw) return { error: 'الصق رابط الفيديو.' };
  if (ID_RE.test(raw)) return { videoId: raw, start: 0 };

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return { error: 'هذا ليس رابطاً صحيحاً.' };
  }
  if (!HOSTS.has(url.hostname.toLowerCase())) return { error: 'الرابط ليس من يوتيوب.' };

  const parts = url.pathname.split('/').filter(Boolean);
  let id = '';
  if (url.hostname.toLowerCase().endsWith('youtu.be')) id = parts[0] ?? '';
  else if (parts[0] === 'watch') id = url.searchParams.get('v') ?? '';
  else if (['embed', 'shorts', 'live', 'v'].includes(parts[0] ?? '')) id = parts[1] ?? '';

  if (!ID_RE.test(id)) {
    if (url.searchParams.has('list') || parts[0] === 'playlist') {
      return { error: 'قوائم التشغيل غير مدعومة. افتح فيديو واحداً وانسخ رابطه.' };
    }
    return { error: 'لم أجد معرّف فيديو في هذا الرابط. انسخ رابط الفيديو نفسه.' };
  }
  return { videoId: id, start: parseStart(url.searchParams.get('t') ?? url.searchParams.get('start')) };
}

export type VideoCheck =
  | { status: 'ok'; title: string }
  | { status: 'not-found' }
  | { status: 'blocked' }
  | { status: 'unknown' };

/**
 * فحص سريع عبر oEmbed: 200 = متاح وقابل للتضمين، 404 = محذوف/خاص، 401/403 = التضمين معطّل.
 * أي فشل في الشبكة (أو منع CORS) يُعاد كـ unknown ولا يمنع الحفظ.
 */
export async function checkVideo(videoId: string): Promise<VideoCheck> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
      { signal: ctrl.signal },
    );
    if (res.ok) {
      const j = (await res.json()) as { title?: unknown };
      return { status: 'ok', title: typeof j.title === 'string' ? j.title : '' };
    }
    if (res.status === 404 || res.status === 400) return { status: 'not-found' };
    if (res.status === 401 || res.status === 403) return { status: 'blocked' };
    return { status: 'unknown' };
  } catch {
    return { status: 'unknown' };
  } finally {
    window.clearTimeout(timer);
  }
}

export const thumbnailUrl = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

// ---------------- تحميل IFrame API ----------------

/** الأجزاء التي نستخدمها فقط من واجهة YT */
export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  setVolume(v: number): void;
  destroy(): void;
}
export interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      host?: string;
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number; target: YTPlayer }) => void;
        onError?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number };
}

let apiPromise: Promise<YTNamespace> | null = null;

export function loadYouTubeApi(timeoutMs = 10_000): Promise<YTNamespace> {
  const w = window as unknown as { YT?: YTNamespace & { loaded?: number }; onYouTubeIframeAPIReady?: () => void };
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      apiPromise = null; // نسمح بمحاولة جديدة في العرض التالي (انقطاع إنترنت مؤقت)
      reject(new Error('youtube-api-timeout'));
    }, timeoutMs);
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      window.clearTimeout(timer);
      if (w.YT?.Player) resolve(w.YT);
      else {
        apiPromise = null;
        reject(new Error('youtube-api-missing'));
      }
    };
    if (!document.querySelector('script[data-yt-api]')) {
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.dataset.ytApi = '1';
      s.onerror = () => {
        window.clearTimeout(timer);
        s.remove();
        apiPromise = null;
        reject(new Error('youtube-api-blocked'));
      };
      document.head.appendChild(s);
    }
  });
  return apiPromise;
}
