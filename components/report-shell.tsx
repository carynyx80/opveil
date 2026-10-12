"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Binary,
  BrainCircuit,
  CheckCircle2,
  ExternalLink,
  GitCompareArrows,
  History as HistoryIcon,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
  FileCode2,
  Boxes,
} from "lucide-react";
import { CopyButton, StatusBadge } from "./ui";
import { BytecodeViewer, FindingsList, FunctionsTable, ReportSkeleton } from "./analysis-views";

type Tab = "overview" | "functions" | "bytecode" | "decompiled" | "security" | "ai";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "functions", label: "Functions", icon: ScanSearch },
  { key: "bytecode", label: "Bytecode", icon: Binary },
  { key: "decompiled", label: "Decompiled", icon: FileCode2 },
  { key: "security", label: "Security", icon: ShieldAlert },
  { key: "ai", label: "AI Explanation", icon: BrainCircuit },
];

interface AnalysisPayload {
  id: string;
  chain: string;
  address: string;
  blockNumber: string;
  codeHash: string;
  byteSize: number;
  bytecode: string;
  normalizedBytecode?: string;
  sourceVerified: boolean;
  explorerUrl: string;
  selectors: { selectors: { selector: string; signature: string | null; confidence: string; evidence: string[]; opcodeOffsets: number[]; hasStorageAccess: boolean; hasExternalCall: boolean; ambiguityNote: string | null }[]; dispatcherType: string; limitations: string[] };
  proxy: { resolution: { isProxy: boolean; pattern: string; implementation: string | null; admin: string | null; beacon: string | null; codeHashImplementation: string | null; provenance: string[]; confidence: string; limitations: string[] } };
  findings: { id: string; title: string; description: string; severity: string; confidence: string; evidence: string[]; impact: string; limitations: string; opcodeRefs: number[]; selectorRefs: string[]; storageRefs: string[] }[];
  decompiled: { mode: string; language: string; output: string; provenance: string[]; warnings: string[] };
  disassembly?: { offset: number; opcode: number; name: string; operand: string | null; gas: string; kind: string; isJumpDest: boolean; isBranch: boolean; isTerminating: boolean }[];
  summary: string;
  completeness: { score: number; notes: string[] };
  createdAt: string;
  cached?: boolean;
}

const STAGES = ["Resolving network", "Reading eth_getCode at pinned block", "Disassembling runtime", "Detecting selectors & proxy", "Running security checks", "Reconstructing view"];

