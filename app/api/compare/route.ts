import type { Hex } from "viem";
import { analyzeContract, RpcError } from "@/lib/analysis";
import { compareRequestSchema } from "@/lib/validate";
import { compareContracts } from "@/lib/evm/compare";
import { fail, ok, rid } from "@/lib/envelope";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const t0 = Date.now();
  const requestId = rid();
  const rl = rateLimit(req, { prefix: "compare", max: 20 });
  if (!rl.allowed) return fail("RATE_LIMITED", "Too many requests.", 429, undefined, { tookMs: Date.now() - t0, requestId });

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > 8 * 1024) return fail("PAYLOAD_TOO_LARGE", "Request body too large.", 413, undefined, { tookMs: Date.now() - t0, requestId });
    body = text ? JSON.parse(text) : {};
  } catch {
    return fail("BAD_REQUEST", "Invalid JSON body.", 400, undefined, { tookMs: Date.now() - t0, requestId });
  }
  const parsed = compareRequestSchema.safeParse(body);
  if (!parsed.success) return fail("BAD_REQUEST", parsed.error.issues.map((i) => i.message).join("; "), 400, undefined, { tookMs: Date.now() - t0, requestId });

  try {
    const [ra, rb] = await Promise.all([
      analyzeContract(parsed.data.a.chain, parsed.data.a.address as Hex),
      analyzeContract(parsed.data.b.chain, parsed.data.b.address as Hex),
    ]);
    const cmp = compareContracts({
      chainA: ra.chain,
      addressA: ra.address,
      chainB: rb.chain,
      addressB: rb.address,
      codeHashA: ra.codeHash,
      codeHashB: rb.codeHash,
      normalizedA: ra.normalizedBytecode,
      normalizedB: rb.normalizedBytecode,
      selectorsA: ra.selectors.selectors.map((s) => s.selector),
      selectorsB: rb.selectors.selectors.map((s) => s.selector),
      proxyA: ra.proxy.resolution.pattern,
      proxyB: rb.proxy.resolution.pattern,
      findingIdsA: ra.findings.map((f) => f.id),
      findingIdsB: rb.findings.map((f) => f.id),
    });
    return ok(
      {
        ...cmp,
        meta: {
          a: { chain: ra.chain, address: ra.address, blockNumber: ra.blockNumber },
          b: { chain: rb.chain, address: rb.address, blockNumber: rb.blockNumber },
          codeHashA: ra.codeHash,
          codeHashB: rb.codeHash,
          proxyA: ra.proxy.resolution.pattern,
          proxyB: rb.proxy.resolution.pattern,
        },
      },
      { tookMs: Date.now() - t0, requestId },
    );
  } catch (e) {
    if (e instanceof RpcError) {
      if (e.code === "NO_CONTRACT_CODE") return fail("NO_CONTRACT_CODE", e.message, 404, undefined, { tookMs: Date.now() - t0, requestId });
      return fail("RPC_ERROR", e.message, 502, undefined, { tookMs: Date.now() - t0, requestId });
    }
    console.error(`[compare:${requestId}]`, e instanceof Error ? e.message : e);
    return fail("ANALYSIS_FAILED", "Comparison failed.", 500, undefined, { tookMs: Date.now() - t0, requestId });
  }
}
