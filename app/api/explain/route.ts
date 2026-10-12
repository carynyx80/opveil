import type { Hex } from "viem";
import { analyzeContract, RpcError } from "@/lib/analysis";
import { explainRequestSchema } from "@/lib/validate";
import { explainWithLLM } from "@/lib/llm";
import { fail, ok, rid } from "@/lib/envelope";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const t0 = Date.now();
  const requestId = rid();
  const rl = rateLimit(req, { prefix: "explain", max: 15 });
  if (!rl.allowed) return fail("RATE_LIMITED", "Too many explanation requests.", 429, undefined, { tookMs: Date.now() - t0, requestId });

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > 12 * 1024) return fail("PAYLOAD_TOO_LARGE", "Request body too large.", 413, undefined, { tookMs: Date.now() - t0, requestId });
    body = text ? JSON.parse(text) : {};
  } catch {
    return fail("BAD_REQUEST", "Invalid JSON body.", 400, undefined, { tookMs: Date.now() - t0, requestId });
  }
  const parsed = explainRequestSchema.safeParse(body);
  if (!parsed.success) return fail("BAD_REQUEST", parsed.error.issues.map((i) => i.message).join("; "), 400, undefined, { tookMs: Date.now() - t0, requestId });

  try {
    const r = await analyzeContract(parsed.data.chain, parsed.data.address as Hex);
    const out = await explainWithLLM(
      {
        chain: r.chain,
        address: r.address,
        byteSize: r.byteSize,
        selectorCount: r.selectors.selectors.length,
        selectors: r.selectors.selectors.slice(0, 40).map((s) => ({ selector: s.selector, signature: s.signature, confidence: s.confidence })),
        findings: r.findings.map((f) => ({ id: f.id, title: f.title, severity: f.severity, confidence: f.confidence, evidence: f.evidence.slice(0, 3) })),
        proxy: { isProxy: r.proxy.resolution.isProxy, pattern: r.proxy.resolution.pattern, implementation: r.proxy.resolution.implementation },
        sourceVerified: r.sourceVerified,
        blockNumber: r.blockNumber,
      },
      parsed.data.question ?? undefined,
    );
    return ok(out, { tookMs: Date.now() - t0, requestId });
  } catch (e) {
    if (e instanceof RpcError) {
      if (e.code === "NO_CONTRACT_CODE") return fail("NO_CONTRACT_CODE", e.message, 404, undefined, { tookMs: Date.now() - t0, requestId });
      return fail("RPC_ERROR", e.message, 502, undefined, { tookMs: Date.now() - t0, requestId });
    }
    return fail("LLM_UNAVAILABLE", "Explanation service is temporarily unavailable.", 503, undefined, { tookMs: Date.now() - t0, requestId });
  }
}
