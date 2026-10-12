"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isAddress } from "viem";
import { ArrowRightLeft, Download, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/ui";

interface Cmp {
  exactBytecodeMatch: boolean;
  normalizedMatch: boolean;
  similarityPct: number;
  selectorsOnlyInA: string[];
  selectorsOnlyInB: string[];
  selectorsCommon: string[];
  proxyMatch: boolean;
  findingsOnlyInA: string[];
  findingsOnlyInB: string[];
  findingsCommon: string[];
  caveats: string[];
  meta: { codeHashA: string; codeHashB: string; proxyA: string; proxyB: string };
}

function CompareInner() {
  const sp = useSearchParams();
  const [aChain, setAChain] = useState(sp.get("aChain") ?? "robinhood");
  const [aAddr, setAAddr] = useState(sp.get("aAddr") ?? "");
  const [bChain, setBChain] = useState(sp.get("bChain") ?? "bsc");
  const [bAddr, setBAddr] = useState(sp.get("bAddr") ?? "");
  const [result, setResult] = useState<Cmp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!isAddress(aAddr.trim(), { strict: false }) || !isAddress(bAddr.trim(), { strict: false })) {
      setError("Both inputs must be valid 0x EVM addresses.");
      return;
    }
    setError(null);
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          a: { chain: aChain, address: aAddr.trim() },
          b: { chain: bChain, address: bAddr.trim() },
        }),
      });
      const json = await res.json();
      if (!json.ok) setError(json.error?.message ?? "Comparison failed.");
      else setResult(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed.");
    } finally {
      setBusy(false);
    }
  }

  function exportJson() {
    if (!result) return;
    const blob = new Blob([JSON.stringify({ a: { aChain, aAddr }, b: { bChain, bAddr }, result }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "opveil-comparison.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ov-accent-hover)]">Contract comparison</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Two contracts, side by side</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--ov-muted)]">
        Compare runtime hashes, normalized similarity, selectors, proxy structures, and findings. Exact matches and
        heuristic similarities are labeled separately.
      </p>
      <form onSubmit={run} className="ov-card mt-6 grid gap-3 p-4 sm:grid-cols-[1fr_1fr]">
        {[
          { label: "Contract A", chain: aChain, setChain: setAChain, addr: aAddr, setAddr: setAAddr },
          { label: "Contract B", chain: bChain, setChain: setBChain, addr: bAddr, setAddr: setBAddr },
        ].map((c) => (
          <fieldset key={c.label} className="grid gap-2">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--ov-faint)]">{c.label}</legend>
            <div className="flex gap-2">
              {(["robinhood", "bsc"] as const).map((n) => (
                <button key={n} type="button" onClick={() => c.setChain(n)} aria-pressed={c.chain === n}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${c.chain === n ? "border-[var(--ov-accent)] bg-[var(--ov-accent-dim)] text-[var(--ov-accent-hover)]" : "border-[var(--ov-border)] text-[var(--ov-muted)]"}`}>
                  {n === "robinhood" ? "RHC · 4663" : "BSC · 56"}
                </button>
              ))}
            </div>
            <input value={c.addr} onChange={(e) => c.setAddr(e.target.value)} placeholder="0x…" spellCheck={false} autoComplete="off"
              className="ov-input code-font px-3 py-2.5 text-sm" aria-label={`${c.label} address`} />
          </fieldset>
        ))}
        <div className="sm:col-span-2">
          <button type="submit" disabled={busy} className="ov-btn-bronze inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-sm sm:w-auto">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />} Compare contracts
          </button>
        </div>
      </form>
      {error && <p role="alert" className="mt-3 text-sm text-[var(--ov-critical)]">{error}</p>}
      {result && (
        <div className="mt-6 grid gap-3">
          <div className="ov-card flex flex-wrap items-center gap-2 p-4">
            <StatusBadge tone={result.exactBytecodeMatch ? "ok" : "neutral"}>{result.exactBytecodeMatch ? "exact bytecode match" : "bytecode differs"}</StatusBadge>
            <StatusBadge tone={result.normalizedMatch ? "ok" : "neutral"}>{result.normalizedMatch ? "normalized match" : `${result.similarityPct}% similar`}</StatusBadge>
            <StatusBadge tone={result.proxyMatch ? "ok" : "warn"}>{result.proxyMatch ? "proxy structures match" : "proxy structures differ"}</StatusBadge>
            <button onClick={exportJson} className="ov-btn-ghost ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"><Download size={13} /> Export JSON</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <DiffCard title="Selectors" common={result.selectorsCommon} onlyA={result.selectorsOnlyInA} onlyB={result.selectorsOnlyInB} mono />
            <DiffCard title="Findings" common={result.findingsCommon} onlyA={result.findingsOnlyInA} onlyB={result.findingsOnlyInB} />
            <div className="ov-card p-4">
              <p className="text-sm font-semibold">Hashes & proxies</p>
              <div className="code-font mt-2 space-y-1.5 text-[11px] text-[var(--ov-muted)]">
                <p>A: {result.meta.codeHashA.slice(0, 22)}…</p>
                <p>B: {result.meta.codeHashB.slice(0, 22)}…</p>
                <p>proxy A: {result.meta.proxyA} · B: {result.meta.proxyB}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[12px] border border-[var(--ov-border)] bg-[var(--ov-elevated)] p-4 text-xs leading-relaxed text-[var(--ov-muted)]">
            <p className="font-semibold text-[var(--ov-text)]">Caveats</p>
            <ul className="mt-1 list-disc pl-5">{result.caveats.map((c, i) => <li key={i}>{c}</li>)}</ul>
          </div>
        </div>
      )}
    </div>
  );
}

function DiffCard({ title, common, onlyA, onlyB, mono = false }: { title: string; common: string[]; onlyA: string[]; onlyB: string[]; mono?: boolean }) {
  const cls = mono ? "code-font" : "";
  return (
    <div className="ov-card p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className={`mt-2 text-xs text-[var(--ov-success)] ${cls}`}>common ({common.length}): {common.slice(0, 8).join(", ") || "—"}</p>
      <p className={`mt-1.5 text-xs text-[var(--ov-warning)] ${cls}`}>only A ({onlyA.length}): {onlyA.slice(0, 8).join(", ") || "—"}</p>
      <p className={`mt-1.5 text-xs text-[var(--ov-accent-hover)] ${cls}`}>only B ({onlyB.length}): {onlyB.slice(0, 8).join(", ") || "—"}</p>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-12">Loading…</div>}>
      <CompareInner />
    </Suspense>
  );
}
