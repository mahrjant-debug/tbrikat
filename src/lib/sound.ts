/** نغمات مولَّدة بـ WebAudio (بلا ملفات صوت) */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    return ctx;
  } catch {
    return null;
  }
}

/** يجب استدعاؤها داخل حدث مستخدم (نقر/لمس) لتجاوز منع التشغيل التلقائي */
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => undefined);
}

function tone(freq: number, start: number, dur: number, gain = 0.18, type: OscillatorType = 'triangle') {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function ready(): boolean {
  const c = getCtx();
  if (!c) return false;
  if (c.state === 'suspended') c.resume().catch(() => undefined);
  return c.state !== 'closed';
}

/** نغمة احتفال: أربيجيو صاعد مع رنين */
export function playCelebration(): void {
  if (!ready()) return;
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  notes.forEach((f, i) => {
    tone(f, i * 0.11, 0.9, 0.16);
    tone(f * 2, i * 0.11, 0.5, 0.05, 'sine');
  });
}

/** تنبيه المشرف: نغمتان قصيرتان */
export function playAlert(): void {
  if (!ready()) return;
  tone(880, 0, 0.25, 0.2, 'sine');
  tone(1174.66, 0.18, 0.4, 0.2, 'sine');
}
