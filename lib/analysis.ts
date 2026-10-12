import type { Hex } from "viem";
import { getChains, type ChainKey } from "./chains";
import { fetchRuntimeCode, readStorageSlot, RpcError } from "./rpc";
import { disassemble, type DecodedOp } from "./evm/disassembler";
import { detectSelectors, normalizeBytecode } from "./evm/selectors";
import { classifyProxy, EIP1967_ADMIN_SLOT, EIP1967_BEACON_SLOT, EIP1967_IMPL_SLOT } from "./evm/proxy";
import { runSecurityChecks } from "./evm/security";
import { decompile } from "./evm/decompile";
import { analysisId, saveAnalysis, type FullAnalysis } from "./store";
import { cacheGet, cacheSet, analysisCacheKey } from "./cache";
import { ENGINE_VERSION } from "./envelope";

export interface AnalysisResult {
  id: string;
  chain: ChainKey;
  address: string;
  blockNumber: string;
  codeHash: string;
  byteSize: number;
  bytecode: string;
  normalizedBytecode: string;
  sourceVerified: boolean;
  explorerUrl: string;
  selectors: ReturnType<typeof detectSelectors>;
  proxy: Awaited<ReturnType<typeof resolveProxy>>;
  findings: ReturnType<typeof runSecurityChecks>;
  decompiled: Awaited<ReturnType<typeof decompile>>;
  summary: string;
  completeness: { score: number; notes: string[] };
  createdAt: string;
  cached: boolean;
  disassembly: DecodedOp[];
}

async function resolveProxy(chain: ChainKey, address: Hex, bytecodeHex: string, blockNumber: bigint, hasDelegateCall: boolean) {
  const [impl, admin, beacon] = await Promise.all([
    readStorageSlot(chain, address, EIP1967_IMPL_SLOT, blockNumber).catch(() => null),
    readStorageSlot(chain, address, EIP1967_ADMIN_SLOT, blockNumber).catch(() => null),
    readStorageSlot(chain, address, EIP1967_BEACON_SLOT, blockNumber).catch(() => null),
  ]);
  const zero = (v: string | null) => !v || /^0x0*$/.test(v.replace(/^0x/, ""));
  return {
    resolution: classifyProxy({
      bytecodeHex,
      implSlotValue: zero(impl) ? null : impl,
      adminSlotValue: zero(admin) ? null : admin,
      beaconSlotValue: zero(beacon) ? null : beacon,
      hasDelegateCall,
    }),
    raw: { impl, admin, beacon },
  };
}

async function checkVerifiedSource(chain: ChainKey, address: string): Promise<boolean> {
  try {
    const cfg = getChains()[chain];
    if (chain === "bsc") {
      const key = (process.env.BSCSCAN_API_KEY ?? "").trim();
      const url = `https://api.bscscan.com/api?module=contract&action=getsourcecode&address=${address}${key ? `&apikey=${encodeURIComponent(key)}` : ""}`;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      try {
        const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
        if (!r.ok) return false;
        const j = (await r.json()) as { result?: { SourceCode?: string }[] };
        const src = j.result?.[0]?.SourceCode ?? "";
        return src.trim().length > 10;
      } finally {
        clearTimeout(t);
      }
    }
    // Robinhood Chain = Blockscout instance
    const base = (cfg.explorerApiUrl ?? cfg.explorerUrl).replace(/\/$/, "");
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(`${base}/api/v2/smart-contracts/${address}`, { signal: ctrl.signal, headers: { Accept: "application/json" } });
      if (!r.ok) return false;
      const j = (await r.json()) as { is_verified?: boolean; verified?: boolean };
      return Boolean(j.is_verified ?? j.verified ?? false);
    } finally {
      clearTimeout(t);
    }
  } catch {
    return false;
  }
}

export function buildSummary(args: {
  chain: ChainKey;
  address: string;
  byteSize: number;
  selectorCount: number;
  isProxy: boolean;
  proxyPattern: string;
  findingCount: number;
  sourceVerified: boolean;
}): string {
  const net = getChains()[args.chain].label;
  return (
    `Contract ${args.address} on ${net} exposes ${args.selectorCount} detected selector(s) across ${args.byteSize} bytes of runtime. ` +
    (args.isProxy
      ? `Proxy evidence (${args.proxyPattern}) means logic likely lives in a separate implementation — review it separately. `
      : `No known proxy pattern detected; logic appears self-contained. `) +
    `${args.findingCount} evidence-backed finding(s) recorded. ` +
    (args.sourceVerified ? "Explorer shows verified source." : "Source is unverified: treat all conclusions as bytecode-derived, not definitive.")
  );
}

