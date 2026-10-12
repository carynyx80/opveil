import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <p className="code-font text-sm text-[var(--ov-accent-hover)]">404 · not found</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">This trail goes cold.</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--ov-muted)]">
        The page you asked for does not exist. If you pasted a contract link, check the network and address and try
        again.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Link href="/" className="ov-btn-bronze px-5 py-2.5 text-sm">Back home</Link>
        <Link href="/analyze" className="ov-btn-ghost px-5 py-2.5 text-sm">Analyze a contract</Link>
      </div>
    </div>
  );
}
