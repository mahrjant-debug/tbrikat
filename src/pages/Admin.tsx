import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, Ban, Clapperboard, Handshake, Megaphone, PartyPopper, Images, Inbox, Loader2, LogOut, Settings2, ShieldAlert, Users, Volume2, VolumeX, X } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { ToastProvider } from '../components/ui';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useAdminAlerts } from '../hooks/useAdminAlerts';
import { useAllCongrats, useAnnouncements, useAsset, useBannedWords, usePartners, usePhotos, useSettings, useVideoConfig, useVideos } from '../hooks/useData';
import { logout, useAuth } from '../lib/auth';
import { backfillApprovedAt, patchSettings, subscribeAdmins } from '../lib/db';
import type { AdminProfile, Settings } from '../lib/types';
import { AdminsTab } from './admin/AdminsTab';
import { AnnouncementsTab } from './admin/AnnouncementsTab';
import { EndTab } from './admin/EndTab';
import { BannedTab } from './admin/BannedTab';
import { CongratsTab } from './admin/CongratsTab';
import { Login } from './admin/Login';
import { PartnersTab } from './admin/PartnersTab';
import { PhotosTab } from './admin/PhotosTab';
import { SettingsTab } from './admin/SettingsTab';
import { VideosTab } from './admin/VideosTab';

type Tab = 'congrats' | 'banned' | 'photos' | 'videos' | 'partners' | 'announcements' | 'ending' | 'admins' | 'settings';

const TABS: { id: Tab; label: string; icon: typeof Inbox }[] = [
  { id: 'congrats', label: 'التهاني', icon: Inbox },
  { id: 'partners', label: 'شركاء النجاح', icon: Handshake },
  { id: 'announcements', label: 'الإعلانات', icon: Megaphone },
  { id: 'photos', label: 'صور العرسان', icon: Images },
  { id: 'videos', label: 'الفيديو', icon: Clapperboard },
  { id: 'banned', label: 'الكلمات المحظورة', icon: Ban },
  { id: 'ending', label: 'نهاية الحفل', icon: PartyPopper },
  { id: 'admins', label: 'المشرفون', icon: Users },
  { id: 'settings', label: 'الإعدادات', icon: Settings2 },
];

export default function Admin() {
  const auth = useAuth();
  return (
    <ToastProvider>
      <div data-theme="royal" className="min-h-dvh bg-[#fbf7ee]">
        <Navbar />
        {auth.status === 'loading' ? (
          <div className="flex min-h-dvh items-center justify-center text-accent" role="status" aria-label="جارٍ التحميل">
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : auth.status === 'out' ? (
          <Login />
        ) : (
          <Gate email={auth.user.email ?? ''} displayName={auth.user.displayName ?? ''} />
        )}
      </div>
    </ToastProvider>
  );
}

/** بوابة الصلاحيات: لا يُفتح شيء من اللوحة قبل التحقق أن الحساب مشرف */
function Gate({ email, displayName }: { email: string; displayName: string }) {
  const access = useAdminAccess(email, displayName);
  if (access.status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center text-accent" role="status" aria-label="جارٍ التحقق من الصلاحية">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }
  if (access.status === 'denied') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldAlert size={48} className="text-red-500" />
        <h1 className="font-cairo text-2xl font-extrabold text-ink">ليس لديك صلاحية المشرف</h1>
        <p className="leading-7 text-ink-soft">
          الحساب <span dir="ltr" className="font-bold">{email}</span> ليس ضمن المشرفين. اطلب من المشرف الرئيسي إضافتك، أو سجّل الدخول بحساب آخر.
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2.5 font-bold text-white hover:brightness-110"
        >
          <LogOut size={16} /> تسجيل الخروج
        </button>
      </main>
    );
  }
  return <Panel me={access.profile} />;
}