export function ReportShell({ chain, address }: { chain: string; address: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<AnalysisPayload | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState(0);
  const [ai, setAi] = useState<{ available: boolean; model: string | null; summary: string; bullets: string[]; risks: string[]; unknowns: string[]; provenance: string[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    setStage(0);
    const tick = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 900);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain, address, refresh }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError({ code: json.error?.code ?? "ANALYSIS_FAILED", message: json.error?.message ?? "Analysis failed." });
        setData(null);
      } else {
        setData(json.data);
      }
    } catch (e) {
      setError({ code: "RPC_ERROR", message: e instanceof Error ? e.message : "Network error while analyzing." });
    } finally {
      clearInterval(tick);
      setLoading(false);
    }
  }, [chain, address]);

  useEffect(() => {
    load(false);
  }, [load]);

  const loadAi = useCallback(async () => {
    if (!data || ai || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain, address }),
      });
      const json = await res.json();
      if (json.ok) setAi(json.data);
    } catch { /* keep deterministic empty state */ } finally {
      setAiLoading(false);
    }
  }, [data, ai, aiLoading, chain, address]);

  useEffect(() => {
    if (tab === "ai") loadAi();
  }, [tab, loadAi]);

  const counts = useMemo(() => {
    if (!data) return { Critical: 0, High: 0, Medium: 0, Low: 0, Informational: 0 };
    const c: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0, Informational: 0 };
    for (const f of data.findings) c[f.severity] = (c[f.severity] ?? 0) + 1;
    return c;
  }, [data]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="ov-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="info">{chain === "robinhood" ? "Robinhood Chain · 4663" : "BNB Smart Chain · 56"}</StatusBadge>
            {data && (
              <>
                <StatusBadge tone={data.proxy.resolution.isProxy ? "warn" : "ok"}>
                  {data.proxy.resolution.isProxy ? `proxy · ${data.proxy.resolution.pattern}` : "not a known proxy"}
                </StatusBadge>
                <StatusBadge tone={data.sourceVerified ? "ok" : "neutral"}>
                  {data.sourceVerified ? "source verified" : "source unverified"}
                </StatusBadge>
                {data.cached && <StatusBadge tone="neutral">cached</StatusBadge>}
              </>
            )}
          </div>
          <p className="code-font mt-2 truncate text-sm font-bold sm:text-base" title={address}>{address}</p>
          {data && <p className="code-font mt-1 text-xs text-[var(--ov-faint)]">block {data.blockNumber} · {data.byteSize.toLocaleString()} bytes · {data.codeHash.slice(0, 20)}…</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton value={address} label="Copy" />
          <a href={data?.explorerUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="ov-btn-ghost inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium">
            Explorer <ExternalLink size={13} />
          </a>
          <button onClick={() => load(true)} className="ov-btn-ghost inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium" disabled={loading}>
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Refresh
          </button>
          <button onClick={() => setSidebarOpen((v) => !v)} className="ov-btn-ghost px-2.5 py-1.5 text-xs font-medium lg:hidden" aria-label="Toggle section navigation">
            Sections
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-4">
          <div className="ov-card mb-3 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><Loader2 size={15} className="animate-spin text-[var(--ov-accent-hover)]" /> {STAGES[stage]}…</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--ov-elevated)]">
              <div className="h-full rounded-full bg-[var(--ov-accent)] transition-all" style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }} />
            </div>
          </div>
          <ReportSkeleton />
        </div>
      )}

      {error && !loading && (
        <div className="ov-card mt-4 border-[var(--ov-critical)]/40 p-6" role="alert">
          <p className="flex items-center gap-2 font-semibold text-[var(--ov-critical)]"><AlertTriangle size={17} /> {humanizeError(error.code)}</p>
          <p className="code-font mt-2 text-sm text-[var(--ov-muted)]">{error.message}</p>
          <ErrorHint code={error.code} chain={chain} />
          <div className="mt-4 flex gap-2">
            <button onClick={() => load(true)} className="ov-btn-bronze px-4 py-2 text-sm">Retry analysis</button>
            <Link href="/analyze" className="ov-btn-ghost px-4 py-2 text-sm">Try another address</Link>
          </div>
        </div>
      )}

      {data && !loading && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
          {/* Sidebar */}
          <aside className={`${sidebarOpen ? "block" : "hidden"} lg:block`} aria-label="Report sections">
            <nav className="ov-card grid gap-1 p-2 lg:sticky lg:top-20">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setTab(t.key); setSidebarOpen(false); }}
                  aria-current={tab === t.key ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    tab === t.key ? "bg-[var(--ov-accent-dim)] text-[var(--ov-accent-hover)]" : "text-[var(--ov-muted)] hover:bg-[var(--ov-accent-dim)]/50 hover:text-[var(--ov-text)]"
                  }`}
                >
                  <t.icon size={16} />
                  {t.label}
                  {t.key === "functions" && <span className="code-font ml-auto text-xs">{data.selectors.selectors.length}</span>}
                  {t.key === "security" && <span className="code-font ml-auto text-xs">{data.findings.length}</span>}
                </button>
              ))}
              <div className="my-1 border-t border-[var(--ov-border)]" />
              <Link href={`/compare?aChain=${chain}&aAddr=${address}`} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--ov-muted)] hover:bg-[var(--ov-accent-dim)]/50 hover:text-[var(--ov-text)]">
                <GitCompareArrows size={16} /> Compare
              </Link>
              <Link href="/history" className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--ov-muted)] hover:bg-[var(--ov-accent-dim)]/50 hover:text-[var(--ov-text)]">
                <HistoryIcon size={16} /> History
              </Link>
            </nav>
          </aside>

          {/* Content */}
          <div className="min-w-0">
            {tab === "overview" && <Overview data={data} counts={counts} />}
            {tab === "functions" && (
              <div>
                <SectionTitle title="Function discovery" sub={`${data.selectors.selectors.length} selector(s) · dispatcher: ${data.selectors.dispatcherType}`} />
                <FunctionsTable selectors={data.selectors.selectors} />
                <Limitations items={data.selectors.limitations} />
              </div>
            )}
            {tab === "bytecode" && (
              <div>
                <SectionTitle title="Bytecode inspector" sub={`${data.byteSize.toLocaleString()} bytes · hash ${data.codeHash.slice(0, 18)}… · block ${data.blockNumber}`} />
                {data.disassembly ? (
                  <BytecodeViewer ops={data.disassembly} bytecode={data.bytecode} codeHash={data.codeHash} block={data.blockNumber} />
                ) : (
                  <div className="ov-card p-6 text-sm text-[var(--ov-muted)]">Disassembly unavailable for this response shape — raw bytecode below.</div>
                )}
              </div>
            )}
            {tab === "decompiled" && (
              <div>
                <SectionTitle title="Decompiled view" sub={`${data.decompiled.mode} · ${data.decompiled.language}`} />
                <div className="mb-3 flex flex-wrap gap-2">
                  <StatusBadge tone="warn">APPROXIMATE — not original source</StatusBadge>
                  <StatusBadge tone="neutral">{data.decompiled.mode}</StatusBadge>
                </div>
                {data.decompiled.warnings.map((w, i) => (
                  <p key={i} className="mb-2 rounded-lg border border-[var(--ov-border)] bg-[var(--ov-elevated)] p-2.5 text-xs text-[var(--ov-muted)]">{w}</p>
                ))}
                <pre className="code-font overflow-auto rounded-[12px] border border-[var(--ov-border)] bg-[var(--ov-code-bg)] p-4 text-[13px] leading-6 text-[#e4d9c4]">{data.decompiled.output}</pre>
                <p className="code-font mt-2 text-xs text-[var(--ov-faint)]">Provenance: {data.decompiled.provenance.join(" ")}</p>
              </div>
            )}
            {tab === "security" && (
              <div>
                <SectionTitle title="Security findings" sub={`${data.findings.length} finding(s) · evidence-backed, never a verdict`} />
                <FindingsList findings={data.findings} />
              </div>
            )}
            {tab === "ai" && (
              <div>
                <SectionTitle title="AI explanation" sub="Evidence-grounded · prompt-injection hardened" />
                {aiLoading && <ReportSkeleton />}
                {!aiLoading && ai && <AiView ai={ai} />}
                {!aiLoading && !ai && (
                  <button onClick={loadAi} className="ov-btn-bronze px-5 py-2.5 text-sm">Generate explanation</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <p className="code-font text-xs text-[var(--ov-faint)]">{sub}</p>
    </div>
  );
}

function Limitations({ items }: { items: string[] }) {
  return (
    <div className="mt-3 rounded-[12px] border border-[var(--ov-border)] bg-[var(--ov-elevated)] p-3 text-xs leading-relaxed text-[var(--ov-muted)]">
      <p className="font-semibold text-[var(--ov-text)]">Limitations</p>
      <ul className="mt-1 list-disc pl-5">{items.map((i, k) => <li key={k}>{i}</li>)}</ul>
    </div>
  );
}

function Overview({ data, counts }: { data: AnalysisPayload; counts: Record<string, number> }) {
  const cards = [
    { k: "Runtime size", v: `${data.byteSize.toLocaleString()} bytes` },
    { k: "Selectors", v: `${data.selectors.selectors.length} detected` },
    { k: "Findings", v: `${data.findings.length} recorded` },
    { k: "Proxy", v: data.proxy.resolution.isProxy ? data.proxy.resolution.pattern : "none detected" },
    { k: "Source", v: data.sourceVerified ? "verified" : "unverified" },
    { k: "Completeness", v: `${data.completeness.score}%` },
  ];
  return (
    <div>
      <div className="ov-card p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-[var(--ov-accent-hover)]"><CheckCircle2 size={16} /> Contract summary</p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ov-muted)]">{data.summary}</p>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.k} className="ov-card px-4 py-3.5">
            <p className="text-xs text-[var(--ov-faint)]">{c.k}</p>
            <p className="code-font mt-1 truncate text-sm font-bold" title={c.v}>{c.v}</p>
          </div>
        ))}
      </div>
      <div className="ov-card mt-3 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold"><Boxes size={15} /> Proxy resolution</p>
        {data.proxy.resolution.isProxy ? (
          <div className="code-font mt-2 space-y-1 text-xs text-[var(--ov-muted)]">
            <p>pattern: <span className="text-[var(--ov-accent-hover)]">{data.proxy.resolution.pattern}</span> · confidence {data.proxy.resolution.confidence}</p>
            {data.proxy.resolution.implementation && <p>implementation: {data.proxy.resolution.implementation} <Link className="text-[var(--ov-accent-hover)] underline" href={`/contract/${data.chain}/${data.proxy.resolution.implementation}`}>analyze →</Link></p>}
            {data.proxy.resolution.admin && <p>admin: {data.proxy.resolution.admin}</p>}
            {data.proxy.resolution.beacon && <p>beacon: {data.proxy.resolution.beacon}</p>}
            {data.proxy.resolution.provenance.map((p, i) => <p key={i} className="text-[var(--ov-faint)]">· {p}</p>)}
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--ov-muted)]">No known proxy pattern. {data.proxy.resolution.provenance[0] ?? ""} {data.proxy.resolution.pattern === "uncertain" && "Structure is uncertain — DELEGATECALL exists without slot evidence."}</p>
        )}
      </div>
      <div className="ov-card mt-3 p-5">
        <p className="text-sm font-semibold">Severity mix (heuristic counts, not a grade)</p>
        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-[var(--ov-elevated)]">
          {(["Critical", "High", "Medium", "Low", "Informational"] as const).map((s) => {
            const n = counts[s] ?? 0;
            const total = Math.max(1, data.findings.length);
            const color = s === "Critical" ? "var(--ov-critical)" : s === "High" ? "#e8934e" : s === "Medium" ? "var(--ov-warning)" : s === "Low" ? "var(--ov-accent)" : "var(--ov-success)";
            return <span key={s} title={`${s}: ${n}`} style={{ width: `${(n / total) * 100}%`, background: color }} />;
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--ov-muted)]">
          {(["Critical", "High", "Medium", "Low", "Informational"] as const).map((s) => (
            <span key={s} className="code-font">{s}: {counts[s] ?? 0}</span>
          ))}
        </div>
        {data.completeness.notes.length > 0 && (
          <ul className="mt-3 list-disc pl-5 text-xs text-[var(--ov-warning)]">
            {data.completeness.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

function AiView({ ai }: { ai: { available: boolean; model: string | null; summary: string; bullets: string[]; risks: string[]; unknowns: string[]; provenance: string[] } }) {
  return (
    <div>
      {!ai.available && (
        <div className="mb-3 rounded-[12px] border border-[var(--ov-border)] bg-[var(--ov-elevated)] p-3 text-xs text-[var(--ov-muted)]">
          <strong className="text-[var(--ov-text)]">AI unavailable — deterministic summary shown.</strong> Set <span className="code-font">LLM_API_KEY</span> (OpenAI-compatible) to enable model explanations. No keys are ever sent to the browser.
        </div>
      )}
      <div className="ov-card p-5">
        <p className="text-sm leading-relaxed">{ai.summary}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ov-faint)]">Key points</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[var(--ov-muted)]">{ai.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ov-faint)]">Risk indicators</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[var(--ov-muted)]">{ai.risks.length ? ai.risks.map((b, i) => <li key={i}>{b}</li>) : <li>None above Low in current findings.</li>}</ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ov-faint)]">Unknowns</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[var(--ov-muted)]">{ai.unknowns.map((b, i) => <li key={i}>{b}</li>)}</ul>
          </div>
        </div>
        <p className="code-font mt-4 text-[11px] text-[var(--ov-faint)]">{ai.provenance.join(" ")}{ai.model ? ` · model ${ai.model}` : ""}</p>
      </div>
    </div>
  );
}

function humanizeError(code: string): string {
  switch (code) {
    case "INVALID_ADDRESS": return "That address looks invalid";
    case "NO_CONTRACT_CODE": return "No contract at this address";
    case "RPC_ERROR":
    case "RPC_TIMEOUT": return "Network / RPC problem";
    case "RATE_LIMITED": return "Too many requests — slow down";
    default: return "Analysis did not complete";
  }
}

function ErrorHint({ code, chain }: { code: string; chain: string }) {
  if (code === "NO_CONTRACT_CODE") {
    return (
      <p className="mt-2 text-sm text-[var(--ov-muted)]">
        This address holds no runtime bytecode on {chain === "robinhood" ? "Robinhood Chain" : "BNB Smart Chain"} at the latest block — it is an externally owned account (EOA) or an undeployed address. Double-check the network selection.
      </p>
    );
  }
  if (code === "RPC_ERROR" || code === "RPC_TIMEOUT") {
    return (
      <p className="mt-2 text-sm text-[var(--ov-muted)]">
        The chain RPC did not respond in time. Public endpoints are best-effort — retry, or set <span className="code-font">ROBINHOOD_RPC_URL / BSC_RPC_URL</span> to a dedicated provider.
      </p>
    );
  }
  return null;
}
