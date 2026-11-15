import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ImagePlus, Loader2, Save, Trash2 } from 'lucide-react';
import { Button, Field, Slider, Toggle, inputCls, useToast } from '../../components/ui';
import { LogoMark } from '../../components/Logo';
import { BACKGROUND_PRESETS } from '../../data/backgrounds';
import { THEMES } from '../../lib/constants';
import { fromLocalInput, toLocalInput } from '../../lib/dates';
import { patchSettings, saveAsset, saveSettings } from '../../lib/db';
import { handleFirestoreError } from '../../lib/firebase';
import { BACKGROUND_OPTS, LOGO_OPTS, PHOTO_OPTS, compressImage } from '../../lib/image';
import type { Settings } from '../../lib/types';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-line bg-white/80 p-4">
      <legend className="px-2 font-cairo text-base font-extrabold text-accent">{title}</legend>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function SettingsTab({
  settings,
  logo,
  customBg,
  footerImg,
}: {
  settings: Settings;
  logo: string;
  customBg: string;
  footerImg: string;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<Settings>(settings);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'background' | 'footer' | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);
  const footerRef = useRef<HTMLInputElement>(null);

  // لا نستبدل ما يكتبه المشرف بتحديث وارد من السحابة أثناء التعديل
  useEffect(() => {
    if (!dirty) setDraft(settings);
  }, [settings, dirty]);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveSettings(draft);
      setDirty(false);
      toast.success('تم حفظ الإعدادات');
    } catch (e) {
      handleFirestoreError('settings-save', e);
      toast.error('تعذّر حفظ الإعدادات.');
    } finally {
      setSaving(false);
    }
  };

  /** رفع الشعار/الخلفية يُحفظ فوراً (وثيقة مستقلة حتى لا تثقل إعدادات هواتف الضيوف) */
  const upload = async (kind: 'logo' | 'background' | 'footer', file: File | undefined) => {
    if (!file) return;
    setUploading(kind);
    try {
      const dataUrl = await compressImage(file, kind === 'logo' ? LOGO_OPTS : kind === 'footer' ? PHOTO_OPTS : BACKGROUND_OPTS);
      await saveAsset(kind, dataUrl);
      const patch: Partial<Settings> =
        kind === 'logo' ? { hasLogo: true } : kind === 'footer' ? { hasFooterImage: true } : { backgroundMode: 'custom' };
      await patchSettings(patch);
      setDraft((d) => ({ ...d, ...patch }));
      toast.success(kind === 'logo' ? 'تم رفع الشعار' : kind === 'footer' ? 'تم رفع صورة التذييل' : 'تم رفع الخلفية');
    } catch (e) {
      handleFirestoreError('asset-upload', e);
      toast.error(e instanceof Error && !('code' in e) ? e.message : 'تعذّر رفع الصورة.');
    } finally {
      setUploading(null);
    }
  };

  const removeFooterImage = async () => {
    try {
      await patchSettings({ hasFooterImage: false });
      setDraft((d) => ({ ...d, hasFooterImage: false }));
      toast.success('أُزيلت صورة التذييل');
    } catch (e) {
      handleFirestoreError('footer-remove', e);
      toast.error('تعذّرت الإزالة.');
    }
  };

  const removeLogo = async () => {
    try {
      await patchSettings({ hasLogo: false });
      setDraft((d) => ({ ...d, hasLogo: false }));
      toast.success('أُزيل الشعار');
    } catch (e) {
      handleFirestoreError('logo-remove', e);
      toast.error('تعذّرت الإزالة.');
    }
  };

  return (
    <section className="space-y-4 pb-24">
      <Section title="بيانات الحفل">
        <Field label="عنوان الجدارية (وسط الترويسة)">
          <input className={inputCls} value={draft.wallTitle} maxLength={60} onChange={(e) => set('wallTitle', e.target.value)} />
        </Field>
        <Field label="وصف الصور (يظهر تحت كل صورة)" hint="مثل: العريس، العروس، الراعي">
          <input className={inputCls} value={draft.photoLabel} maxLength={30} onChange={(e) => set('photoLabel', e.target.value)} />
        </Field>
        <Field label="العنوان الفرعي">
          <input className={inputCls} value={draft.title} maxLength={80} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="اسم المهرجان أو العريسين (بجانب الشعار)">
          <input className={inputCls} value={draft.names} maxLength={80} onChange={(e) => set('names', e.target.value)} />
        </Field>
        <Field label="التاريخ الميلادي" hint="يُعرض معه اسم اليوم بالعربية">
          <input type="date" dir="ltr" className={inputCls} value={draft.gregorianDate} onChange={(e) => set('gregorianDate', e.target.value)} />
        </Field>
        <Field label="التاريخ الهجري (اختياري)" hint="اتركه فارغاً ليُحسب تلقائياً من التاريخ الميلادي (أم القرى)">
          <input className={inputCls} value={draft.hijriDate} maxLength={40} onChange={(e) => set('hijriDate', e.target.value)} placeholder="مثال: 25 ربيع الآخر 1448 هـ" />
        </Field>
        <Field label="اسم القاعة">
          <input className={inputCls} value={draft.hall} maxLength={80} onChange={(e) => set('hall', e.target.value)} />
        </Field>
      </Section>

      <Section title="المظهر">
        <div className="md:col-span-2">
          <span className="mb-2 block text-sm font-bold text-ink">الثيم</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="الثيم">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={draft.theme === t.id}
                onClick={() => set('theme', t.id)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                  draft.theme === t.id ? 'border-gold bg-accent-soft ring-2 ring-gold/40' : 'border-line bg-white'
                }`}
              >
                <span className="h-5 w-5 rounded-full border border-black/10" style={{ background: t.swatch }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-sm font-bold text-ink">الشعار</span>
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-line bg-white">
              {draft.hasLogo && logo ? <img src={logo} alt="الشعار الحالي" className="h-full w-full object-contain" /> : <LogoMark className="h-12 w-12" />}
            </div>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void upload('logo', e.target.files?.[0]); e.target.value = ''; }} />
            <Button variant="soft" disabled={uploading !== null} onClick={() => logoRef.current?.click()}>
              {uploading === 'logo' ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />} رفع شعار
            </Button>
            {draft.hasLogo ? (
              <Button variant="ghost" onClick={() => void removeLogo()} aria-label="إزالة الشعار">
                <Trash2 size={16} />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="md:col-span-2">
          <span className="mb-2 block text-sm font-bold text-ink">الخلفية</span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {BACKGROUND_PRESETS.map((p) => {
              const active = draft.backgroundMode === 'preset' && draft.backgroundPreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    set('backgroundMode', 'preset');
                    set('backgroundPreset', p.id);
                  }}
                  className={`overflow-hidden rounded-xl border text-xs font-bold transition ${active ? 'border-gold ring-2 ring-gold/40' : 'border-line'}`}
                >
                  <div className="h-14 bg-gradient-to-br from-[#fffdf6] to-[#efdcaa]" style={{ backgroundImage: p.image || undefined, backgroundSize: p.size }} />
                  <div className="bg-white py-1">{p.label}</div>
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={draft.backgroundMode === 'custom'}
              onClick={() => (customBg ? set('backgroundMode', 'custom') : bgRef.current?.click())}
              className={`overflow-hidden rounded-xl border text-xs font-bold transition ${draft.backgroundMode === 'custom' ? 'border-gold ring-2 ring-gold/40' : 'border-line'}`}
            >
              <div className="flex h-14 items-center justify-center bg-gray-100 bg-cover bg-center" style={customBg ? { backgroundImage: `url("${customBg}")` } : undefined}>
                {!customBg ? <ImagePlus size={20} className="text-ink-soft" /> : null}
              </div>
              <div className="bg-white py-1">صورتي</div>
            </button>
          </div>
          <input ref={bgRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void upload('background', e.target.files?.[0]); e.target.value = ''; }} />
          <Button variant="ghost" className="mt-2" disabled={uploading !== null} onClick={() => bgRef.current?.click()}>
            {uploading === 'background' ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />} رفع صورة خلفية
          </Button>
        </div>

        <Field label="شفافية صورة الخلفية">
          <Slider value={draft.bgOpacity} min={0} max={100} suffix="%" onChange={(v) => set('bgOpacity', v)} />
        </Field>
        <Field label="ضبابية صورة الخلفية">
          <Slider value={draft.bgBlur} min={0} max={30} suffix="px" onChange={(v) => set('bgBlur', v)} />
        </Field>
      </Section>

      <Section title="اعتماد التهاني">
        <Toggle
          checked={draft.autoApprove}
          onChange={(v) => {
            set('autoApprove', v);
            if (v) set('requireAdminApproval', false);
          }}
          label="الاعتماد التلقائي"
          hint="تظهر التهاني السليمة مباشرة على الشاشة دون مراجعة"
        />
        <Toggle
          checked={draft.requireAdminApproval}
          onChange={(v) => {
            set('requireAdminApproval', v);
            if (v) set('autoApprove', false);
          }}
          label="اشتراط اعتماد المشرف"
          hint="عند التفعيل يُعطَّل الاعتماد التلقائي وتبقى كل تهنئة قيد المراجعة"
        />
      </Section>

      <Section title="العرض على الشاشة">
        <Field label="مدة بقاء التهنئة">
          <Slider value={draft.displayDuration} min={3} max={60} suffix=" ث" onChange={(v) => set('displayDuration', v)} />
        </Field>
        <Field label="سرعة شريط الصور">
          <Slider value={draft.stripSpeed} min={1} max={10} onChange={(v) => set('stripSpeed', v)} />
        </Field>
        <Toggle checked={draft.adaptiveDuration} onChange={(v) => set('adaptiveDuration', v)} label="التكيف مع طول النص" hint="تزداد المدة تلقائياً للتهاني الأطول من 25 كلمة" />
        <Toggle checked={draft.soundEnabled} onChange={(v) => set('soundEnabled', v)} label="صوت الاحتفال" hint="نغمة عند اعتماد تهنئة جديدة (تحتاج نقرة واحدة على شاشة العرض لتفعيل الصوت)" />
        <Toggle checked={draft.particlesEnabled} onChange={(v) => set('particlesEnabled', v)} label="الجزيئات الذهبية" />
      </Section>

      <Section title="شاشة الشريك بملء الشاشة">
        <div className="md:col-span-2">
          <Toggle
            checked={draft.sponsorEnabled}
            onChange={(v) => set('sponsorEnabled', v)}
            label="عرض شريك بملء الشاشة"
            hint="كل فترة تظهر شاشة كاملة لشريك واحد بالتناوب، ثم يعود عرض التهاني. تنتظر انتهاء التهنئة الجديدة أو التسليط إن تزامنت معهما."
          />
        </div>
        <Field label="تظهر كل كم دقيقة">
          <Slider value={draft.sponsorIntervalMin} min={1} max={60} suffix=" د" onChange={(v) => set('sponsorIntervalMin', v)} />
        </Field>
        <Field label="مدة العرض">
          <Slider value={draft.sponsorDurationSec} min={3} max={60} suffix=" ث" onChange={(v) => set('sponsorDurationSec', v)} />
        </Field>
        <Field label="عنوان الميدالية (ثابت لكل الشركاء)">
          <input className={inputCls} value={draft.sponsorRibbon} maxLength={30} onChange={(e) => set('sponsorRibbon', e.target.value)} />
        </Field>
        <Field label="رقم الدورة (بجانب اسم المهرجان)" hint="مثل 28">
          <input className={inputCls} value={draft.festivalNumber} maxLength={6} onChange={(e) => set('festivalNumber', e.target.value)} dir="ltr" />
        </Field>
        <div className="md:col-span-2">
          <Field label="رسالة الشكر العامة" hint="تُعرض لكل الشركاء، ويمكن تخصيص رسالة لشريك بعينه من تبويب الشركاء. اكتب السنة يدوياً داخل النص.">
            <textarea className={inputCls} rows={3} maxLength={300} value={draft.sponsorMessage} onChange={(e) => set('sponsorMessage', e.target.value)} />
          </Field>
        </div>
        <Field label="معرّف التواصل في التذييل (إنستغرام)" hint="اتركه فارغاً لإخفائه">
          <input className={inputCls} value={draft.sponsorFooterHandle} maxLength={40} onChange={(e) => set('sponsorFooterHandle', e.target.value)} dir="ltr" />
        </Field>
        <Field label="نص التذييل">
          <input className={inputCls} value={draft.sponsorFooterText} maxLength={80} onChange={(e) => set('sponsorFooterText', e.target.value)} />
        </Field>
        <div>
          <span className="mb-2 block text-sm font-bold text-ink">صورة دائرية في التذييل (اختيارية)</span>
          <div className="flex items-center gap-3">
            {draft.hasFooterImage && footerImg ? (
              <img src={footerImg} alt="صورة التذييل" className="h-14 w-14 rounded-full border border-line object-cover" />
            ) : null}
            <input ref={footerRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void upload('footer', e.target.files?.[0]); e.target.value = ''; }} />
            <Button variant="soft" disabled={uploading !== null} onClick={() => footerRef.current?.click()}>
              {uploading === 'footer' ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />} {draft.hasFooterImage ? 'تغيير' : 'رفع صورة'}
            </Button>
            {draft.hasFooterImage ? (
              <Button variant="ghost" onClick={() => void removeFooterImage()} aria-label="إزالة صورة التذييل">
                <Trash2 size={16} />
              </Button>
            ) : null}
          </div>
        </div>
        <div>
          <span className="mb-2 block text-sm font-bold text-ink">الصندوق الصغير لشركاء النجاح في الشاشة الرئيسية</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="الصندوق الصغير للشركاء">
            {(
              [
                ['off', 'مخفي'],
                ['mobile', 'للجوال فقط'],
                ['all', 'للجميع'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={draft.partnersBox === v}
                onClick={() => set('partnersBox', v)}
                className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                  draft.partnersBox === v ? 'border-gold bg-accent-soft ring-2 ring-gold/40' : 'border-line bg-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="العدّ التنازلي">
        <div className="md:col-span-2">
          <Toggle
            checked={draft.countdown.enabled}
            onChange={(v) => set('countdown', { ...draft.countdown, enabled: v })}
            label="تفعيل وضع العدّ التنازلي"
            hint="يحلّ محل التهاني حتى الوقت المستهدف، ثم يظهر إعلان احتفالي 15 ثانية ويعود العرض العادي. غيّر الوقت المستهدف لبدء عدّ جديد."
          />
        </div>
        <Field label="عنوان العدّ">
          <input className={inputCls} value={draft.countdown.title} maxLength={80} onChange={(e) => set('countdown', { ...draft.countdown, title: e.target.value })} />
        </Field>
        <Field label="الوقت المستهدف (بتوقيت هذا الجهاز)">
          <input
            type="datetime-local"
            dir="ltr"
            className={inputCls}
            value={toLocalInput(draft.countdown.target)}
            onChange={(e) => set('countdown', { ...draft.countdown, target: fromLocalInput(e.target.value) })}
          />
        </Field>
      </Section>

      <Section title="تسليط الضوء على العريس">
        <div className="md:col-span-2">
          <Toggle
            checked={draft.spotlight.enabled}
            onChange={(v) => set('spotlight', { ...draft.spotlight, enabled: v })}
            label="تفعيل التسليط الدوري"
            hint="تُعرض صورة بملء الشاشة مع قصاصات كل فترة. يمكنك أيضاً تشغيله يدوياً من تبويب الصور."
          />
        </div>
        <Field label="كل كم دقيقة">
          <Slider value={draft.spotlight.intervalMin} min={1} max={60} suffix=" د" onChange={(v) => set('spotlight', { ...draft.spotlight, intervalMin: v })} />
        </Field>
        <Field label="مدة العرض">
          <Slider value={draft.spotlight.durationSec} min={3} max={60} suffix=" ث" onChange={(v) => set('spotlight', { ...draft.spotlight, durationSec: v })} />
        </Field>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-[140] border-t border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <span className={`text-sm font-bold ${dirty ? 'text-amber-700' : 'text-ink-soft'}`}>{dirty ? 'لديك تغييرات غير محفوظة' : 'كل التغييرات محفوظة'}</span>
          <div className="flex gap-2">
            {dirty ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft(settings);
                  setDirty(false);
                }}
              >
                تراجع
              </Button>
            ) : null}
            <Button disabled={!dirty || saving} onClick={() => void save()}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} حفظ الإعدادات
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
