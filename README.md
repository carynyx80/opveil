# Opveil — Uncover the code beneath

Standalone, read-only EVM contract intelligence for **Robinhood Chain (4663)** and **BNB Smart Chain (56)**.
Paste a deployed address → live bytecode → disassembly → selectors → proxy resolution → evidence-backed findings → AI explanation.

> **Not a security audit.** Findings are bytecode-derived heuristics with confidence + limitations. No safe/unsafe verdicts, ever.

## Quickstart (zero-config, no database needed)

```bash
cd opveil
npm install
cp .env.example .env.local   # optional — defaults work out of the box
npm run dev                  # http://localhost:3000
```

History persists to `./data/*.json`; analysis cache is in-memory. Everything works without Postgres/Redis.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` / `npm start` | Production build + serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit suite (offline, fixture-based) |
| `npm run e2e` | Playwright flow (landing → analyze validation → docs → health) |

## Environment

See `.env.example`. Browser only ever sees `NEXT_PUBLIC_*`. Keys (`LLM_API_KEY`, `DATABASE_URL`, `BSCSCAN_API_KEY`) stay server-side.

| Var | Default | Notes |
|---|---|---|
| `ROBINHOOD_RPC_URL` | `https://rpc.mainnet.chain.robinhood.com` | Override with dedicated provider in prod |
| `BSC_RPC_URL` | `https://bsc-dataseed.bnbchain.org` | Same |
| `RPC_TIMEOUT_MS` | `15000` | Per-call timeout |
| `DATABASE_URL` | — | Enables Prisma mirror (optional) |
| `REDIS_URL` | — | Documented cache path; memory cache is authoritative for MVP |
| `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` | — | Without a key: deterministic summary + “AI unavailable” label |
| `DECOMPILER_CMD` | — | Optional external decompiler binary (sandboxed: no shell, 20s timeout) |
| `BSCSCAN_API_KEY` | — | Improves BSC source-verification accuracy |
| `RATE_LIMIT_PER_MIN` | `30` | In-memory sliding window per IP+route |

## API

Consistent envelope: `{ ok, data, error, meta }`. Error codes: `INVALID_ADDRESS`, `UNSUPPORTED_CHAIN`, `NO_CONTRACT_CODE`, `RPC_ERROR`, `RPC_TIMEOUT`, `RATE_LIMITED`, `NOT_FOUND`, `BAD_REQUEST`, `ANALYSIS_FAILED`, `LLM_UNAVAILABLE`.

```
POST /api/analyze                      { chain, address, refresh? }
GET  /api/contracts/[chain]/[address]
GET  /api/contracts/[chain]/[address]/bytecode?offset=&limit=
GET  /api/contracts/[chain]/[address]/functions
GET  /api/contracts/[chain]/[address]/security
POST /api/explain                      { chain, address, question? }
POST /api/compare                      { a:{chain,address}, b:{chain,address} }
GET  /api/history?chain=&q=&limit=
GET  /api/health
```

## Feature status

| Feature | Status |
|---|---|
| RPC code fetch (pinned block, code hash, provenance) | ✅ Fully implemented |
| Disassembler (PUSH0, metadata trailer, gas notes) | ✅ |
| Selector detection + curated signatures | ✅ (heuristic; external DB matches intentionally not auto-claimed) |
| EIP-1967 / beacon / EIP-1167 proxy resolution + implementation fetch | ✅ |
| Deterministic security checks (11 rules) | ✅ |
| Structural decompile view (APPROXIMATE-labeled) | ✅; external binary via `DECOMPILER_CMD` (optional) |
| AI explanation (OpenAI-compatible, schema-validated, injection-hardened) | ✅ with key; deterministic fallback without |
| Comparison + export | ✅ |
| History (file-backed MVP; Prisma schema for Postgres) | ✅ MVP / 🟡 Postgres mirror best-effort |
| Redis cache | 🟡 Documented; memory LRU authoritative |
| Verified-source lookup (BscScan API + Blockscout v2) | ✅ best-effort (public APIs may rate-limit) |

## Project layout

```
app/            pages + API routes (App Router)
components/     theme, nav, forms, report shell, analysis views
lib/
  chains.ts rpc.ts validate.ts envelope.ts cache.ts store.ts analysis.ts llm.ts
  evm/  opcodes.ts disassembler.ts selectors.ts signatures.ts proxy.ts
        security.ts decompile.ts compare.ts
tests/          vitest unit suite (fixtures, no network)
e2e/            playwright main-flow spec
prisma/         Postgres schema (production path)
```

## Deployment

See `DEPLOY.md` (Vercel frontend + worker/data guidance, Docker Compose for Postgres/Redis).
