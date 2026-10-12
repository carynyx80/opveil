"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History } from "lucide-react";

interface Entry {
  id: string;
  chain: string;
  address: string;
  blockNumber: string;
  byteSize: number;
  selectorCount: number;
  findingCount: number;
  createdAt: string;
}

export function HistoryPreview() {
  const [items, setItems] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/history?limit=6")
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok) setItems(j.data.items ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return <div className="skeleton h-28" />;
  if (items.length === 0) {
    return (
      <div className="ov-card p-5 text-sm text-[var(--ov-muted)]">
        <p className="flex items-center gap-2 font-semibold text-[var(--ov-text)]"><History size={16} /> No analyses yet</p>
        <p className="mt-2">Your recent contract inspections will appear here and on the History page.</p>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Recent analyses</h2>
        <Link href="/history" className="text-sm font-medium text-[var(--ov-accent-hover)]">View all</Link>
      </div>
      <div className="grid gap-2">
        {items.map((e) => (
          <Link key={e.id} href={`/contract/${e.chain}/${e.address}`} className="ov-card code-font flex items-center justify-between px-4 py-3 text-xs transition-colors hover:border-[var(--ov-border-strong)]">
            <span className="truncate">{e.address}</span>
            <span className="ml-3 shrink-0 text-[var(--ov-faint)]">{e.chain} · {e.selectorCount} fn · block {e.blockNumber}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
