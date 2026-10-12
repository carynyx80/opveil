"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="ov-btn-ghost inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch { /* clipboard unavailable */ }
      }}
      aria-label={`${label}: ${value.slice(0, 18)}…`}
    >
      {done ? <Check size={13} /> : <Copy size={13} />}
      {done ? "Copied" : label}
    </button>
  );
}

export function StatusBadge({ tone, children }: { tone: "ok" | "warn" | "bad" | "info" | "neutral"; children: React.ReactNode }) {
  const map: Record<string, string> = {
    ok: "border-[var(--ov-success)]/40 bg-[var(--ov-success)]/10 text-[var(--ov-success)]",
    warn: "border-[var(--ov-warning)]/40 bg-[var(--ov-warning)]/10 text-[var(--ov-warning)]",
    bad: "border-[var(--ov-critical)]/40 bg-[var(--ov-critical)]/10 text-[var(--ov-critical)]",
    info: "border-[var(--ov-accent)]/40 bg-[var(--ov-accent-dim)] text-[var(--ov-accent-hover)]",
    neutral: "border-[var(--ov-border)] bg-[var(--ov-elevated)] text-[var(--ov-muted)]",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${map[tone]}`}>
      {children}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function SeverityDot({ severity }: { severity: string }) {
  const color =
    severity === "Critical" ? "var(--ov-critical)"
    : severity === "High" ? "#e8934e"
    : severity === "Medium" ? "var(--ov-warning)"
    : severity === "Low" ? "var(--ov-accent)"
    : "var(--ov-success)";
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} aria-hidden="true" />;
}