/** لوحة التحكم: تُحمَّل بياناتها (اشتراكات واحدة ثابتة) بعد التحقق من الصلاحية فقط */
function Panel({ me }: { me: AdminProfile }) {
  const [tab, setTab] = useState<Tab>('congrats');
  // تبويبات الصور/الشركاء/الفيديو/المشرفين/الإعدادات لا تشترك في بياناتها إلا عند فتحها أول مرة (ثم تبقى مشتركة دون إعادة قراءة)
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set<Tab>(['congrats']));
  const openTab = (t: Tab) => {
    setTab(t);
    setVisited((v) => (v.has(t) ? v : new Set(v).add(t)));
  };
  const alerts = useAdminAlerts();
  const { list, loaded: congratsLoaded } = useAllCongrats(alerts.onArrived);
  const { settings, loaded: settingsLoaded } = useSettings();
  const { words, compiled, synced: bannedSynced } = useBannedWords();

  // مزامنة الكلمات المحظورة إلى وثيقة الإعدادات (تقرؤها صفحة الضيف في قراءة واحدة)
  useEffect(() => {
    if (!bannedSynced || !settingsLoaded) return;
    const want = Array.from(new Set(words.map((w) => w.word))).sort();
    const have = [...settings.bannedWords].sort();
    if (want.length === have.length && want.every((w, i) => w === have[i])) return;
    const t = window.setTimeout(() => void patchSettings({ bannedWords: want }).catch(() => undefined), 1500);
    return () => window.clearTimeout(t);
  }, [words, bannedSynced, settingsLoaded, settings.bannedWords]);

  // تعبئة approvedAt للتهاني المعتمدة القديمة (أُنشئت معتمدة دونه) كي تظهر في استعلام شاشة العرض المرتّب
  const backfilledRef = useRef(false);
  useEffect(() => {
    if (!congratsLoaded || backfilledRef.current) return;
    backfilledRef.current = true;
    const missing = list.filter((c) => c.status === 'approved' && c.approvedAt === undefined);
    if (missing.length) void backfillApprovedAt(missing.map((c) => ({ id: c.id, createdAt: c.createdAt }))).catch(() => undefined);
  }, [congratsLoaded, list]);

  const pendingCount = list.filter((c) => c.status === 'pending').length;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-8 pt-16">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-cairo text-2xl font-extrabold text-ink">لوحة المشرف</h1>
          <p className="text-xs text-ink-soft">
            {me.name} · <span dir="ltr">{me.email}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => alerts.setSoundOn(!alerts.soundOn)}
            aria-pressed={alerts.soundOn}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-ink hover:bg-accent-soft"
          >
            {alerts.soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            صوت التنبيه
          </button>
          {alerts.notifPermission !== 'unsupported' ? (
            <button
              type="button"
              disabled={alerts.notifPermission !== 'default'}
              onClick={() => void alerts.requestNotifications()}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-ink hover:bg-accent-soft disabled:opacity-70"
            >
              {alerts.notifPermission === 'granted' ? <Bell size={16} className="text-emerald-600" /> : <BellOff size={16} />}
              {alerts.notifPermission === 'granted' ? 'الإشعارات مفعّلة' : alerts.notifPermission === 'denied' ? 'الإشعارات محجوبة' : 'تفعيل إشعارات المتصفح'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void logout()}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
          >
            <LogOut size={16} /> خروج
          </button>
        </div>
      </div>

      {alerts.banner ? (
        <div role="alert" className="pulse-ring mb-4 flex items-center justify-between gap-3 rounded-2xl bg-accent px-4 py-3 text-white shadow-lg">
          <div className="flex items-center gap-2 font-cairo font-bold">
            <Bell size={20} />
            {alerts.banner.count > 1
              ? `وصلت ${alerts.banner.count} تهانٍ جديدة بانتظار المراجعة`
              : `تهنئة جديدة من ${alerts.banner.name} بانتظار المراجعة`}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTab('congrats');
                alerts.dismissBanner();
              }}
              className="rounded-lg bg-white/20 px-3 py-1 text-sm font-bold hover:bg-white/30"
            >
              مراجعة
            </button>
            <button type="button" onClick={alerts.dismissBanner} aria-label="إغلاق التنبيه" className="rounded-lg p-1 hover:bg-white/20">
              <X size={18} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-white p-1" role="tablist" aria-label="أقسام اللوحة">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => openTab(t.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                tab === t.id ? 'bg-accent text-white' : 'text-ink hover:bg-accent-soft'
              }`}
            >
              <Icon size={17} />
              {t.label}
              {t.id === 'congrats' && pendingCount > 0 ? (
                <span className="rounded-full bg-red-500 px-1.5 text-xs text-white tabular-nums">{pendingCount}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === 'congrats' ? <CongratsTab list={list} banned={compiled} /> : null}
      {tab === 'banned' ? <BannedTab words={words} compiled={compiled} /> : null}
      {visited.has('announcements') ? (
        <div hidden={tab !== 'announcements'}>
          <AnnouncementsPane />
        </div>
      ) : null}
      {visited.has('ending') ? (
        <div hidden={tab !== 'ending'}>
          <EndTab settings={settings} />
        </div>
      ) : null}
      {visited.has('photos') ? (
        <div hidden={tab !== 'photos'}>
          <PhotosPane />
        </div>
      ) : null}
      {visited.has('partners') ? (
        <div hidden={tab !== 'partners'}>
          <PartnersPane />
        </div>
      ) : null}
      {visited.has('videos') ? (
        <div hidden={tab !== 'videos'}>
          <VideosPane />
        </div>
      ) : null}
      {visited.has('admins') ? (
        <div hidden={tab !== 'admins'}>
          <AdminsPane me={me} />
        </div>
      ) : null}
      {visited.has('settings') ? (
        <div hidden={tab !== 'settings'}>
          <SettingsPane settings={settings} />
        </div>
      ) : null}
    </main>
  );
}

// كل غلاف يشترك في بياناته عند أول عرض له فقط (انظر visited أعلاه)
function AnnouncementsPane() {
  const announcements = useAnnouncements();
  return <AnnouncementsTab announcements={announcements} />;
}

function PhotosPane() {
  const photos = usePhotos();
  return <PhotosTab photos={photos} />;
}

function PartnersPane() {
  const partners = usePartners();
  return <PartnersTab partners={partners} />;
}

function VideosPane() {
  const videos = useVideos();
  const { config } = useVideoConfig();
  return <VideosTab videos={videos} config={config} />;
}

function AdminsPane({ me }: { me: AdminProfile }) {
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  useEffect(() => subscribeAdmins(setAdmins), []);
  return <AdminsTab admins={admins} me={me} />;
}

function SettingsPane({ settings }: { settings: Settings }) {
  const logo = useAsset('logo');
  const customBg = useAsset('background');
  const footerImg = useAsset('footer');
  return <SettingsTab settings={settings} logo={logo} customBg={customBg} footerImg={footerImg} />;
}
