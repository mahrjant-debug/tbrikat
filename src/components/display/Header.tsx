import { memo, useMemo } from 'react';
import { MapPin, MessageSquareHeart } from 'lucide-react';
import { formatGregorian, formatHijri } from '../../lib/dates';
import type { Settings } from '../../lib/types';
import { Logo } from '../Logo';

export const Header = memo(function Header({
  settings,
  logo,
  count,
}: {
  settings: Settings;
  logo: string;
  count: number;
}) {
  const greg = useMemo(() => formatGregorian(settings.gregorianDate), [settings.gregorianDate]);
  const hijri = useMemo(
    () => formatHijri(settings.gregorianDate, settings.hijriDate),
    [settings.gregorianDate, settings.hijriDate],
  );
  return (
    <header className="glass flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-[1.4rem] px-[2%] py-3">
      <div className="flex min-w-0 items-center gap-4">
        <Logo src={settings.hasLogo ? logo : undefined} className="h-[5.2rem] w-[5.2rem] shrink-0" />
        <div className="min-w-0">
          <h1 className="gold-text truncate font-amiri text-[3rem] font-bold leading-tight">{settings.names}</h1>
          <p className="truncate font-cairo text-[1.5rem] font-bold text-ink-soft">{settings.title}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-x-8 gap-y-1 text-ink">
        {greg || hijri ? (
          <div className="text-center font-almarai leading-snug">
            {greg ? (
              <div className="text-[1.35rem] font-bold">
                {greg.dayName} <span className="text-ink-soft">·</span> {greg.full}
              </div>
            ) : null}
            {hijri ? <div className="text-[1.1rem] text-ink-soft">{hijri}</div> : null}
          </div>
        ) : null}
        {settings.hall ? (
          <div className="flex items-center gap-2 font-cairo text-[1.3rem] font-bold">
            <MapPin className="h-6 w-6 text-gold" aria-hidden="true" />
            {settings.hall}
          </div>
        ) : null}
        <div className="flex items-center gap-3 rounded-2xl bg-accent-soft px-5 py-2" aria-label="عدد التهاني المعتمدة">
          <MessageSquareHeart className="h-8 w-8 text-accent" aria-hidden="true" />
          <div className="leading-tight">
            <div className="font-almarai text-[2rem] font-extrabold tabular-nums text-accent">{count}</div>
            <div className="font-cairo text-[0.95rem] font-bold text-ink-soft">تهنئة معتمدة</div>
          </div>
        </div>
      </div>
    </header>
  );
});
