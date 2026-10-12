import Link from "next/link";

export const metadata = { title: "About — Opveil" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ov-accent-hover)]">About</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Uncover the code beneath.</h1>
      <div className="ov-card mt-6 space-y-4 p-6 text-sm leading-relaxed text-[var(--ov-muted)]">
        <p>
          <strong className="text-[var(--ov-text)]">Opveil</strong> is an independent, read-only EVM contract
          intelligence platform for <strong className="text-[var(--ov-text)]">Robinhood Chain</strong> and{" "}
          <strong className="text-[var(--ov-text)]">BNB Smart Chain</strong>. Paste a deployed address and receive an
          evidence-backed dossier: live bytecode, disassembly, function selectors, proxy resolution, deterministic risk
          indicators, and an AI explanation grounded in that evidence.
        </p>
        <p>
          Opveil is not a trading platform, wallet, token launcher, or deployment tool. It does not copy branding,
          layouts, or assets from any other service. Every claim links to chain data or is marked uncertain.
        </p>
        <div className="rounded-[12px] border border-[var(--ov-warning)]/30 bg-[var(--ov-warning)]/5 p-4 text-xs leading-relaxed text-[var(--ov-warning)]">
          <strong>Not a security audit.</strong> Opveil surfaces bytecode-derived heuristics with confidence levels and
          limitations. It cannot guarantee that a contract is secure, and absence of findings is never a clean bill of
          health. High-value decisions require a professional audit.
        </div>
        <p>
          Built with Next.js, TypeScript, Tailwind, viem, and Zod. Analyses persist to PostgreSQL/Prisma in production
          (file-backed history for zero-config local runs). Public RPCs are development defaults — bring a dedicated
          provider for production traffic.
        </p>
      </div>
      <div className="mt-6 flex gap-3">
        <Link href="/analyze" className="ov-btn-bronze px-5 py-2.5 text-sm">Analyze a contract</Link>
        <Link href="/docs" className="ov-btn-ghost px-5 py-2.5 text-sm">Read the docs</Link>
      </div>
    </div>
  );
}
