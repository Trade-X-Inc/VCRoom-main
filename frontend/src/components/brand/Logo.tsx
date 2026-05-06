const GRADIENT_ID = "vr-logo-panel-g";

export function Logo({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        className="h-8 w-8 shrink-0"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#7B8FFF" />
            <stop offset="100%" stopColor="#4F62F0" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="7" fill="#0D1933" />
        <path d="M13 7 h8 a2 2 0 0 1 2 2 v14 a2 2 0 0 1 -2 2 h-8" fill="#1A3050" />
        <rect x="4" y="7" width="12" height="18" rx="2.5" fill={`url(#${GRADIENT_ID})`} />
        <circle cx="18.5" cy="16" r="1.4" fill="#7B8FFF" />
      </svg>
      {withWordmark && (
        <span className="text-sm font-semibold tracking-tight">Venture Room</span>
      )}
    </div>
  );
}
