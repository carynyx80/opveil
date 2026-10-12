"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAddress } from "viem";
import { ArrowRight, Loader2 } from "lucide-react";

export type NetKey = "robinhood" | "bsc";

export function AddressForm({ compact = false, initialChain = "robinhood" as NetKey }: { compact?: boolean; initialChain?: NetKey }) {
  const router = useRouter();
  const [chain, setChain] = useState<NetKey>(initialChain);
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = address.trim();
    if (!isAddress(v, { strict: false })) {
      setError("Enter a valid 0x EVM address (40 hex characters).");
      return;
    }
    setError(null);
    setBusy(true);
    router.push(`/contract/${chain}/${v.trim()}`);
  }

  return (
    <form onSubmit={submit} className="w-full" aria-label="Analyze a contract">
      <div className={`ov-card flex flex-col gap-3 ${compact ? "p-3" : "p-4 sm:p-5"} sm:flex-row sm:items-center`}>
        <div className="flex gap-2" role="radiogroup" aria-label="Network">
          {(["robinhood", "bsc"] as NetKey[]).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={chain === n}
              onClick={() => setChain(n)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                chain === n
                  ? "border-[var(--ov-accent)] bg-[var(--ov-accent-dim)] text-[var(--ov-accent-hover)]"
                  : "border-[var(--ov-border)] text-[var(--ov-muted)] hover:text-[var(--ov-text)]"
              }`}
            >
              {n === "robinhood" ? "Robinhood · 4663" : "BSC · 56"}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="opveil-address">Contract address</label>
        <input
          id="opveil-address"
          className="ov-input code-font flex-1 px-4 py-3 text-sm"
          placeholder="0x… paste a deployed contract address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          inputMode="text"
        />
        <button type="submit" disabled={busy} className="ov-btn-bronze inline-flex items-center justify-center gap-2 px-5 py-3 text-sm">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          Analyze contract
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-[var(--ov-critical)]">
          {error}
        </p>
      )}
      {!compact && (
        <p className="mt-3 text-center text-xs text-[var(--ov-faint)]">
          Read-only inspection. No wallet connection, no signing, no deployment.
        </p>
      )}
    </form>
  );
}
