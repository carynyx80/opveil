import type { Hex } from "viem";
import { analyzeContract, RpcError } from "@/lib/analysis";
import { addressSchema, chainSchema } from "@/lib/validate";
import { fail, ok, rid } from "@/lib/envelope";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request, { params }: { params: { chain: string; address: string } }) {
  const t0 = Date.now();
  const requestId = rid();
  const rl = rateLimit(req, { prefix: "bytecode" });
  if (!rl.allowed) return fail("RATE_LIMITED", "Too many requests.", 429, undefined, { tookMs: Date.now() - t0, requestId });
  const c = chainSchema.safeParse(params.chain);
  const a = addressSchema.safeParse(params.address);
  if (!c.success) return fail("UNSUPPORTED_CHAIN", "Unsupported network.", 400, undefined, { tookMs: Date.now() - t0, requestId });
  if (!a.success) return fail("INVALID_ADDRESS", "Invalid EVM address.", 400, undefined, { tookMs: Date.now() - t0, requestId });
  try {
    const r = await analyzeContract(c.data, a.data as Hex);
    const url = new URL(req.url);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 2000), 5000);
    const ops = r.disassembly.slice(Math.max(0, offset), Math.max(0, offset) + limit);
    return ok(
      { bytecode: r.bytecode, codeHash: r.codeHash, byteSize: r.byteSize, blockNumber: r.blockNumber, ops, totalOps: r.disassembly.length, offset, limit },
      { cached: r.cached, tookMs: Date.now() - t0, requestId },
    );
  } catch (e) {
    if (e instanceof RpcError) {
      if (e.code === "NO_CONTRACT_CODE") return fail("NO_CONTRACT_CODE", e.message, 404, undefined, { tookMs: Date.now() - t0, requestId });
      return fail("RPC_ERROR", e.message, 502, undefined, { tookMs: Date.now() - t0, requestId });
    }
    return fail("ANALYSIS_FAILED", "Bytecode fetch failed.", 500, undefined, { tookMs: Date.now() - t0, requestId });
  }
}
