import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, Square, Volume2 } from 'lucide-react';
import { loadYouTubeApi, type YTPlayer } from '../../lib/youtube';
import type { Video } from '../../lib/types';

/** وقت الانتظار قبل التخلي عن فيديو لم يبدأ (تضمين معطّل، انقطاع إنترنت، منع المتصفح) */
const STALL_MS = 20_000;

/**
 * فيديو يوتيوب بملء الشاشة. يستدعي onDone مرة واحدة عند: انتهاء الفيديو، أو خطأ في التشغيل،
 * أو تعذّر البدء خلال 20 ثانية، أو بلوغ الحد الأقصى للمدة — فلا تتعطل الشاشة أبداً.
 * الصوت: إن تفاعل المستخدم مع الصفحة سابقاً يبدأ بصوت، وإلا يبدأ صامتاً مع زر لتفعيل الصوت.
 */
export function VideoOverlay({
  video,
  muted,
  maxSec,
  onDone,
  onStop,
}: {
  video: Video;
  /** كتم المستخدم (زر «كتم الصوت» في الشريط) */
  muted: boolean;
  /** أقصى مدة عرض بالثواني تُحسب من لحظة بدء التشغيل؛ 0 = حتى ينتهي الفيديو */
  maxSec: number;
  onDone: () => void;
  /** إيقاف يدوي من الشاشة نفسها (زر أو Esc): يلغي أيضاً التكرارات المتبقية */
  onStop: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const mutedRef = useRef(muted);
  const soundAllowedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  const [playing, setPlaying] = useState(false);
  const [needsSound, setNeedsSound] = useState(false);
  const [showStop, setShowStop] = useState(false);
  const stopTimerRef = useRef<number | undefined>(undefined);
  const onStopRef = useRef(onStop);
  useEffect(() => {
    onStopRef.current = onStop;
  });

  // زر الإيقاف يظهر عند تحريك المؤشر أو لمس الشاشة ويختفي بعد 5 ثوانٍ (ولا يختفي والمؤشر فوقه)؛ ومفتاح Esc يوقف دائماً
  const reveal = () => {
    setShowStop(true);
    window.clearTimeout(stopTimerRef.current);
    stopTimerRef.current = window.setTimeout(() => setShowStop(false), 5000);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onStopRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(stopTimerRef.current);
    };
  }, []);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  // كتم/إلغاء كتم من الشريط أثناء العرض
  useEffect(() => {
    mutedRef.current = muted;
    const p = playerRef.current;
    if (!p) return;
    try {
      if (muted) p.mute();
      else if (soundAllowedRef.current) p.unMute();
    } catch {
      /* المشغّل لم يجهز بعد */
    }
  }, [muted]);

  useEffect(() => {
    let disposed = false;
    let finished = false;
    let started = false;
    const host = hostRef.current;
    const finish = () => {
      if (finished || disposed) return;
      finished = true;
      onDoneRef.current();
    };

    const stallTimer = window.setTimeout(() => {
      if (!started) finish();
    }, STALL_MS);
    let maxTimer: number | undefined;

    const nav = navigator as Navigator & { userActivation?: { hasBeenActive: boolean } };
    const startMuted = !(nav.userActivation?.hasBeenActive ?? false) || mutedRef.current;
    soundAllowedRef.current = !startMuted;

    void loadYouTubeApi()
      .then((YT) => {
        if (disposed || !host) return;
        const target = document.createElement('div');
        host.appendChild(target);
        playerRef.current = new YT.Player(target, {
          host: 'https://www.youtube-nocookie.com',
          videoId: video.videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            mute: startMuted ? 1 : 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
            start: video.start,
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              if (mutedRef.current) e.target.mute();
              e.target.playVideo();
              if (startMuted && !mutedRef.current) setNeedsSound(true);
            },
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.PLAYING) {
                if (!started) {
                  started = true;
                  if (maxSec > 0) maxTimer = window.setTimeout(finish, maxSec * 1000);
                }
                setPlaying(true);
              } else if (e.data === YT.PlayerState.ENDED) {
                finish();
              }
            },
            // 2 معرّف خاطئ، 5 خطأ مشغّل، 100 محذوف/خاص، 101/150 التضمين معطّل
            onError: finish,
          },
        });
      })
      .catch(finish);

    return () => {
      disposed = true;
      window.clearTimeout(stallTimer);
      if (maxTimer) window.clearTimeout(maxTimer);
      try {
        playerRef.current?.destroy();
      } catch {
        /* تجاهل */
      }
      playerRef.current = null;
      host?.replaceChildren();
    };
    // مرة واحدة لكل عرض
  }, []);

  const enableSound = () => {
    const p = playerRef.current;
    if (!p) return;
    soundAllowedRef.current = true;
    setNeedsSound(false);
    if (mutedRef.current) return;
    try {
      p.unMute();
      p.setVolume(100);
    } catch {
      /* تجاهل */
    }
  };

  // أي نقرة/لمسة/مفتاح على الصفحة تكفي لتفعيل الصوت
  useEffect(() => {
    if (!needsSound) return;
    const on = () => enableSound();
    window.addEventListener('pointerdown', on, { once: true });
    window.addEventListener('keydown', on, { once: true });
    return () => {
      window.removeEventListener('pointerdown', on);
      window.removeEventListener('keydown', on);
    };
  }, [needsSound]);

  return (
    <motion.div
      className={`fixed inset-0 z-[130] flex items-center justify-center bg-black ${showStop ? '' : 'cursor-none'}`}
      onPointerMove={reveal}
      onPointerDown={reveal}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      role="dialog"
      aria-label={video.title || 'فيديو'}
    >
      {!playing ? (
        <div className="absolute inset-0 flex items-center justify-center text-amber-300" role="status" aria-label="جارٍ تحميل الفيديو">
          <Loader2 className="animate-spin" size={48} />
        </div>
      ) : null}
      <div
        ref={hostRef}
        className="relative aspect-video w-[min(100vw,177.78dvh)] [&_iframe]:pointer-events-none [&_iframe]:h-full [&_iframe]:w-full"
      />
      {showStop ? (
        <button
          type="button"
          onClick={() => onStop()}
          onPointerEnter={() => window.clearTimeout(stopTimerRef.current)}
          onPointerLeave={reveal}
          onFocus={() => window.clearTimeout(stopTimerRef.current)}
          className="absolute left-[3vmin] top-[3vmin] z-20 flex items-center gap-2 rounded-full bg-black/70 px-[2.4vmin] py-[1.2vmin] font-cairo font-extrabold text-white shadow-2xl ring-1 ring-white/30 backdrop-blur hover:bg-red-600"
          style={{ fontSize: 'clamp(0.85rem, 2.2vmin, 1.5rem)' }}
          aria-label="إيقاف الفيديو"
        >
          <Square size={18} /> إيقاف الفيديو
        </button>
      ) : null}
      {needsSound ? (
        <button
          type="button"
          onClick={enableSound}
          className="pulse-ring absolute bottom-[5vmin] left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-amber-400 px-[3vmin] py-[1.4vmin] font-cairo font-extrabold text-black shadow-2xl"
          style={{ fontSize: 'clamp(0.9rem, 2.6vmin, 1.8rem)' }}
        >
          <Volume2 size={22} /> اضغط لتفعيل الصوت
        </button>
      ) : null}
    </motion.div>
  );
}
