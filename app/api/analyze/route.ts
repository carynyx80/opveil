import type { Hex } from "viem";
import { analyzeContract, RpcError } from "@/lib/analysis";
import { analyzeRequestSchema } from "@/lib/validate";
import { fail, ok, rid } from "@/lib/envelope";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const t0 = Date.now();
  const requestId = rid();
  const rl = rateLimit(req, { prefix: "analyze", max: Number(process.env.RATE_LIMIT_PER_MIN ?? 20) });
  if (!rl.allowed) return fail("RATE_LIMITED", "Too many analysis requests. Please wait and retry.", 429, undefined, { tookMs: Date.now() - t0, requestId });

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > 8 * 1024) return fail("PAYLOAD_TOO_LARGE", "Request body too large.", 413, undefined, { tookMs: Date.now() - t0, requestId });
    body = text ? JSON.parse(text) : {};
  } catch {
    return fail("BAD_REQUEST", "Invalid JSON body.", 400, undefined, { tookMs: Date.now() - t0, requestId });
  }

  const parsed = analyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    const code = /address/i.test(msg) ? "INVALID_ADDRESS" : /network|chain/i.test(msg) ? "UNSUPPORTED_CHAIN" : "BAD_REQUEST";
    return fail(code, msg, 400, parsed.error.issues, { tookMs: Date.now() - t0, requestId });
  }

  try {
    const result = await analyzeContract(parsed.data.chain, parsed.data.address as Hex, { refresh: parsed.data.refresh });
    // Bound the disassembly array sent over the wire for very large contracts.
    const MAX_OPS = 8000;
    const bounded = result.disassembly.length > MAX_OPS
      ? result.disassembly.slice(0, MAX_OPS)
      : result.disassembly;
    return ok(
      { ...result, disassembly: bounded, disassemblyTruncated: result.disassembly.length > MAX_OPS },
      { cached: result.cached, tookMs: Date.now() - t0, requestId },
    );
  } catch (e) {
    if (e instanceof RpcError) {
      if (e.code === "NO_CONTRACT_CODE") return fail("NO_CONTRACT_CODE", e.message, 404, undefined, { tookMs: Date.now() - t0, requestId });
      if (e.code === "RPC_TIMEOUT") return fail("RPC_TIMEOUT", e.message, 504, undefined, { tookMs: Date.now() - t0, requestId });
      return fail("RPC_ERROR", e.message, 502, undefined, { tookMs: Date.now() - t0, requestId });
    }
    console.error(`[analyze:${requestId}]`, e instanceof Error ? e.message : e);
    return fail("ANALYSIS_FAILED", "Analysis failed due to an internal error.", 500, undefined, { tookMs: Date.now() - t0, requestId });
  }
}
