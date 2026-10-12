import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[var(--ov-border)] bg-[var(--ov-elevated)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold">
            <Image src="/logo.png" alt="Opveil logo" width={22} height={22} className="rounded-md" />
            Opveil
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--ov-muted)]">
            Uncover the code beneath. Read-only EVM contract intelligence for Robinhood Chain and BNB Smart Chain.
          </p>
          <p className="mt-4 rounded-lg border border-[var(--ov-border)] bg-[var(--ov-card)] p-3 text-xs leading-relaxed text-[var(--ov-muted)]">
            Not a security audit. Findings are bytecode-derived heuristics, not guarantees. Never share seed phrases or
            private keys — Opveil will never ask for them.
          </p>
        </div>
        <nav aria-label="Product">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ov-faint)]">Product</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="text-[var(--ov-muted)] hover:text-[var(--ov-accent-hover)]" href="/analyze">Analyze</Link></li>
            <li><Link className="text-[var(--ov-muted)] hover:text-[var(--ov-accent-hover)]" href="/compare">Compare</Link></li>
            <li><Link className="text-[var(--ov-muted)] hover:text-[var(--ov-accent-hover)]" href="/history">History</Link></li>
          </ul>
        </nav>
        <nav aria-label="Resources">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ov-faint)]">Resources</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="text-[var(--ov-muted)] hover:text-[var(--ov-accent-hover)]" href="/docs">Documentation</Link></li>
            <li><Link className="text-[var(--ov-muted)] hover:text-[var(--ov-accent-hover)]" href="/about">About</Link></li>
            <li><Link className="text-[var(--ov-muted)] hover:text-[var(--ov-accent-hover)]" href="/api/health">API health</Link></li>
          </ul>
        </nav>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ov-faint)]">Networks</p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--ov-muted)]">
            <li>Robinhood Chain · 4663</li>
            <li>BNB Smart Chain · 56</li>
          </ul>
          <Link href="/analyze" className="ov-btn-bronze mt-4 inline-block px-4 py-2 text-sm">
            Start inspecting
          </Link>
        </div>
      </div>
      <div className="border-t border-[var(--ov-border)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-[var(--ov-faint)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} Opveil. Independent, read-only analysis product.</span>
          <span>Robinhood Chain is a blockchain network — unrelated to brokerage accounts.</span>
        </div>
      </div>
    </footer>
  );
}
