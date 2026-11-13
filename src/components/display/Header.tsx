import { memo, useMemo } from 'react';
import { Award, CalendarDays, MapPin, PartyPopper } from 'lucide-react';
import { formatGregorian, formatHijri } from '../../lib/dates';
import type { Settings } from '../../lib/types';
import { Logo } from '../Logo';

export const Header = memo(function Header({
  settings,
  logo,
  count,
  onCelebrate,
}: {
  settings: Settings;
  logo: string;
  count: number;
  onCelebrate: () => void;
}) {
  const greg = useMemo(() => formatGregorian(settings.gregorianDate), [settings.gregorianDate]);
  const hijri = useMemo(
    () => formatHijri(settings.gregorianDate, settings.hijriDate),
    [settings.gregorianDate, settings.hijriDate],
  );
  const dateText = [greg ? `${greg.dayName}، ${greg.full}` : '', hijri ?? ''].filter(Boolean).join('  •  ');

  return (
    <header className="card-surface grid shrink-0 grid-cols-1 items-center gap-x-6 gap-y-3 rounded-[1.6rem] px-[2%] py-[0.9rem] lg:grid-cols-[1fr_auto_1fr]">
      {/* الهوية (يمين) */}
      <div className="flex min-w-0 items-center gap-4">
        <Logo src={settings.hasLogo ? logo : undefined} className="float-soft h-[4.6rem] w-[4.6rem] shrink-0 rounded-full" />
        <div className="min-w-0 leading-tight">
          <h2 className="truncate font-cairo text-[2rem] font-extrabold text-ink">{settings.names}</h2>
          <p className="truncate font-cairo text-[1.25rem] font-bold text-gold-deep">{settings.title}</p>
        </div>
      </div>

      {/* العنوان والتاريخ (وسط) */}
      <div className="flex min-w-0 flex-col items-center gap-2 text-center">
        <h1 className="gold-title font-cairo text-[3rem] font-black leading-tight">{settings.wallTitle}</h1>
        {dateText || settings.hall ? (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {dateText ? (
              <span className="flex items-center gap-2 rounded-full border border-line bg-paper px-5 py-1 font-almarai text-[1.1rem] font-bold text-ink-soft">
                <CalendarDays className="h-5 w-5 text-gold" aria-hidden="true" />
                {dateText}
              </span>
            ) : null}
            {settings.hall ? (
              <span className="flex items-center gap-2 rounded-full border border-line bg-paper px-5 py-1 font-almarai text-[1.1rem] font-bold text-ink-soft">
                <MapPin className="h-5 w-5 text-gold" aria-hidden="true" />
                {settings.hall}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* العدّاد وزر الاحتفال (يسار) */}
      <div className="flex items-center justify-center gap-3 lg:justify-self-end">
        <div
          className="flex items-center gap-2 rounded-full border border-line bg-paper px-5 py-2 font-cairo font-extrabold text-gold-deep shadow-sm"
          aria-label="عدد التهاني المعتمدة"
        >
          <Award className="float-soft h-6 w-6 text-gold" aria-hidden="true" />
          <span className="text-[1.5rem] tabular-nums">{count}</span>
          <span className="text-[1.05rem]">تهنئة مباركة</span>
        </div>
        <button
          type="button"
          onClick={onCelebrate}
          className="glow-pulse flex items-center gap-2 rounded-full bg-gradient-to-l from-orange-500 to-amber-400 px-5 py-2 font-cairo text-[1.1rem] font-extrabold text-white shadow-md transition hover:brightness-105 active:scale-95"
        >
          <PartyPopper className="wiggle h-5 w-5" aria-hidden="true" />
          احتفال
        </button>
      </div>
    </header>
  );
});
