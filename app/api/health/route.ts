import { checkRpcHealth } from "@/lib/rpc";
import { ok } from "@/lib/envelope";
import { ENGINE_VERSION } from "@/lib/envelope";

export async function GET() {
  const t0 = Date.now();
  const [rhc, bsc] = await Promise.all([checkRpcHealth("robinhood"), checkRpcHealth("bsc")]);
  return ok(
    {
      status: rhc.ok || bsc.ok ? "ok" : "degraded",
      engine: ENGINE_VERSION,
      networks: {
        robinhood: { chainId: 4663, ...rhc },
        bsc: { chainId: 56, ...bsc },
      },
      llm: { configured: Boolean((process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY ?? "").trim()) },
      time: new Date().toISOString(),
    },
    { tookMs: Date.now() - t0 },
  );
}
