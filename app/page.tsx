import Link from "next/link";
import {
  ArrowRight,
  Binary,
  BrainCircuit,
  GitCompareArrows,
  Radar,
  ScanSearch,
  ShieldAlert,
  ChevronRight,
  FlaskConical,
} from "lucide-react";
import { AddressForm } from "@/components/address-form";
import { StatusBadge } from "@/components/ui";

const CAPABILITIES = [
  {
    icon: ScanSearch,
    title: "Function Discovery",
    body: "Dispatcher-pattern analysis surfaces likely 4-byte selectors with opcode evidence. Curated signatures are matched only where high-confidence; everything else is honestly marked unknown.",
  },
  {
    icon: Binary,
    title: "Contract Intelligence",
    body: "Real runtime bytecode from RPC, full disassembly with offsets, PUSH operands, jump markers, metadata-trailer handling, search, and export — pinned to block and code hash.",
  },
  {
    icon: ShieldAlert,
    title: "Risk Indicators",
    body: "Deterministic checks for DELEGATECALL, upgrade authority, SELFDESTRUCT, external-call patterns, storage writes, and ownership surface — each with evidence, confidence, and limits. Never a safe/unsafe verdict.",
  },
  {
    icon: GitCompareArrows,
    title: "Contract Comparison",
    body: "Side-by-side bytecode hashes, normalized similarity, selector overlap, proxy structure, and findings — with exact vs heuristic matches clearly separated.",
  },
  {
    icon: BrainCircuit,
    title: "AI Explanations",
    body: "A provider-agnostic LLM adapter explains evidence in plain language with finding references. Without a key, a deterministic summary is shown and AI-unavailable is labeled.",
  },
];

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(720px 320px at 50% -60px, var(--ov-accent-dim), transparent 70%), radial-gradient(520px 260px at 85% 10%, rgba(224,164,76,0.08), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 flex items-center justify-center gap-2">
              <StatusBadge tone="info">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--ov-accent)]" /> Robinhood Chain · 4663
              </StatusBadge>
              <StatusBadge tone="info">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--ov-warning)]" /> BNB Smart Chain · 56
              </StatusBadge>
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Every contract
              <br />
              has a <span className="text-[var(--ov-accent-hover)]">story.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[var(--ov-muted)] sm:text-lg">
              Decode, inspect, and understand EVM smart contracts on Robinhood Chain and BNB Smart Chain.
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-[var(--ov-faint)]">
              Explore deployed bytecode, uncover contract behavior, and investigate potential risks — without needing
              verified source code.
            </p>
          </div>
          <div className="mx-auto mt-8 max-w-3xl">
            <AddressForm />
          </div>

          {/* Sample preview — clearly labeled */}
          <div className="mx-auto mt-10 max-w-4xl">
            <div className="ov-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-[var(--ov-border)] px-4 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ov-faint)]">
                  Sample analysis preview — illustrative, not live data
                </p>
                <span className="hidden items-center gap-1 text-xs text-[var(--ov-faint)] sm:flex">
                  <FlaskConical size={13} /> demo layout
                </span>
              </div>
              <div className="grid gap-px bg-[var(--ov-border)] sm:grid-cols-[1fr_1fr_1fr]">
                {[
                  { k: "Runtime", v: "12,408 bytes", s: "block 48,201,553 · pinned" },
                  { k: "Selectors", v: "18 detected", s: "9 high-confidence signatures" },
                  { k: "Proxy", v: "EIP-1967 transparent", s: "implementation resolved" },
                ].map((c) => (
                  <div key={c.k} className="bg-[var(--ov-card)] px-5 py-4">
                    <p className="text-xs text-[var(--ov-faint)]">{c.k}</p>
                    <p className="mt-1 text-lg font-bold">{c.v}</p>
                    <p className="code-font mt-1 text-xs text-[var(--ov-muted)]">{c.s}</p>
                  </div>
                ))}
              </div>
              <div className="code-font border-t border-[var(--ov-border)] bg-[var(--ov-code-bg)] px-4 py-3 text-xs leading-6 text-[var(--ov-muted)]">
                <p><span className="text-[var(--ov-faint)]">0000</span> <span className="opcode-PUSH">PUSH1 0x80</span> <span className="opcode-PUSH">PUSH1 0x40</span> MSTORE</p>
                <p><span className="text-[var(--ov-faint)]">0004</span> CALLVALUE DUP1 ISZERO <span className="opcode-PUSH">PUSH2 0x0010</span> <span className="opcode-JUMPDEST">JUMPI</span></p>
                <p><span className="text-[var(--ov-faint)]">0010</span> <span className="opcode-JUMPDEST">JUMPDEST</span> <span className="opcode-PUSH">PUSH4 0xa9059cbb</span> DUP1 <span className="opcode-PUSH">PUSH1 0xe0</span> SHR EQ …</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ov-accent-hover)]">What Opveil does</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Evidence first, speculation never</h2>
          </div>
          <Link href="/docs" className="ov-btn-ghost hidden px-4 py-2 text-sm sm:inline-flex">
            Read the docs
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c) => (
            <article key={c.title} className="ov-card group p-5 transition-colors hover:border-[var(--ov-border-strong)]">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--ov-border)] bg-[var(--ov-accent-dim)] text-[var(--ov-accent-hover)]">
                <c.icon size={18} />
              </div>
              <h3 className="mt-4 font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ov-muted)]">{c.body}</p>
            </article>
          ))}
          <article className="ov-card flex flex-col justify-between border-[var(--ov-accent)]/30 p-5">
            <div>
              <Radar size={18} className="text-[var(--ov-accent-hover)]" />
              <h3 className="mt-4 font-semibold">Proxy & upgrade tracing</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ov-muted)]">
                EIP-1967 slots, beacon slots, and EIP-1167 minimal-proxy templates — with implementation code fetched
                and hashed separately.
              </p>
            </div>
            <Link href="/analyze" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--ov-accent-hover)]">
              Try it now <ArrowRight size={15} />
            </Link>
          </article>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-[var(--ov-border)] bg-[var(--ov-elevated)]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ov-accent-hover)]">How it works</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Select network, paste address, inspect results</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { n: "01", t: "Select network", d: "Choose Robinhood Chain or BNB Smart Chain. RPC endpoints are pinned per chain and overridable via environment." },
              { n: "02", t: "Paste address", d: "Checksummed EVM addresses are validated client- and server-side, then eth_getCode is read at a pinned block." },
              { n: "03", t: "Inspect results", d: "Overview, functions, bytecode, decompiled view, proxy, security, and AI explanation — all with provenance." },
            ].map((s) => (
              <div key={s.n} className="ov-card p-5">
                <p className="code-font text-3xl font-bold text-[var(--ov-accent)]/70">{s.n}</p>
                <h3 className="mt-3 font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ov-muted)]">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/analyze" className="ov-btn-bronze inline-flex items-center gap-2 px-5 py-2.5 text-sm">
              Analyze a contract <ChevronRight size={15} />
            </Link>
            <Link href="/compare" className="ov-btn-ghost px-5 py-2.5 text-sm">
              Compare two contracts
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="ov-card relative overflow-hidden p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Uncover the code beneath.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[var(--ov-muted)]">
            Paste any deployed address on Robinhood Chain or BNB Smart Chain and get an evidence-backed dossier in
            seconds. Free, read-only, no wallet required.
          </p>
          <div className="mx-auto mt-6 max-w-2xl">
            <AddressForm compact />
          </div>
        </div>
      </section>
    </div>
  );
}
