/** شعار افتراضي: خاتمان متشابكان */
export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3d98b" />
          <stop offset="0.5" stopColor="#c99a3b" />
          <stop offset="1" stopColor="#8a5f12" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="36" r="15" fill="none" stroke="url(#lg)" strokeWidth="4.5" />
      <circle cx="40" cy="36" r="15" fill="none" stroke="url(#lg)" strokeWidth="4.5" />
      <path d="M32 9 l3 6 6 1 -4.5 4.2 1.2 6 -5.7 -3 -5.7 3 1.2 -6 -4.5 -4.2 6 -1z" fill="url(#lg)" />
    </svg>
  );
}

export function Logo({ src, className = '' }: { src?: string; className?: string }) {
  if (src) return <img src={src} alt="الشعار" className={`object-contain ${className}`} draggable={false} />;
  return <LogoMark className={className} />;
}
