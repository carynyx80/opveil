export const metadata = { title: "Documentation — Opveil" };

const SECTIONS: { title: string; body: string[]; code?: string }[] = [
  {
    title: "Supported networks",
    body: [
      "Opveil supports exactly two mainnets: Robinhood Chain (chain ID 4663, RPC https://rpc.mainnet.chain.robinhood.com, explorer https://robinhoodchain.blockscout.com) and BNB Smart Chain (chain ID 56, RPC https://bsc-dataseed.bnbchain.org, explorer https://bscscan.com).",
      "Override RPCs with ROBINHOOD_RPC_URL and BSC_RPC_URL. Public endpoints are best-effort development defaults — use a dedicated provider in production.",
      "Robinhood Chain is a blockchain network and is unrelated to brokerage accounts.",
    ],
  },
  {
    title: "How analysis works",
    body: [
      "1. Address + chain are validated (viem checksum) client- and server-side.",
      "2. eth_getCode and eth_blockNumber pin the runtime to a block; code hash (keccak256), size, and provenance are recorded.",
      "3. The engine disassembles (PUSH0-aware, metadata-trailer aware), detects dispatcher selectors, resolves EIP-1967/EIP-1167 proxy slots, runs deterministic security checks, and builds a structural decompiled view.",
      "4. Results are cached by chain + address + block + codeHash + engine version and persisted to history.",
    ],
  },
  {
    title: "What the findings mean",
    body: [
      "Every finding carries severity (Informational → Critical), confidence, opcode/function/storage references, impact, and limitations.",
      "A pattern is never proof of a vulnerability. Opveil never issues a safe/unsafe verdict. Anything security-critical needs a professional audit plus dynamic testing.",
      "SELFDESTRUCT notes carry Cancun-era semantic caveats; proxy findings never assume proxy storage equals implementation storage.",
    ],
  },
  {
    title: "Decompiled view is approximate",
    body: [
      "Without verified source, Opveil shows a structural pseudocode skeleton labeled APPROXIMATE, or output from an external decompiler if DECOMPILER_CMD is configured (sandboxed: no shell, 20s timeout, bounded buffer).",
      "An LLM is never used to fake exact source. Treat reconstructed names and types as illustrative.",
    ],
  },
  {
    title: "AI explanations",
    body: [
      "Set LLM_API_KEY (plus optional LLM_BASE_URL, LLM_MODEL) for an OpenAI-compatible model. The model receives structured evidence only, must return schema-validated JSON, and contract data is tagged untrusted to resist prompt injection.",
      "Without a key, a deterministic local summary is shown with an explicit AI-unavailable label. Rate limits, timeouts, and token caps apply.",
    ],
  },
  {
    title: "API reference",
    body: [
      "All endpoints return { ok, data, error, meta }. Errors use stable codes: INVALID_ADDRESS, UNSUPPORTED_CHAIN, NO_CONTRACT_CODE, RPC_ERROR, RPC_TIMEOUT, RATE_LIMITED, NOT_FOUND, BAD_REQUEST.",
    ],
    code: `POST /api/analyze                      { chain, address, refresh? }
GET  /api/contracts/[chain]/[address]
GET  /api/contracts/[chain]/[address]/bytecode
GET  /api/contracts/[chain]/[address]/functions
GET  /api/contracts/[chain]/[address]/security
POST /api/explain                     { chain, address, question? }
POST /api/compare                     { a:{chain,address}, b:{chain,address} }
GET  /api/history?chain=&q=&limit=
GET  /api/health`,
  },
  {
    title: "Security & privacy",
    body: [
      "Read-only by design: no wallet connection, no signing, no deployment, no seed-phrase handling. Untrusted contract code is never executed on the server.",
      "SSRF is prevented by allow-listing RPC hosts per chain; user-controlled URLs are rejected. History is public by design for MVP — no personal data is collected.",
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ov-accent-hover)]">Documentation</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">How Opveil works</h1>
      <div className="mt-8 grid gap-4">
        {SECTIONS.map((s) => (
          <section key={s.title} className="ov-card p-5">
            <h2 className="font-bold">{s.title}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-2 text-sm leading-relaxed text-[var(--ov-muted)]">{p}</p>
            ))}
            {s.code && (
              <pre className="code-font mt-3 overflow-auto rounded-lg border border-[var(--ov-border)] bg-[var(--ov-code-bg)] p-3 text-xs leading-6 text-[#e4d9c4]">{s.code}</pre>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
