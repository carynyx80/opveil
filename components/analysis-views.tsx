"use client";

import { useCallback, useMemo, useState } from "react";
import { CopyButton, SeverityDot, Skeleton, StatusBadge } from "./ui";
import type { DecodedOp } from "@/lib/evm/disassembler";
import { opcodeClass } from "@/lib/evm/disassembler";
import { Download, Search, ChevronsUpDown } from "lucide-react";

export function BytecodeViewer({ ops, bytecode, codeHash, block }: { ops: DecodedOp[]; bytecode: string; codeHash: string; block: string }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("ALL");
  const [limit, setLimit] = useState(400);
  const [jumpTo, setJumpTo] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toUpperCase();
    return ops.filter((o) => {
      if (kind !== "ALL" && opcodeClass(o.name) !== kind && o.kind !== kind) return false;
      if (!needle) return true;
      return o.name.includes(needle) || (o.operand ?? "").toUpperCase().includes(needle) || String(o.offset) === needle.replace(/^0X/, "");
    });
  }, [ops, q, kind]);

  const shown = filtered.slice(0, limit);

  function jump(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(jumpTo.trim());
    if (!Number.isFinite(n)) return;
    const el = document.getElementById(`op-${n}`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function exportCsv() {
    const rows = ["offset,opcode,operand,gas", ...filtered.map((o) => `${o.offset},${o.name},${o.operand ?? ""},\"${o.gas}\"`)];
    download(`opveil-opcodes-${block}.csv`, rows.join("\n"), "text/csv");
  }

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ov-faint)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search opcode, operand, or offset…" className="ov-input w-full py-2.5 pl-9 pr-3 text-sm" aria-label="Search opcodes" />
        </label>
        <div className="flex gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="ov-input px-3 py-2.5 text-xs" aria-label="Filter opcode class">
            {["ALL", "PUSH", "JUMPDEST", "CALLLIKE", "STORAGE", "HALT", "FLOW", "LOG", "CALL", "SYS"].map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <form onSubmit={jump} className="flex gap-1">
            <input value={jumpTo} onChange={(e) => setJumpTo(e.target.value)} placeholder="offset" className="ov-input code-font w-24 px-3 py-2.5 text-xs" aria-label="Jump to offset" inputMode="numeric" />
            <button className="ov-btn-ghost px-3 text-xs" type="submit" aria-label="Jump to offset"><ChevronsUpDown size={14} /></button>
          </form>
          <button className="ov-btn-ghost inline-flex items-center gap-1.5 px-3 text-xs" onClick={() => download(`opveil-bytecode-${block}.hex`, bytecode, "text/plain")}>
            <Download size={14} /> .hex
          </button>
          <button className="ov-btn-ghost inline-flex items-center gap-1.5 px-3 text-xs" onClick={exportCsv}>
            <Download size={14} /> .csv
          </button>
        </div>
      </div>
      <p className="code-font mb-2 text-xs text-[var(--ov-faint)]">
        {filtered.length.toLocaleString()} / {ops.length.toLocaleString()} ops · hash <span className="text-[var(--ov-muted)]">{codeHash.slice(0, 18)}…</span> · block {block} · runtime bytecode is not source code
      </p>
      <div className="code-font overflow-hidden rounded-[12px] border border-[var(--ov-border)] bg-[var(--ov-code-bg)] text-[13px] leading-7" role="table" aria-label="Disassembled opcodes">
        <div className="max-h-[560px] overflow-auto p-3">
          {shown.map((o) => (
            <div key={o.offset} id={`op-${o.offset}`} className="grid scroll-mt-24 grid-cols-[64px_150px_1fr] gap-2 rounded px-2 hover:bg-white/[0.04]">
              <span className="text-[var(--ov-faint)]">{o.offset.toString().padStart(5, "0")}</span>
              <span className={`font-semibold opcode-${opcodeClass(o.name)}`}>{o.name}</span>
              <span className="truncate text-[#d8cdbb]">
                {o.operand ? "0x" + o.operand : <span className="text-[var(--ov-faint)]">—</span>}
                {o.isJumpDest && <span className="ml-2 rounded border border-[var(--ov-success)]/40 px-1.5 text-[10px] text-[var(--ov-success)]">JUMPDEST</span>}
              </span>
            </div>
          ))}
          {shown.length === 0 && <p className="p-6 text-center text-[var(--ov-muted)]">No opcodes match this filter.</p>}
        </div>
      </div>
      {filtered.length > limit && (
        <button className="ov-btn-ghost mt-3 w-full py-2.5 text-sm" onClick={() => setLimit((l) => l + 600)}>
          Show more ({(filtered.length - limit).toLocaleString()} remaining — virtualized paging)
        </button>
      )}
      <div className="mt-3 flex items-center gap-2">
        <CopyButton value={bytecode} label="Copy raw bytecode" />
      </div>
    </div>
  );
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function FunctionsTable({ selectors }: { selectors: { selector: string; signature: string | null; confidence: string; evidence: string[]; opcodeOffsets: number[]; hasStorageAccess: boolean; hasExternalCall: boolean; ambiguityNote: string | null }[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (selectors.length === 0) {
    return (
      <div className="ov-card p-6 text-sm text-[var(--ov-muted)]">
        No dispatcher selectors detected. The contract may be fallback-only, a minimal proxy stub, or use a non-standard dispatch layout. Bytecode and proxy tabs remain ground truth.
      </div>
    );
  }
  return (
    <div className="grid gap-2">
      {selectors.map((s) => (
        <div key={s.selector} className="ov-card overflow-hidden">
          <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left" onClick={() => setOpen(open === s.selector ? null : s.selector)} aria-expanded={open === s.selector}>
            <span className="code-font text-sm font-bold text-[var(--ov-accent-hover)]">{s.selector}</span>
            <span className="code-font min-w-0 flex-1 truncate text-sm">{s.signature ?? <span className="text-[var(--ov-faint)]">unknown signature</span>}</span>
            <span className="hidden items-center gap-2 text-xs text-[var(--ov-muted)] sm:flex">
              {s.hasStorageAccess && <StatusBadge tone="neutral">storage</StatusBadge>}
              {s.hasExternalCall && <StatusBadge tone="warn">calls</StatusBadge>}
              <StatusBadge tone={s.confidence === "high" ? "ok" : s.confidence === "medium" ? "warn" : "neutral"}>{s.confidence}</StatusBadge>
            </span>
          </button>
          {open === s.selector && (
            <div className="border-t border-[var(--ov-border)] px-4 py-3 text-sm">
              <p className="font-semibold">Evidence</p>
              <ul className="code-font mt-1 list-disc space-y-1 pl-5 text-xs text-[var(--ov-muted)]">
                {s.evidence.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
              <p className="mt-3 text-xs text-[var(--ov-muted)]">
                Opcode offsets: <span className="code-font">{s.opcodeOffsets.join(", ") || "—"}</span>
              </p>
              {s.ambiguityNote && <p className="mt-2 rounded-lg border border-[var(--ov-warning)]/30 bg-[var(--ov-warning)]/5 p-2.5 text-xs text-[var(--ov-warning)]">{s.ambiguityNote}</p>}
              <p className="mt-2 text-xs text-[var(--ov-faint)]">Parameter names/types cannot be recovered from bytecode — never invented here.</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function FindingsList({ findings }: { findings: { id: string; title: string; description: string; severity: string; confidence: string; evidence: string[]; impact: string; limitations: string; opcodeRefs: number[]; selectorRefs: string[]; storageRefs: string[] }[] }) {
  const [filter, setFilter] = useState("ALL");
  const list = findings.filter((f) => filter === "ALL" || f.severity === filter);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filter findings by severity">
        {["ALL", "Critical", "High", "Medium", "Low", "Informational"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === s ? "border-[var(--ov-accent)] bg-[var(--ov-accent-dim)] text-[var(--ov-accent-hover)]" : "border-[var(--ov-border)] text-[var(--ov-muted)]"}`}>
            {s}
          </button>
        ))}
      </div>
      <div className="mb-4 rounded-[12px] border border-[var(--ov-warning)]/30 bg-[var(--ov-warning)]/5 p-3 text-xs leading-relaxed text-[var(--ov-warning)]">
        <strong>Not a security audit.</strong> Findings are deterministic bytecode heuristics with stated confidence and
        limitations. A pattern is not proof of a vulnerability, and absence of findings never means a contract is safe.
      </div>
      <div className="grid gap-2">
        {list.map((f) => (
          <details key={f.id} className="ov-card group px-4 py-3" open={["High", "Critical"].includes(f.severity)}>
            <summary className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
              <SeverityDot severity={f.severity} />
              {f.title}
              <span className="ml-auto flex gap-1.5">
                <StatusBadge tone={f.severity === "Critical" || f.severity === "High" ? "bad" : f.severity === "Medium" ? "warn" : "neutral"}>{f.severity}</StatusBadge>
                <StatusBadge tone="info">{f.confidence}</StatusBadge>
              </span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ov-muted)]">{f.description}</p>
            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
              <div className="rounded-lg bg-[var(--ov-elevated)] p-2.5">
                <p className="font-semibold text-[var(--ov-text)]">Evidence</p>
                <ul className="code-font mt-1 list-disc space-y-0.5 pl-4 text-[var(--ov-muted)]">
                  {f.evidence.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
                {(f.opcodeRefs.length > 0 || f.selectorRefs.length > 0 || f.storageRefs.length > 0) && (
                  <p className="code-font mt-1.5 text-[var(--ov-faint)]">
                    {f.opcodeRefs.length > 0 && <>opcodes: {f.opcodeRefs.slice(0, 6).join(", ")} </>}
                    {f.selectorRefs.length > 0 && <>selectors: {f.selectorRefs.join(", ")} </>}
                    {f.storageRefs.length > 0 && <>storage: {f.storageRefs.join("; ")}</>}
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-[var(--ov-elevated)] p-2.5">
                <p className="font-semibold text-[var(--ov-text)]">Impact & limits</p>
                <p className="mt-1 text-[var(--ov-muted)]">{f.impact}</p>
                <p className="mt-1.5 text-[var(--ov-faint)]">Limits: {f.limitations}</p>
              </div>
            </div>
          </details>
        ))}
        {list.length === 0 && <div className="ov-card p-6 text-center text-sm text-[var(--ov-muted)]">No findings at this severity.</div>}
      </div>
    </div>
  );
}

export function ReportSkeleton() {
  return (
    <div className="grid gap-3" aria-label="Loading analysis">
      <Skeleton className="h-24" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
