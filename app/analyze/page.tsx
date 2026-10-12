import { AddressForm } from "@/components/address-form";
import { HistoryPreview } from "@/components/history-preview";

export const metadata = { title: "Analyze — Opveil" };

export default function AnalyzePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ov-accent-hover)]">Analysis workspace</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Inspect any contract</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--ov-muted)]">
        Paste a deployed address below. Opveil reads live runtime bytecode at a pinned block, disassembles it, detects
        selectors and proxies, and records evidence-backed findings. You will be taken to the full report.
      </p>
      <div className="mt-6">
        <AddressForm />
      </div>
      <div className="mt-10">
        <HistoryPreview />
      </div>
    </div>
  );
}
