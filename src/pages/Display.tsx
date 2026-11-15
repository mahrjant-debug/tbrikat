import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Particles } from '../components/Particles';
import { Navbar } from '../components/Navbar';
import { CardStage } from '../components/display/CardStage';
import { CountdownPanel, FinalePanel } from '../components/display/Countdown';
import { Header } from '../components/display/Header';
import { Highlight } from '../components/display/Highlight';
import { PartnersBox } from '../components/display/PartnersBox';
import { PhotoStrip } from '../components/display/PhotoStrip';
import { QrBox } from '../components/display/QrBox';
import { SponsorSlide } from '../components/display/SponsorSlide';
import { Spotlight } from '../components/display/Spotlight';
import { VideoOverlay } from '../components/display/VideoOverlay';
import { getPreset } from '../data/backgrounds';
import { useApprovedCongrats, useAsset, usePartners, usePhotos, useSettings, useVideoConfig, useVideos } from '../hooks/useData';
import { onBus } from '../lib/channel';
import { hasCelebrated, markCelebrated } from '../lib/celebrated';
import { FINALE_MS, VIDEO_SCHEDULE_GRACE_MS, VIDEO_STOP } from '../lib/constants';
import { hasPlayedScheduled, markScheduledPlayed } from '../lib/videoPlayed';
import { usePrefs } from '../lib/prefs';
import { celebrateBurst } from '../lib/confetti';
import { playCelebration, unlockAudio } from '../lib/sound';
import type { Congrat, Partner, Photo, Video } from '../lib/types';

type Phase = 'normal' | 'countdown' | 'finale';
const MAX_TIMEOUT = 2_000_000_000;

