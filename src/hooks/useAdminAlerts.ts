import { useCallback, useEffect, useRef, useState } from 'react';
import { playAlert } from '../lib/sound';
import { safeStorage } from '../lib/storage';
import type { Congrat } from '../lib/types';

const SOUND_KEY = 'cw.adminAlertSound';

export interface ArrivalBanner {
  count: number;
  name: string;
}

/**
 * تنبيهات وصول تهنئة جديدة للمشرف: نغمة، اهتزاز، شريط، وميض عنوان التبويب، وإشعار المتصفح.
 * تبديل الصوت يتم عبر ref فلا يُعاد الاشتراك في السحابة.
 */
export function useAdminAlerts() {
  const [soundOn, setSoundOnState] = useState(() => safeStorage.get(SOUND_KEY) !== '0');
  const soundRef = useRef(soundOn);
  const [banner, setBanner] = useState<ArrivalBanner | null>(null);
  const [unseen, setUnseen] = useState(0);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );

  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  const setSoundOn = useCallback((v: boolean) => {
    setSoundOnState(v);
    safeStorage.set(SOUND_KEY, v ? '1' : '0');
  }, []);

  const onArrived = useCallback((cards: Congrat[]) => {
    if (!cards.length) return;
    if (soundRef.current) playAlert();
    try {
      // المتصفح يمنع الاهتزاز (ويسجّل خطأ) قبل أي تفاعل من المستخدم مع الصفحة
      if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.([220, 100, 220]);
    } catch {
      /* غير مدعوم */
    }
    setBanner((prev) => ({ count: (prev?.count ?? 0) + cards.length, name: cards[0].name }));
    setUnseen((n) => n + cards.length);
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const first = cards[0];
        new Notification(cards.length > 1 ? `وصلت ${cards.length} تهانٍ جديدة` : 'تهنئة جديدة بانتظار المراجعة', {
          body: cards.length > 1 ? undefined : `${first.name}: ${first.text}`,
          tag: 'cw-new-congrat',
          lang: 'ar',
          dir: 'rtl',
        });
      }
    } catch {
      /* بعض المتصفحات تمنع Notification بدون Service Worker */
    }
  }, []);

  // وميض عنوان التبويب حتى يعود المشرف إلى الصفحة
  useEffect(() => {
    if (unseen <= 0) return;
    const base = document.title;
    let on = false;
    const flash = window.setInterval(() => {
      on = !on;
      document.title = on ? `(${unseen}) 🔔 تهنئة جديدة!` : base;
    }, 1000);
    const clear = () => setUnseen(0);
    // إن كان المشرف في الصفحة فعلاً يكفي وميض قصير
    const auto = document.hasFocus() && !document.hidden ? window.setTimeout(clear, 6000) : undefined;
    window.addEventListener('focus', clear);
    const onVis = () => !document.hidden && clear();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(flash);
      window.clearTimeout(auto);
      window.removeEventListener('focus', clear);
      document.removeEventListener('visibilitychange', onVis);
      document.title = base;
    };
  }, [unseen]);

  const requestNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const p = await Notification.requestPermission();
      setNotifPermission(p);
    } catch {
      /* تجاهل */
    }
  }, []);

  return {
    soundOn,
    setSoundOn,
    banner,
    dismissBanner: () => setBanner(null),
    notifPermission,
    requestNotifications,
    onArrived,
  };
}
