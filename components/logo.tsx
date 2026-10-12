import Image from "next/image";

export function OpveilLogo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="Opveil home">
      <Image
        src="/logo.png"
        alt="Opveil logo"
        width={size}
        height={size}
        priority
        className="rounded-[10px]"
        style={{ width: size, height: size }}
      />
      <span className="text-[19px] font-bold tracking-tight">
        Opveil
        <span className="ml-2 hidden rounded-full border border-[var(--ov-border)] px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ov-muted)] sm:inline-block">
          EVM intel
        </span>
      </span>
    </span>
  );
}
