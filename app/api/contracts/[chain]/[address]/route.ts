import type { Hex } from "viem";
import { analyzeContract, RpcError } from "@/lib/analysis";
import { addressSchema, chainSchema } from "@/lib/validate";
import { fail, ok, rid } from "@/lib/envelope";
import { rateLimit } from "@/lib/rate-limit";

async function load(chainRaw: string, addressRaw: string, refresh: boolean, t0: number, requestId: string) {
  const c = chainSchema.safeParse(chainRaw);
  const a = addressSchema.safeParse(addressRaw);
  if (!c.success) return fail("UNSUPPORTED_CHAIN", "Unsupported network. Use robinhood or bsc.", 400, undefined, { tookMs: Date.now() - t0, requestId });
  if (!a.success) return fail("INVALID_ADDRESS", "Invalid EVM address.", 400, undefined, { tookMs: Date.now() - t0, requestId });
  try {
    const r = await analyzeContract(c.data, a.data as Hex, { refresh });
    return ok(r, { cached: r.cached, tookMs: Date.now() - t0, requestId });
  } catch (e) {
    if (e instanceof RpcError) {
      if (e.code === "NO_CONTRACT_CODE") return fail("NO_CONTRACT_CODE", e.message, 404, undefined, { tookMs: Date.now() - t0, requestId });
      if (e.code === "RPC_TIMEOUT") return fail("RPC_TIMEOUT", e.message, 504, undefined, { tookMs: Date.now() - t0, requestId });
      return fail("RPC_ERROR", e.message, 502, undefined, { tookMs: Date.now() - t0, requestId });
    }
    console.error(`[contract:${requestId}]`, e instanceof Error ? e.message : e);
    return fail("ANALYSIS_FAILED", "Analysis failed due to an internal error.", 500, undefined, { tookMs: Date.now() - t0, requestId });
  }
}

export async function GET(req: Request, { params }: { params: { chain: string; address: string } }) {
  const t0 = Date.now();
  const requestId = rid();
  const rl = rateLimit(req, { prefix: "contract" });
  if (!rl.allowed) return fail("RATE_LIMITED", "Too many requests. Please wait and retry.", 429, undefined, { tookMs: Date.now() - t0, requestId });
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  return load(params.chain, params.address, refresh, t0, requestId);
}
