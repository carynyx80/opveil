import type { Disassembly } from "./disassembler";

export type Severity = "Informational" | "Low" | "Medium" | "High" | "Critical";
export type Confidence = "high" | "medium" | "low";

export interface SecurityFinding {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  confidence: Confidence;
  evidence: string[];
  opcodeRefs: number[];
  selectorRefs: string[];
  storageRefs: string[];
  impact: string;
  limitations: string;
}

interface Ctx {
  d: Disassembly;
  bytecodeHex: string;
  hasDelegateCall: boolean;
  hasSelfdestruct: boolean;
  hasCreate: boolean;
  sstoreCount: number;
  selectors: string[];
  isProxy: boolean;
  proxyPattern: string;
  sourceVerified: boolean;
}

export function runSecurityChecks(args: {
  disassembly: Disassembly;
  bytecodeHex: string;
  selectors: string[];
  proxyPattern: string;
  isProxy: boolean;
  sourceVerified: boolean;
}): SecurityFinding[] {
  const d = args.disassembly;
  const names = d.ops.map((o) => o.name);
  const count = (n: string) => names.filter((x) => x === n).length;
  const offsetsOf = (n: string) => d.ops.filter((o) => o.name === n).map((o) => o.offset).slice(0, 12);

  const ctx: Ctx = {
    d,
    bytecodeHex: args.bytecodeHex,
    hasDelegateCall: count("DELEGATECALL") > 0,
    hasSelfdestruct: count("SELFDESTRUCT") > 0,
    hasCreate: count("CREATE") > 0 || count("CREATE2") > 0,
    sstoreCount: count("SSTORE"),
    selectors: args.selectors,
    isProxy: args.isProxy,
    proxyPattern: args.proxyPattern,
    sourceVerified: args.sourceVerified,
  };

  const findings: SecurityFinding[] = [];

  if (ctx.hasDelegateCall) {
    findings.push({
      id: "delegatecall-proxy",
      title: "DELEGATECALL present — proxy or library forwarding",
      description:
        "The runtime executes DELEGATECALL, which runs external code in this contract's storage context. This is expected in proxies but means the visible bytecode may not contain the logic that actually controls funds or state.",
      severity: ctx.isProxy ? "Medium" : "High",
      confidence: "high",
      evidence: [`${count("DELEGATECALL")} DELEGATECALL opcode(s) at offsets ${offsetsOf("DELEGATECALL").join(", ") || "—"}`],
      opcodeRefs: offsetsOf("DELEGATECALL"),
      selectorRefs: [],
      storageRefs: [],
      impact: "A malicious or buggy implementation/blind target can take over storage and balances.",
      limitations: "This check proves DELEGATECALL exists; it does not prove exploitability. Targets may be fixed libraries.",
    });
  }

  if (ctx.isProxy) {
    findings.push({
      id: "upgrade-authority",
      title: `Upgradeable proxy pattern (${ctx.proxyPattern})`,
      description:
        "Storage-slot or template evidence indicates this contract forwards to a separately stored implementation. Whoever controls the upgrade/admin path can replace the logic.",
      severity: "High",
      confidence: "medium",
      evidence: [`Proxy pattern classified as ${ctx.proxyPattern} from slot/template evidence.`],
      opcodeRefs: [],
      selectorRefs: [],
      storageRefs: ["EIP-1967 implementation/admin/beacon slots (see Proxy tab)"],
      impact: "Upgrade key compromise or rug-pull upgrade can change behavior, including fund handling.",
      limitations: "Admin identity and timelock status are not proven by bytecode alone.",
    });
  }

  if (ctx.hasSelfdestruct) {
    findings.push({
      id: "selfdestruct-present",
      title: "SELFDESTRUCT opcode present",
      description:
        "SELFDESTRUCT appears in the runtime. Note: post-Cancun semantics on most EVM chains only move ETH when called in the same transaction as creation; otherwise it is largely neutered — but its presence still signals privileged teardown logic in older code.",
      severity: "Medium",
      confidence: "high",
      evidence: [`SELFDESTRUCT at offsets ${offsetsOf("SELFDESTRUCT").join(", ")}`],
      opcodeRefs: offsetsOf("SELFDESTRUCT"),
      selectorRefs: [],
      storageRefs: [],
      impact: "If reachable without strong access control, it could historically destroy the contract.",
      limitations: "Reachability and chain-specific semantics require per-chain review; presence alone is not a vulnerability.",
    });
  }

  const callCount = count("CALL") + count("CALLCODE");
  if (callCount > 0) {
    const valueUses = d.ops.some((o) => o.name === "CALLVALUE");
    findings.push({
      id: "external-calls",
      title: "Low-level external calls (CALL/CALLCODE)",
      description: `The contract performs ${callCount} low-level CALL-type operation(s)${valueUses ? " and reads CALLVALUE" : ""}. Unchecked return data or reentrant callbacks are a common fund-loss pattern.`,
      severity: callCount >= 3 ? "Medium" : "Low",
      confidence: "medium",
      evidence: [`CALL offsets: ${offsetsOf("CALL").join(", ") || "none"}; CALLCODE offsets: ${offsetsOf("CALLCODE").join(", ") || "none"}`],
      opcodeRefs: [...offsetsOf("CALL"), ...offsetsOf("CALLCODE")],
      selectorRefs: [],
      storageRefs: [],
      impact: "Reentrancy or failed-call handling bugs can drain funds.",
      limitations: "Static presence does not show whether reentrancy guards or return-value checks exist.",
    });
  }

  if (count("STATICCALL") > 0) {
    findings.push({
      id: "staticcalls",
      title: "STATICCALL usage (read-only external calls)",
      description: "STATICCALL is used for read-only external queries. Lower risk than CALL, but return-data validation still matters.",
      severity: "Informational",
      confidence: "high",
      evidence: [`${count("STATICCALL")} STATICCALL(s) at ${offsetsOf("STATICCALL").join(", ")}`],
      opcodeRefs: offsetsOf("STATICCALL"),
      selectorRefs: [],
      storageRefs: [],
      impact: "Minimal direct fund risk.",
      limitations: "Does not assess callee trustworthiness.",
    });
  }

  if (ctx.sstoreCount > 0) {
    findings.push({
      id: "storage-writes",
      title: "Direct storage writes (SSTORE)",
      description: `The runtime contains ${ctx.sstoreCount} SSTORE operation(s), meaning some reachable path can mutate persistent state (balances, owners, pauses).`,
      severity: "Informational",
      confidence: "high",
      evidence: [`SSTORE at offsets ${offsetsOf("SSTORE").slice(0, 8).join(", ")}`],
      opcodeRefs: offsetsOf("SSTORE"),
      selectorRefs: [],
      storageRefs: [],
      impact: "State-changing functions need access-control review.",
      limitations: "Slot semantics (what is stored where) cannot be proven without source or storage layout.",
    });
  } else {
    findings.push({
      id: "no-storage-writes",
      title: "No SSTORE detected in runtime",
      description: "No direct storage writes were found in the analyzed runtime. Logic may live in a proxy implementation.",
      severity: "Informational",
      confidence: "medium",
      evidence: ["Zero SSTORE opcodes in disassembly."],
      opcodeRefs: [],
      selectorRefs: [],
      storageRefs: [],
      impact: "Likely view-only or forwarding contract — if not a proxy, state cannot change.",
      limitations: ctx.isProxy ? "Proxy implementations are analyzed separately." : "Delegate targets could still write via DELEGATECALL.",
    });
  }

  if (hasOwnerSelectors(ctx.selectors)) {
    findings.push({
      id: "ownership",
      title: "Ownership / admin surface detected",
      description: "Known owner()/transferOwnership()/renounceOwnership() selectors (or admin slots) suggest a privileged role exists.",
      severity: "Medium",
      confidence: "medium",
      evidence: [`Matched privileged selectors: ${ctx.selectors.filter((s) => PRIVILEGED.has(s.toLowerCase())).join(", ")}`],
      opcodeRefs: [],
      selectorRefs: ctx.selectors.filter((s) => PRIVILEGED.has(s.toLowerCase())),
      storageRefs: [],
      impact: "Owner can often mint, pause, blacklist, or upgrade depending on the implementation.",
      limitations: "Selector presence does not prove the privilege is reachable or dangerous.",
    });
  }

  if (hasPauseSelectors(ctx.selectors)) {
    findings.push({
      id: "pausable",
      title: "Pausable pattern (pause/unpause selectors)",
      description: "pause()-style selectors suggest transfers can be frozen by a privileged account.",
      severity: "Low",
      confidence: "medium",
      evidence: ["pause() selector 0x8456cb59 present in dispatcher."],
      opcodeRefs: [],
      selectorRefs: ["0x8456cb59"],
      storageRefs: [],
      impact: "Users may be unable to move funds while paused.",
      limitations: "Pause reachability and role gating are unverified.",
    });
  }

  const txSelectors = ["a9059cbb", "23b872dd"].filter((s) => ctx.selectors.map((x) => x.toLowerCase().replace("0x", "")).includes(s));
  if (txSelectors.length > 0 && ctx.selectors.length <= 3) {
    findings.push({
      id: "transfer-restrictions",
      title: "Possible transfer restrictions — limited dispatcher",
      description: "A token-like dispatcher with very few selectors plus missing allowance/approve paths can indicate fee-on-transfer, blocklist, or honeypot-style constraints. This is a heuristic, not proof.",
      severity: "Low",
      confidence: "low",
      evidence: [`Only ${ctx.selectors.length} selector(s) detected: ${ctx.selectors.join(", ")}`],
      opcodeRefs: [],
      selectorRefs: txSelectors.map((s) => "0x" + s),
      storageRefs: [],
      impact: "Transfers may fail or be taxed under conditions invisible in bytecode alone.",
      limitations: "Requires dynamic simulation (e.g., eth_call traces) to confirm. Do not treat as a verdict.",
    });
  }

  if (!ctx.sourceVerified) {
    findings.push({
      id: "unverified-source",
      title: "Source not verified on explorer",
      description: "No verified source was found via the chain explorer API, so this assessment rests on bytecode evidence only.",
      severity: "Informational",
      confidence: "high",
      evidence: ["Explorer contract-source lookup returned no verified code (or API unavailable)."],
      opcodeRefs: [],
      selectorRefs: [],
      storageRefs: [],
      impact: "Reviewers cannot diff claimed source against deployed bytecode.",
      limitations: "Explorer API outages produce the same signal; re-check before concluding.",
    });
  }

  if (ctx.hasCreate) {
    findings.push({
      id: "contract-creation",
      title: "Contract creation opcodes (CREATE/CREATE2)",
      description: "The runtime can deploy new contracts. CREATE2 in particular enables counterfactual addresses.",
      severity: "Low",
      confidence: "high",
      evidence: [`CREATE offsets: ${offsetsOf("CREATE").join(", ") || "none"}; CREATE2 offsets: ${offsetsOf("CREATE2").join(", ") || "none"}`],
      opcodeRefs: [...offsetsOf("CREATE"), ...offsetsOf("CREATE2")],
      selectorRefs: [],
      storageRefs: [],
      impact: "Factory behavior is usually benign but expands the trust surface.",
      limitations: "Does not analyze child-contract bytecode.",
    });
  }

  if (d.metadata) {
    findings.push({
      id: "compiler-metadata",
      title: "Compiler metadata trailer detected",
      description: `A ${d.metadata.length}-byte Solidity metadata trailer at offset ${d.metadata.offset} was excluded from disassembly. This is normal for solc builds and can pin the compiler version.`,
      severity: "Informational",
      confidence: "high",
      evidence: [`Trailer offset ${d.metadata.offset}, length ${d.metadata.length}`],
      opcodeRefs: [],
      selectorRefs: [],
      storageRefs: [],
      impact: "None directly; aids provenance.",
      limitations: "Metadata presence does not prove the source matches.",
    });
  }

  return findings;
}

const PRIVILEGED = new Set(["6352211e", "8da5cb5b", "f2fde38b", "715018a6", "40c10f19", "d4b83992"]);

function hasOwnerSelectors(selectors: string[]): boolean {
  const norm = selectors.map((s) => s.toLowerCase().replace("0x", ""));
  return norm.some((s) => PRIVILEGED.has(s));
}

function hasPauseSelectors(selectors: string[]): boolean {
  const norm = selectors.map((s) => s.toLowerCase().replace("0x", ""));
  return norm.includes("8456cb59");
}

export function summarizeFindings(findings: SecurityFinding[]): { critical: number; high: number; medium: number; low: number; info: number } {
  const out = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) {
    if (f.severity === "Critical") out.critical++;
    else if (f.severity === "High") out.high++;
    else if (f.severity === "Medium") out.medium++;
    else if (f.severity === "Low") out.low++;
    else out.info++;
  }
  return out;
}