export default function Display() {
  const { settings, loaded } = useSettings();
  const logo = useAsset('logo');
  const customBg = useAsset('background');
  const footerImg = useAsset('footer');
  const allPhotos = usePhotos();
  // صور بلا بيانات (من نظام قديم) لا تُعرض
  const photos = useMemo(() => allPhotos.filter((p) => p.dataUrl.startsWith('data:')), [allPhotos]);
  const partners = usePartners();
  const prefs = usePrefs();
  const partnersRef = useRef<Partner[]>([]);
  useEffect(() => {
    partnersRef.current = partners;
  }, [partners]);
  // أي عرض بملء الشاشة يمنع الآخر (شريك / تسليط / فيديو)
  const sponsorActiveRef = useRef(false);
  const spotActiveRef = useRef(false);
  const videoActiveRef = useRef(false);

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
    if (!list.length || phaseRef.current !== 'normal' || sponsorActiveRef.current || videoActiveRef.current) return;
    let photo = photoId ? list.find((p) => p.id === photoId) : undefined;
    if (!photo) {
      spotIndexRef.current = (spotIndexRef.current + 1) % list.length;
      photo = list[spotIndexRef.current];
    }
    spotActiveRef.current = true;
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

  // ---------- شاشة الشريك بملء الشاشة: كل N دقيقة لمدة D ثانية، شريك واحد بالتناوب ----------
  const sponsorIndexRef = useRef(-1);
  const [sponsor, setSponsor] = useState<{ partner: Partner; key: number } | null>(null);
  /** null = لا طلب؛ '' = التالي بالتناوب؛ غير ذلك معرّف شريك محدد (طلب يدوي) */
  const pendingSponsorRef = useRef<string | null>(null);

  const trySponsor = useCallback(() => {
    const want = pendingSponsorRef.current;
    if (want === null) return;
    const list = partnersRef.current;
    if (!list.length) {
      pendingSponsorRef.current = null;
      return;
    }
    // ننتظر حتى تنتهي التهنئة البارزة أو التسليط أو العدّ التنازلي، ثم نعرض
    if (phaseRef.current !== 'normal' || currentRef.current || spotActiveRef.current || sponsorActiveRef.current || videoActiveRef.current) return;
    let partner = want ? list.find((p) => p.id === want) : undefined;
    if (!partner) {
      sponsorIndexRef.current = (sponsorIndexRef.current + 1) % list.length;
      partner = list[sponsorIndexRef.current];
    }
    pendingSponsorRef.current = null;
    sponsorActiveRef.current = true;
    setSponsor({ partner, key: Date.now() });
  }, []);

  const { sponsorEnabled, sponsorIntervalMin } = settings;
  useEffect(() => {
    if (!sponsorEnabled) return;
    const every = window.setInterval(() => {
      if (pendingSponsorRef.current === null) pendingSponsorRef.current = '';
    }, sponsorIntervalMin * 60_000);
    const check = window.setInterval(trySponsor, 1000);
    return () => {
      window.clearInterval(every);
      window.clearInterval(check);
    };
  }, [sponsorEnabled, sponsorIntervalMin, trySponsor]);

  const lastSponsorTriggerRef = useRef<number | null>(null);
  const { sponsorTriggerAt, sponsorTriggerId } = settings;
  useEffect(() => {
    if (!loaded) return;
    if (lastSponsorTriggerRef.current === null) {
      lastSponsorTriggerRef.current = sponsorTriggerAt;
      return;
    }
    if (sponsorTriggerAt === lastSponsorTriggerRef.current) return;
    lastSponsorTriggerRef.current = sponsorTriggerAt;
    if (Date.now() - sponsorTriggerAt < 60_000) pendingSponsorRef.current = sponsorTriggerId;
  }, [loaded, sponsorTriggerAt, sponsorTriggerId]);

  useEffect(
    () =>
      onBus((msg) => {
        if (msg.type !== 'sponsor') return;
        lastSponsorTriggerRef.current = msg.at;
        pendingSponsorRef.current = msg.partnerId;
      }),
    [],
  );

  const onSponsorDone = useCallback(() => {
    sponsorActiveRef.current = false;
    setSponsor(null);
  }, []);

  // ---------- فيديو يوتيوب بملء الشاشة: تلقائي كل N دقيقة بالتناوب، أو يدوي من لوحة المشرف ----------
  const videos = useVideos();
  const { config: videoCfg, loaded: videoCfgLoaded } = useVideoConfig();
  const videosRef = useRef<Video[]>([]);
  useEffect(() => {
    videosRef.current = videos;
  }, [videos]);
  const videoIndexRef = useRef(-1);
  const [video, setVideo] = useState<{ video: Video; key: number } | null>(null);
  /** null = لا طلب؛ '' = التالي بالتناوب؛ غير ذلك معرّف فيديو محدد (طلب يدوي) */
  const pendingVideoRef = useRef<string | null>(null);

  const tryVideo = useCallback(() => {
    const list = videosRef.current;
    const now = Date.now();
    // فيديو حان موعده المستقل ولم يُعرض على هذا الجهاز بعد (له الأولوية على التناوب)
    const due = list.find(
      (v) =>
        v.scheduleAt > 0 &&
        now >= v.scheduleAt &&
        now - v.scheduleAt < VIDEO_SCHEDULE_GRACE_MS &&
        !hasPlayedScheduled(v.id, v.scheduleAt),
    );
    const want = due ? due.id : pendingVideoRef.current;
    if (want === null) return;
    if (!list.length) {
      pendingVideoRef.current = null;
      return;
    }
    // ننتظر انتهاء التهنئة البارزة أو الشريك أو التسليط أو العدّ التنازلي، فلا تضيع تهنئة ولا يتداخل عرضان
    if (
      phaseRef.current !== 'normal' ||
      currentRef.current ||
      spotActiveRef.current ||
      sponsorActiveRef.current ||
      videoActiveRef.current
    )
      return;
    let picked = want ? list.find((v) => v.id === want) : undefined;
    if (!picked) {
      // التناوب التلقائي يشمل الفيديوهات بلا موعد فقط؛ ذات الموعد تُعرض في موعدها
      const rotation = list.filter((v) => !v.scheduleAt);
      if (!rotation.length) {
        pendingVideoRef.current = null;
        return;
      }
      videoIndexRef.current = (videoIndexRef.current + 1) % rotation.length;
      picked = rotation[videoIndexRef.current];
    }
    if (due && picked.id === due.id) markScheduledPlayed(due.id, due.scheduleAt);
    else pendingVideoRef.current = null;
    videoActiveRef.current = true;
    setVideo({ video: picked, key: Date.now() });
  }, []);

  const stopVideo = useCallback(() => {
    pendingVideoRef.current = null;
    videoActiveRef.current = false;
    setVideo(null);
  }, []);

  useEffect(() => {
    const check = window.setInterval(tryVideo, 1000);
    return () => window.clearInterval(check);
  }, [tryVideo]);

  const { enabled: videoEnabled, intervalMin: videoIntervalMin } = videoCfg;
  useEffect(() => {
    if (!videoEnabled) return;
    const every = window.setInterval(() => {
      if (pendingVideoRef.current === null) pendingVideoRef.current = '';
    }, videoIntervalMin * 60_000);
    return () => window.clearInterval(every);
  }, [videoEnabled, videoIntervalMin]);

  const handleVideoCommand = useCallback(
    (id: string) => {
      if (id === VIDEO_STOP) stopVideo();
      else pendingVideoRef.current = id;
    },
    [stopVideo],
  );

  const lastVideoTriggerRef = useRef<number | null>(null);
  const { triggerAt: videoTriggerAt, triggerId: videoTriggerId } = videoCfg;
  useEffect(() => {
    if (!videoCfgLoaded) return;
    if (lastVideoTriggerRef.current === null) {
      lastVideoTriggerRef.current = videoTriggerAt;
      return;
    }
    if (videoTriggerAt === lastVideoTriggerRef.current) return;
    lastVideoTriggerRef.current = videoTriggerAt;
    // لا نُشغّل أمراً قديماً وصل متأخراً (إعادة اتصال بعد انقطاع)
    if (Date.now() - videoTriggerAt < 60_000) handleVideoCommand(videoTriggerId);
  }, [videoCfgLoaded, videoTriggerAt, videoTriggerId, handleVideoCommand]);

  useEffect(
    () =>
      onBus((msg) => {
        if (msg.type !== 'video') return;
        lastVideoTriggerRef.current = msg.at;
        handleVideoCommand(msg.videoId);
      }),
    [handleVideoCommand],
  );

  // عند بدء العدّ التنازلي أو الاحتفال الختامي تُغلق كل العروض بملء الشاشة بدل أن تبقى حالتها عالقة
  useEffect(() => {
    if (phase === 'normal') return;
    if (videoActiveRef.current) stopVideo();
    if (sponsorActiveRef.current) onSponsorDone();
    if (spotActiveRef.current) {
      spotActiveRef.current = false;
      setSpot(null);
    }
  }, [phase, stopVideo, onSponsorDone]);

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
  // المؤثرات الحركية والجزيئات تتبع نفس الخيار (إعدادات المشرف + زر «إخفاء الجزيئات» في الشريط)
  const fx = settings.particlesEnabled && !prefs.hideParticles;
  // الصندوق الصغير للشركاء: مخفي افتراضياً، أو للجوال فقط، أو للجميع
  const showBoxDesktop = settings.partnersBox === 'all' && partners.length > 0;
  const showBoxMobile = settings.partnersBox !== 'off' && partners.length > 0;

  return (
    <MotionConfig reducedMotion="user">
    <div data-theme={settings.theme} className={`stage-bg relative min-h-dvh overflow-hidden lg:h-dvh ${fx ? 'fx' : ''}`}>
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
      {fx ? (
        <>
          <div className="aurora aurora-a" aria-hidden="true" />
          <div className="aurora aurora-b" aria-hidden="true" />
          <Particles />
        </>
      ) : null}

      <Navbar autoHide />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full flex-col gap-[1.2rem] p-[1.4rem] lg:h-full lg:min-h-0 lg:w-[87%] lg:px-0">
        <motion.div
          className="shrink-0 max-lg:order-1"
          initial={{ opacity: 0, y: -36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
        >
          <Header settings={settings} logo={logo} onCelebrate={manualCelebrate} />
        </motion.div>

        <div className="flex min-h-0 flex-1 flex-col gap-[1.6rem] lg:flex-row max-lg:contents">
          <motion.main
            className="relative max-lg:order-2 min-h-[28rem] min-w-0 flex-1 lg:min-h-0"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
          >
            {phase === 'countdown' ? (
              <CountdownPanel title={cdTitle} target={cdTarget} />
            ) : phase === 'finale' ? (
              <FinalePanel title={cdTitle} sound={sound} />
            ) : (
              <CardStage cards={cards} baseDuration={settings.displayDuration} adaptive={settings.adaptiveDuration} />
            )}
            <AnimatePresence>
              {phase === 'normal' && highlight && !sponsor && !video ? (
                <Highlight key={highlight.id} card={highlight} sound={sound} onDone={onHighlightDone} />
              ) : null}
            </AnimatePresence>
          </motion.main>

          <motion.aside
            className="flex w-full shrink-0 flex-col gap-[1.2rem] max-lg:contents lg:min-h-0 lg:w-[26rem]"
            initial={{ opacity: 0, x: -48 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          >
            <QrBox className="max-lg:order-5" compact={showBoxDesktop} />
            {showBoxMobile ? (
              <PartnersBox className={`max-lg:order-4 ${settings.partnersBox === 'mobile' ? 'lg:hidden' : ''}`} partners={partners} />
            ) : null}
          </motion.aside>
        </div>

        {photos.length ? (
          <motion.div
            className="shrink-0 max-lg:order-3"
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45, ease: 'easeOut' }}
          >
            <PhotoStrip photos={photos} speed={settings.stripSpeed} label={settings.photoLabel} />
          </motion.div>
        ) : null}
      </div>

      <AnimatePresence>
        {spot && phase === 'normal' ? (
          <Spotlight
            key={spot.key}
            src={spot.photo.dataUrl}
            name={spot.photo.name}
            label={settings.photoLabel}
            durationSec={durationSec}
            sound={sound}
            onDone={() => {
              spotActiveRef.current = false;
              setSpot(null);
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {sponsor && phase === 'normal' ? (
          <SponsorSlide
            key={sponsor.key}
            partner={sponsor.partner}
            settings={settings}
            festivalLogo={settings.hasLogo ? logo : ''}
            footerImage={settings.hasFooterImage ? footerImg : ''}
            onDone={onSponsorDone}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {video && phase === 'normal' ? (
          <VideoOverlay key={video.key} video={video.video} muted={prefs.muted} maxSec={video.video.durationSec > 0 ? video.video.durationSec : videoCfg.maxMin * 60} onDone={stopVideo} />
        ) : null}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}
