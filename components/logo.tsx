export function OpveilLogo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="Opveil home">
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" role="img" aria-label="Opveil logo">
        <rect x="2" y="2" width="36" height="36" rx="11" fill="#171208" stroke="#4a3a2a" strokeWidth="1.5" />
        <path d="M20 8c-6.6 0-12 5.4-12 12s5.4 12 12 12c2.5 0 4.8-.8 6.7-2.1" stroke="#c9a06a" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M20 13.5c-3.6 0-6.5 2.9-6.5 6.5s2.9 6.5 6.5 6.5c1.4 0 2.7-.4 3.7-1.2" stroke="#e3c08b" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        <circle cx="26.5" cy="26.5" r="2.6" fill="#c9a06a" />
        <path d="M24.5 15.5h5M26 13.5l2.5 2-2.5 2" stroke="#f5efe3" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      </svg>
      <span className="text-[19px] font-bold tracking-tight">
        Opveil
        <span className="ml-2 hidden rounded-full border border-[var(--ov-border)] px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ov-muted)] sm:inline-block">
          EVM intel
        </span>
      </span>
    </span>
  );
}
