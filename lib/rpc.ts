import { createPublicClient, http, type PublicClient, keccak256, type Hex } from "viem";
import { getChains, type ChainKey } from "./chains";

const clients = new Map<ChainKey, PublicClient>();

export function rpcTimeoutMs(): number {
  const v = Number(process.env.RPC_TIMEOUT_MS ?? 15000);
  return Number.isFinite(v) && v > 0 ? Math.min(v, 60000) : 15000;
}

export function getClient(chain: ChainKey): PublicClient {
  const existing = clients.get(chain);
  if (existing) return existing;
  const cfg = getChains()[chain];
  const client = createPublicClient({
    batch: { multicall: false },
    transport: http(cfg.rpcUrl, { timeout: rpcTimeoutMs(), retryCount: 1, retryDelay: 800 }),
  });
  clients.set(chain, client);
  return client;
}

export interface ChainCodeResult {
  bytecode: Hex;
  blockNumber: bigint;
  codeHash: string;
  byteSize: number;
}

export class RpcError extends Error {
  code: "RPC_ERROR" | "RPC_TIMEOUT" | "NO_CONTRACT_CODE";
  constructor(code: RpcError["code"], message: string, opts?: { cause?: unknown }) {
    super(message);
    this.code = code;
    if (opts?.cause) (this as { cause?: unknown }).cause = opts.cause;
  }
}

export async function fetchRuntimeCode(chain: ChainKey, address: Hex): Promise<ChainCodeResult> {
  const client = getClient(chain);
  const started = Date.now();
  try {
    const [code, blockNumber] = await Promise.all([
      withTimeout(client.getBytecode({ address }), rpcTimeoutMs(), "eth_getCode timed out"),
      withTimeout(client.getBlockNumber(), rpcTimeoutMs(), "eth_blockNumber timed out"),
    ]);
    if (!code || code === "0x" || code.length <= 2) {
      throw new RpcError("NO_CONTRACT_CODE", "No runtime code at this address (EOA or undeployed).");
    }
    const byteSize = (code.length - 2) / 2;
    if (byteSize > 512 * 1024) {
      throw new RpcError("RPC_ERROR", "Runtime code exceeds sane size bound (512 KiB). Aborting.");
    }
    return {
      bytecode: code,
      blockNumber,
      codeHash: keccak256(code),
      byteSize,
    };
  } catch (e) {
    if (e instanceof RpcError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    void started;
    if (/timed out|timeout|ETIMEDOUT/i.test(msg)) throw new RpcError("RPC_TIMEOUT", `RPC timeout: ${msg}`);
    throw new RpcError("RPC_ERROR", `RPC error: ${msg}`, { cause: e });
  }
}

export async function readStorageSlot(
  chain: ChainKey,
  address: Hex,
  slot: Hex,
  blockNumber?: bigint,
): Promise<Hex> {
  const client = getClient(chain);
  const v = await withTimeout(
    client.getStorageAt({ address, slot, blockNumber }),
    rpcTimeoutMs(),
    "eth_getStorageAt timed out",
  );
  return (v ?? "0x") as Hex;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error(label)), ms);
  });
  return Promise.race([p.finally(() => clearTimeout(t)), timeout]);
}

export async function checkRpcHealth(chain: ChainKey): Promise<{ ok: boolean; chainId?: number; latencyMs: number; error?: string }> {
  const t0 = Date.now();
  try {
    const client = getClient(chain);
    const id = await withTimeout(client.getChainId(), rpcTimeoutMs(), "health check timed out");
    return { ok: true, chainId: id, latencyMs: Date.now() - t0 };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t0, error: e instanceof Error ? e.message : String(e) };
  }
}
