import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Particles } from '../components/Particles';
import { Navbar } from '../components/Navbar';
import { CardStage } from '../components/display/CardStage';
import { CountdownPanel, FinalePanel } from '../components/display/Countdown';
import { Header } from '../components/display/Header';
import { Highlight } from '../components/display/Highlight';
import { PartnersBox } from '../components/display/PartnersBox';
import { PhotoStrip } from '../components/display/PhotoStrip';
import { QrBox } from '../components/display/QrBox';
import { Spotlight } from '../components/display/Spotlight';
import { getPreset } from '../data/backgrounds';
import { useApprovedCongrats, useAsset, usePartners, usePhotos, useSettings } from '../hooks/useData';
import { onBus } from '../lib/channel';
import { hasCelebrated, markCelebrated } from '../lib/celebrated';
import { FINALE_MS } from '../lib/constants';
import { usePrefs } from '../lib/prefs';
import { celebrateBurst } from '../lib/confetti';
import { playCelebration, unlockAudio } from '../lib/sound';
import type { Congrat, Photo } from '../lib/types';

type Phase = 'normal' | 'countdown' | 'finale';
const MAX_TIMEOUT = 2_000_000_000;

export default function Display() {
  const { settings, loaded } = useSettings();
  const logo = useAsset('logo');
  const customBg = useAsset('background');
  const allPhotos = usePhotos();
  // صور بلا بيانات (من نظام قديم) لا تُعرض
  const photos = useMemo(() => allPhotos.filter((p) => p.dataUrl.startsWith('data:')), [allPhotos]);
  const partners = usePartners();
  const prefs = usePrefs();

  const [phase, setPhase] = useState<Phase>('normal');
  const phaseRef = useRef<Phase>('normal');
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // ---------- الاحتفال بالتهاني الجديدة (طابور؛ دفعة كبيرة تُختصر إلى الأحدث) ----------
  const queueRef = useRef<Congrat[]>([]);
  const currentRef = useRef<Congrat | null>(null);
  const [highlight, setHighlight] = useState<Congrat | null>(null);

  const pump = useCallback(() => {
    if (currentRef.current) return;
    const next = queueRef.current.shift() ?? null;
    currentRef.current = next;
    setHighlight(next);
  }, []);

  const enqueue = useCallback(
    (cards: Congrat[]) => {
      const fresh = cards.filter((c) => !hasCelebrated(c.id));
      if (!fresh.length) return;
      fresh.forEach((c) => markCelebrated(c.id));
      queueRef.current.push(...(fresh.length > 3 ? fresh.slice(-1) : fresh));
      pump();
    },
    [pump],
  );

  const onHighlightDone = useCallback(() => {
    currentRef.current = null;
    setHighlight(null);
    pump();
  }, [pump]);

  const { cards } = useApprovedCongrats(enqueue);

  useEffect(
    () =>
      onBus((msg) => {
        if (msg.type === 'approved') enqueue(msg.cards);
      }),
    [enqueue],
  );

  // ---------- العدّ التنازلي: مؤقتات انتقال فقط، لا تحديث كل ثانية في هذه الصفحة ----------
  const { enabled: cdEnabled, target: cdTarget, title: cdTitle } = settings.countdown;
  useEffect(() => {
    let timer: number | undefined;
    const evaluate = () => {
      const now = Date.now();
      if (!cdEnabled || !cdTarget) return setPhase('normal');
      if (now < cdTarget) {
        setPhase('countdown');
        timer = window.setTimeout(evaluate, Math.min(cdTarget - now + 60, MAX_TIMEOUT));
      } else if (now - cdTarget < FINALE_MS) {
        setPhase('finale');
        timer = window.setTimeout(evaluate, cdTarget + FINALE_MS - now + 60);
      } else {
        setPhase('normal');
      }
    };
    evaluate();
    return () => window.clearTimeout(timer);
  }, [cdEnabled, cdTarget]);

  // ---------- تسليط الضوء ----------
  const photosRef = useRef<Photo[]>([]);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  const spotIndexRef = useRef(-1);
  const [spot, setSpot] = useState<{ photo: Photo; key: number } | null>(null);

  const startSpotlight = useCallback((photoId?: string) => {
    const list = photosRef.current;
    if (!list.length || phaseRef.current !== 'normal') return;
    let photo = photoId ? list.find((p) => p.id === photoId) : undefined;
    if (!photo) {
      spotIndexRef.current = (spotIndexRef.current + 1) % list.length;
      photo = list[spotIndexRef.current];
    }
    setSpot({ photo, key: Date.now() });
  }, []);

  const { enabled: spEnabled, intervalMin, durationSec } = settings.spotlight;
  useEffect(() => {
    if (!spEnabled) return;
    const t = window.setInterval(() => startSpotlight(), intervalMin * 60_000);
    return () => window.clearInterval(t);
  }, [spEnabled, intervalMin, startSpotlight]);

  const lastTriggerRef = useRef<number | null>(null);
  const { spotlightTriggerAt, spotlightPhotoId } = settings;
  useEffect(() => {
    if (!loaded) return;
    if (lastTriggerRef.current === null) {
      lastTriggerRef.current = spotlightTriggerAt;
      return;
    }
    if (spotlightTriggerAt === lastTriggerRef.current) return;
    lastTriggerRef.current = spotlightTriggerAt;
    // لا نُشغّل تسليطاً قديماً وصل متأخراً (إعادة اتصال بعد انقطاع)
    if (Date.now() - spotlightTriggerAt < 60_000) startSpotlight(spotlightPhotoId || undefined);
  }, [loaded, spotlightTriggerAt, spotlightPhotoId, startSpotlight]);

  useEffect(
    () =>
      onBus((msg) => {
        if (msg.type !== 'spotlight') return;
        lastTriggerRef.current = msg.at;
        startSpotlight(msg.photoId || undefined);
      }),
    [startSpotlight],
  );

  // ---------- تهيئة الصفحة ----------
  useEffect(() => {
    const prev = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = 'clamp(10px, min(100vw / 120, 100vh / 67.5), 40px)';
    return () => {
      document.documentElement.style.fontSize = prev;
    };
  }, []);

  useEffect(() => {
    document.title = `${settings.names} — ${settings.wallTitle}`;
  }, [settings.names, settings.wallTitle]);

  useEffect(() => {
    const on = () => unlockAudio();
    window.addEventListener('pointerdown', on, { once: true });
    window.addEventListener('keydown', on, { once: true });
    return () => {
      window.removeEventListener('pointerdown', on);
      window.removeEventListener('keydown', on);
    };
  }, []);

  // إبقاء الشاشة مضاءة
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = () => {
      navigator.wakeLock
        ?.request('screen')
        .then((l) => {
          lock = l;
        })
        .catch(() => undefined);
    };
    request();
    const onVis = () => document.visibilityState === 'visible' && request();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      lock?.release().catch(() => undefined);
    };
  }, []);

  const sound = settings.soundEnabled && !prefs.muted;
  const manualCelebrate = useCallback(() => {
    unlockAudio();
    celebrateBurst();
    if (sound) playCelebration();
  }, [sound]);
  const preset = getPreset(settings.backgroundPreset);
  const bgImage = settings.backgroundMode === 'custom' ? (customBg ? `url("${customBg}")` : '') : preset.image;
  const bgCover = settings.backgroundMode === 'custom';

  return (
    <div data-theme={settings.theme} className="stage-bg relative min-h-dvh overflow-hidden lg:h-dvh">
      {bgImage ? (
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage: bgImage,
            backgroundSize: bgCover ? 'cover' : preset.size,
            backgroundPosition: 'center',
            backgroundRepeat: bgCover ? 'no-repeat' : 'repeat',
            opacity: settings.bgOpacity / 100,
            filter: settings.bgBlur ? `blur(${settings.bgBlur}px)` : undefined,
            transform: settings.bgBlur ? 'scale(1.08)' : undefined,
          }}
        />
      ) : null}
      {settings.particlesEnabled && !prefs.hideParticles ? <Particles /> : null}

      <Navbar autoHide />

      <div className="relative z-10 flex min-h-dvh flex-col gap-[1.2rem] p-[1.4rem] lg:h-full lg:min-h-0">
        <Header settings={settings} logo={logo} count={cards.length} onCelebrate={manualCelebrate} />

        <div className="flex min-h-0 flex-1 flex-col gap-[1.6rem] lg:flex-row">
          <main className="relative min-h-[28rem] min-w-0 flex-1 lg:min-h-0">
            {phase === 'countdown' ? (
              <CountdownPanel title={cdTitle} target={cdTarget} />
            ) : phase === 'finale' ? (
              <FinalePanel title={cdTitle} sound={sound} />
            ) : (
              <CardStage cards={cards} baseDuration={settings.displayDuration} adaptive={settings.adaptiveDuration} />
            )}
            <AnimatePresence>
              {phase === 'normal' && highlight ? (
                <Highlight key={highlight.id} card={highlight} sound={sound} onDone={onHighlightDone} />
              ) : null}
            </AnimatePresence>
          </main>

          <aside className="flex w-full shrink-0 flex-col gap-[1.2rem] lg:min-h-0 lg:w-[21rem]">
            <QrBox fill={!(settings.showPartners && partners.length > 0)} />
            {settings.showPartners ? <PartnersBox partners={partners} /> : null}
          </aside>
        </div>

        <PhotoStrip photos={photos} speed={settings.stripSpeed} label={settings.photoLabel} />
      </div>

      <AnimatePresence>
        {spot && phase === 'normal' ? (
          <Spotlight
            key={spot.key}
            src={spot.photo.dataUrl}
            names={settings.names}
            durationSec={durationSec}
            sound={sound}
            onDone={() => setSpot(null)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
