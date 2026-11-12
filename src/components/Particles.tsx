import { memo, useState, type CSSProperties } from 'react';

interface P {
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  opacity: number;
  scale: number;
}

function make(count: number): P[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    size: 4 + Math.random() * 12,
    duration: 14 + Math.random() * 18,
    delay: -Math.random() * 30,
    drift: (Math.random() - 0.5) * 12,
    opacity: 0.35 + Math.random() * 0.5,
    scale: 0.6 + Math.random() * 0.9,
  }));
}

/** جزيئات ذهبية عائمة بالـ CSS فقط (لا إعادة رسم من React) */
export const Particles = memo(function Particles({ count = 26 }: { count?: number }) {
  const [items] = useState(() => make(count));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {items.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              '--d': `${p.duration}s`,
              '--delay': `${p.delay}s`,
              '--dx': `${p.drift}vw`,
              '--o': p.opacity,
              '--s': p.scale,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
});
