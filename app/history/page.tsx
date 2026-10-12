"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/ui";

interface Entry {
  id: string;
  chain: string;
  address: string;
  blockNumber: string;
  codeHash: string;
  byteSize: number;
  selectorCount: number;
  findingCount: number;
  isProxy: boolean;
  proxyPattern: string;
  createdAt: string;
}

export default function HistoryPage() {
  const [items, setItems] = useState<Entry[]>([]);
  const [q, setQ] = useState("");
  const [chain, setChain] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (chain) params.set("chain", chain);
      params.set("limit", "100");
      const res = await fetch(`/api/history?${params.toString()}`);
      const json = await res.json();
      if (json.ok) setItems(json.data.items ?? []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ov-accent-hover)]">Recent analyses</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">History</h1>
      <p className="mt-3 text-sm text-[var(--ov-muted)]">Public, wallet-free inspection log. Search by address or code hash; filter by network.</p>
      <form
        className="mt-6 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => { e.preventDefault(); load(); }}
      >
        <label className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ov-faint)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search address or code hash…" className="ov-input w-full py-2.5 pl-9 pr-3 text-sm" aria-label="Search history" />
        </label>
        <select value={chain} onChange={(e) => setChain(e.target.value)} className="ov-input px-3 py-2.5 text-sm" aria-label="Filter by network">
          <option value="">All networks</option>
          <option value="robinhood">Robinhood Chain</option>
          <option value="bsc">BNB Smart Chain</option>
        </select>
        <button type="submit" className="ov-btn-bronze px-5 py-2.5 text-sm">Search</button>
      </form>
      <div className="mt-4 grid gap-2">
        {loading && <div className="skeleton h-24" />}
        {!loading && items.length === 0 && (
          <div className="ov-card p-8 text-center text-sm text-[var(--ov-muted)]">
            No analyses found. <Link href="/analyze" className="text-[var(--ov-accent-hover)] underline">Analyze your first contract →</Link>
          </div>
        )}
        {items.map((e) => (
          <Link key={e.id} href={`/contract/${e.chain}/${e.address}`} className="ov-card flex flex-col gap-2 px-4 py-3 transition-colors hover:border-[var(--ov-border-strong)] sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="code-font truncate text-sm font-bold">{e.address}</p>
              <p className="code-font mt-0.5 text-xs text-[var(--ov-faint)]">block {e.blockNumber} · {new Date(e.createdAt).toLocaleString()} · {e.codeHash.slice(0, 14)}…</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge tone="info">{e.chain}</StatusBadge>
              <StatusBadge tone="neutral">{e.selectorCount} fn</StatusBadge>
              <StatusBadge tone={e.findingCount > 0 ? "warn" : "neutral"}>{e.findingCount} findings</StatusBadge>
              {e.isProxy && <StatusBadge tone="warn">{e.proxyPattern}</StatusBadge>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
