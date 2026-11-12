import confetti from 'canvas-confetti';

const COLORS = ['#c99a3b', '#f3d98b', '#fff4cf', '#e8b84a', '#ffffff'];

function base(): confetti.Options {
  return { colors: COLORS, zIndex: 200, disableForReducedMotion: false, scalar: 1.1 };
}

/** انفجار قصاصات من جانبي الشاشة */
export function celebrateBurst(): void {
  try {
    confetti({ ...base(), particleCount: 90, spread: 80, origin: { x: 0.1, y: 0.7 }, angle: 60 });
    confetti({ ...base(), particleCount: 90, spread: 80, origin: { x: 0.9, y: 0.7 }, angle: 120 });
    confetti({ ...base(), particleCount: 120, spread: 120, startVelocity: 40, origin: { x: 0.5, y: 0.4 } });
  } catch {
    /* تجاهل */
  }
}

/** قصاصات متواصلة للإعلان الاحتفالي؛ تعيد دالة إيقاف */
export function celebrateFinale(durationMs: number): () => void {
  const end = Date.now() + durationMs;
  let stopped = false;
  const id = window.setInterval(() => {
    if (stopped || Date.now() > end) {
      window.clearInterval(id);
      return;
    }
    try {
      confetti({ ...base(), particleCount: 40, spread: 70, origin: { x: 0, y: 0.8 }, angle: 60 });
      confetti({ ...base(), particleCount: 40, spread: 70, origin: { x: 1, y: 0.8 }, angle: 120 });
      confetti({ ...base(), particleCount: 30, spread: 360, startVelocity: 25, origin: { x: Math.random(), y: Math.random() * 0.4 } });
    } catch {
      /* تجاهل */
    }
  }, 450);
  return () => {
    stopped = true;
    window.clearInterval(id);
  };
}

export function celebrateGuest(): void {
  try {
    confetti({ ...base(), particleCount: 110, spread: 90, origin: { y: 0.65 } });
  } catch {
    /* تجاهل */
  }
}