export async function analyzeContract(chain: ChainKey, address: Hex, opts?: { refresh?: boolean }): Promise<AnalysisResult> {
  const cfg = getChains()[chain];
  const code = await fetchRuntimeCode(chain, address);
  const key = analysisCacheKey({
    chain,
    address: address.toLowerCase(),
    block: code.blockNumber.toString(),
    codeHash: code.codeHash,
    engine: ENGINE_VERSION,
  });
  if (!opts?.refresh) {
    const hit = cacheGet<AnalysisResult>(key);
    if (hit) return { ...hit, cached: true };
  }

  const bytecode = code.bytecode as string;
  const d = disassemble(bytecode);
  const selectors = detectSelectors(bytecode, d);
  const hasDelegate = d.ops.some((o) => o.name === "DELEGATECALL");
  const proxy = await resolveProxy(chain, address, bytecode, code.blockNumber, hasDelegate);

  let implExtra: { codeHash: string | null } = { codeHash: null };
  if (proxy.resolution.implementation) {
    try {
      const implCode = await fetchRuntimeCode(chain, proxy.resolution.implementation as Hex);
      implExtra = { codeHash: implCode.codeHash };
      (proxy.resolution as { codeHashImplementation: string | null }).codeHashImplementation = implCode.codeHash;
      proxy.resolution.provenance.push(
        `Implementation ${proxy.resolution.implementation} fetched at block ${implCode.blockNumber} (${implCode.byteSize} bytes, hash ${implCode.codeHash.slice(0, 18)}…).`,
      );
    } catch (e) {
      proxy.resolution.provenance.push(
        `Implementation fetch failed (${e instanceof Error ? e.message : String(e)}); implementation not analyzed.`,
      );
    }
  }

  const sourceVerified = await checkVerifiedSource(chain, address);
  const findings = runSecurityChecks({
    disassembly: d,
    bytecodeHex: bytecode,
    selectors: selectors.selectors.map((s) => s.selector),
    proxyPattern: proxy.resolution.pattern,
    isProxy: proxy.resolution.isProxy,
    sourceVerified,
  });
  const decompiled = await decompile({ bytecodeHex: bytecode, disassembly: d, selectors: selectors.selectors });
  void implExtra;

  const summary = buildSummary({
    chain,
    address,
    byteSize: code.byteSize,
    selectorCount: selectors.selectors.length,
    isProxy: proxy.resolution.isProxy,
    proxyPattern: proxy.resolution.pattern,
    findingCount: findings.length,
    sourceVerified,
  });

  const notes: string[] = [];
  if (!sourceVerified) notes.push("Unverified source — logic inferred from bytecode only.");
  if (proxy.resolution.pattern === "uncertain") notes.push("Proxy structure uncertain — manual review advised.");
  if (selectors.dispatcherType === "none-detected") notes.push("No standard dispatcher — selector list may be incomplete.");
  if (selectors.dispatcherType === "unusual") notes.push("Unusual dispatcher layout — selector detection is best-effort.");
  const completeness = { score: Math.max(45, 100 - notes.length * 12), notes };

  const createdAt = new Date().toISOString();
  const id = analysisId(chain, address, code.codeHash);

  const result: AnalysisResult = {
    id,
    chain,
    address,
    blockNumber: code.blockNumber.toString(),
    codeHash: code.codeHash,
    byteSize: code.byteSize,
    bytecode,
    normalizedBytecode: normalizeBytecode(bytecode),
    sourceVerified,
    explorerUrl: `${cfg.explorerUrl.replace(/\/$/, "")}/address/${address}`,
    selectors,
    proxy,
    findings,
    decompiled,
    summary,
    completeness,
    createdAt,
    cached: false,
    disassembly: d.ops.slice(0, 20000),
  };

  cacheSet(key, result);
  const full: FullAnalysis = {
    id,
    chain,
    address,
    blockNumber: result.blockNumber,
    codeHash: result.codeHash,
    byteSize: result.byteSize,
    selectorCount: selectors.selectors.length,
    findingCount: findings.length,
    isProxy: proxy.resolution.isProxy,
    proxyPattern: proxy.resolution.pattern,
    createdAt,
    bytecode,
    selectorsJson: JSON.stringify(selectors),
    findingsJson: JSON.stringify(findings),
    proxyJson: JSON.stringify(proxy),
    decompiled: decompiled.output,
    sourceVerified,
  };
  await saveAnalysis(full).catch(() => undefined);
  return result;
}

export { RpcError };
