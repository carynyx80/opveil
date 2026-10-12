import { listHistory } from "@/lib/store";
import { ok, rid } from "@/lib/envelope";
import { rateLimit } from "@/lib/rate-limit";
import { fail } from "@/lib/envelope";
import { parseChainKey } from "@/lib/chains";

export async function GET(req: Request) {
  const t0 = Date.now();
  const requestId = rid();
  const rl = rateLimit(req, { prefix: "history", max: 60 });
  if (!rl.allowed) return fail("RATE_LIMITED", "Too many requests.", 429, undefined, { tookMs: Date.now() - t0, requestId });
  const url = new URL(req.url);
  const chainRaw = url.searchParams.get("chain");
  const q = url.searchParams.get("q") ?? undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 25), 100);
  const chain = chainRaw ? parseChainKey(chainRaw) : null;
  if (chainRaw && !chain) return fail("UNSUPPORTED_CHAIN", "Unsupported network filter.", 400, undefined, { tookMs: Date.now() - t0, requestId });
  const items = await listHistory({ chain: chain ?? undefined, q, limit });
  return ok({ items, total: items.length }, { tookMs: Date.now() - t0, requestId });
}
