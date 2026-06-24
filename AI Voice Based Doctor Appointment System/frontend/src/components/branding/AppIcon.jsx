export default function AppIcon({ size = 32, className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`relative shrink-0 rounded-xl bg-gradient-to-br from-primary-600 to-health-500 shadow-sm ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="absolute left-1/2 top-1/2 h-[58%] w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/95" />
      <span className="absolute left-1/2 top-1/2 h-[18%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/95" />
    </div>
  );
}
