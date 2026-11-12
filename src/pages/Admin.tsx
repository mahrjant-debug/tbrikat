import { useState } from 'react';
import { Bell, BellOff, Ban, Handshake, Images, Inbox, Loader2, LogOut, Settings2, Volume2, VolumeX, X } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { ToastProvider } from '../components/ui';
import { useAdminAlerts } from '../hooks/useAdminAlerts';
import { useAllCongrats, useAsset, useBannedWords, usePartners, usePhotos, useSettings } from '../hooks/useData';
import { logout, useAuth } from '../lib/auth';
import { BannedTab } from './admin/BannedTab';
import { CongratsTab } from './admin/CongratsTab';
import { Login } from './admin/Login';
import { PartnersTab } from './admin/PartnersTab';
import { PhotosTab } from './admin/PhotosTab';
import { SettingsTab } from './admin/SettingsTab';

type Tab = 'congrats' | 'banned' | 'photos' | 'partners' | 'settings';

const TABS: { id: Tab; label: string; icon: typeof Inbox }[] = [
  { id: 'congrats', label: 'التهاني', icon: Inbox },
  { id: 'banned', label: 'الكلمات المحظورة', icon: Ban },
  { id: 'photos', label: 'الصور', icon: Images },
  { id: 'partners', label: 'الشركاء', icon: Handshake },
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
          <Panel email={auth.user.email ?? ''} />
        )}
      </div>
    </ToastProvider>
  );
}

/** لوحة التحكم: تُحمَّل بياناتها (اشتراكات واحدة ثابتة) بعد تسجيل الدخول فقط */
function Panel({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>('congrats');
  const alerts = useAdminAlerts();
  const { list } = useAllCongrats(alerts.onArrived);
  const { settings } = useSettings();
  const { words, compiled } = useBannedWords();
  const photos = usePhotos();
  const partners = usePartners();
  const logo = useAsset('logo');
  const customBg = useAsset('background');

  const pendingCount = list.filter((c) => c.status === 'pending').length;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-8 pt-16">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-cairo text-2xl font-extrabold text-ink">لوحة المشرف</h1>
          <p className="text-xs text-ink-soft" dir="ltr">
            {email}
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
              onClick={() => setTab(t.id)}
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
      {tab === 'photos' ? <PhotosTab photos={photos} /> : null}
      {tab === 'partners' ? <PartnersTab partners={partners} /> : null}
      {tab === 'settings' ? <SettingsTab settings={settings} logo={logo} customBg={customBg} /> : null}
    </main>
  );
}
