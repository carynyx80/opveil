# Opveil production deployment

## Recommended architecture

- **Web (Vercel):** deploy `opveil/` as a Next.js app. Set environment variables in the Vercel dashboard
  (`ROBINHOOD_RPC_URL`, `BSC_RPC_URL`, `BSCSCAN_API_KEY`, `LLM_*`, `DATABASE_URL`).
- **Data (managed Postgres):** Neon / Supabase / RDS. Run once from a machine with `DATABASE_URL` set:
  `npx prisma db push` (MVP) or wire migrations (`npx prisma migrate dev`).
- **Heavy analysis:** the engine is synchronous and RPC-bound (~2–8s per fresh analysis). For high traffic,
  move `analyzeContract` into a worker (e.g. Fly.io / Render background service or Vercel + Upstash QStash)
  with job-status polling; the `AnalysisJob` model is provided for this. For MVP traffic the direct route is fine
  behind the built-in rate limiter.
- **Cache:** in-memory LRU ships by default. Add Redis (`REDIS_URL`) and a shared adapter for multi-instance
  deployments; keep keying by `chain + address + block + codeHash + engineVersion`.

## Local Postgres + Redis

```bash
cd opveil
docker compose up -d            # postgres on :5432 (redis under --profile cache)
docker compose --profile cache up -d
cp .env.example .env.local      # set DATABASE_URL=postgresql://opveil:opveil@localhost:5432/opveil
npx prisma db push
npm run dev
```

## Vercel steps

1. Import the repo, set **Root Directory** to `opveil`.
2. Build command `npm run build`, output default (`.next`).
3. Add env vars (see README table). No secret may use a `NEXT_PUBLIC_` prefix.
4. Deploy. Verify `/api/health` shows both RPCs reachable.

## Operational notes

- Public RPCs are development defaults. In production use a dedicated endpoint (e.g. Chainstack/QuickNode/GetBlock
  for BSC; your Robinhood Chain provider) and set `RPC_TIMEOUT_MS=15000`, `RATE_LIMIT_PER_MIN=30`.
- Never allow user-controlled RPC URLs (SSRF): `lib/rpc.ts` only uses allow-listed per-chain hosts.
- The external decompiler (`DECOMPILER_CMD`) must be a fixed server-side path — never user input — executed with
  `execFile` (no shell), 20s timeout, 2MB cap.
- Analytics: none bundled. If added, keep it privacy-conscious (no address fingerprinting, no personal data).
