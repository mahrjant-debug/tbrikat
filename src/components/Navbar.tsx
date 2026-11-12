import { useEffect, useState, type ReactNode } from 'react';
import { Download, Maximize, Minimize, MonitorPlay, Settings2, Smartphone, Sparkle, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { navigate, useRoute, type Route } from '../lib/router';
import { setPref, usePrefs } from '../lib/prefs';
import { promptInstall, useCanInstall } from '../lib/pwa';
import { unlockAudio } from '../lib/sound';

const LINKS: { route: Route; label: string; icon: ReactNode }[] = [
  { route: 'display', label: 'الشاشة', icon: <MonitorPlay size={18} /> },
  { route: 'guest', label: 'صفحة الضيف', icon: <Smartphone size={18} /> },
  { route: 'admin', label: 'المشرف', icon: <Settings2 size={18} /> },
];

function useFullscreen(): [boolean, () => void] {
  const [full, setFull] = useState(() => Boolean(document.fullscreenElement));
  useEffect(() => {
    const on = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggle = () => {
    const op = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    op.catch(() => undefined);
  };
  return [full, toggle];
}

function IconBtn({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-bold transition ${
        active ? 'bg-accent text-white' : 'text-ink hover:bg-accent-soft'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * شريط التنقل العلوي الثابت. في شاشة العرض يختفي تلقائياً ويظهر عند تحريك الفأرة
 * حتى لا يظهر على شاشة القاعة؛ وفي لوحة المشرف يبقى ظاهراً.
 */
export function Navbar({ autoHide = false }: { autoHide?: boolean }) {
  const route = useRoute();
  const prefs = usePrefs();
  const canInstall = useCanInstall();
  const [full, toggleFull] = useFullscreen();
  const [visible, setVisible] = useState(!autoHide);

  useEffect(() => {
    if (!autoHide) return;
    let timer: number | undefined;
    const show = () => {
      setVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setVisible(false), 3500);
    };
    window.addEventListener('mousemove', show);
    window.addEventListener('touchstart', show, { passive: true });
    window.addEventListener('keydown', show);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('mousemove', show);
      window.removeEventListener('touchstart', show);
      window.removeEventListener('keydown', show);
    };
  }, [autoHide]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[150] border-b border-line bg-paper/90 backdrop-blur-md transition-transform duration-300 ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
      onMouseDown={unlockAudio}
    >
      <nav className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-2 px-3" aria-label="التنقل">
        <div className="flex items-center gap-1">
          <Sparkles size={18} className="ms-1 text-gold" aria-hidden="true" />
          {LINKS.map((l) => (
            <a
              key={l.route}
              href={l.route === 'display' ? '/' : l.route === 'guest' ? '/congratulate' : '/admin'}
              onClick={(e) => {
                e.preventDefault();
                navigate(l.route);
              }}
              aria-current={route === l.route ? 'page' : undefined}
              className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-bold transition ${
                route === l.route ? 'bg-accent text-white' : 'text-ink hover:bg-accent-soft'
              }`}
            >
              {l.icon}
              <span className="hidden sm:inline">{l.label}</span>
            </a>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {canInstall ? (
            <IconBtn onClick={() => void promptInstall()} label="تثبيت التطبيق">
              <Download size={18} />
              <span className="hidden md:inline">تثبيت</span>
            </IconBtn>
          ) : null}
          <IconBtn active={prefs.hideParticles} onClick={() => setPref('hideParticles', !prefs.hideParticles)} label={prefs.hideParticles ? 'إظهار الجزيئات' : 'إخفاء الجزيئات'}>
            <Sparkle size={18} />
            <span className="hidden md:inline">{prefs.hideParticles ? 'الجزيئات مخفية' : 'إخفاء الجزيئات'}</span>
          </IconBtn>
          <IconBtn
            active={prefs.muted}
            onClick={() => {
              unlockAudio();
              setPref('muted', !prefs.muted);
            }}
            label={prefs.muted ? 'تشغيل الصوت' : 'كتم الصوت'}
          >
            {prefs.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            <span className="hidden md:inline">{prefs.muted ? 'مكتوم' : 'كتم الصوت'}</span>
          </IconBtn>
          <IconBtn onClick={toggleFull} label={full ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'}>
            {full ? <Minimize size={18} /> : <Maximize size={18} />}
            <span className="hidden md:inline">{full ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'}</span>
          </IconBtn>
        </div>
      </nav>
    </header>
  );
}
