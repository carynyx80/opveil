import { disassemble, type Disassembly } from "./disassembler";
import { lookupKnownSelector } from "./signatures";

export type SelectorConfidence = "high" | "medium" | "low" | "unknown";

export interface FunctionCandidate {
  selector: string; // 0x + 8 hex
  signature: string | null;
  confidence: SelectorConfidence;
  payableHint: "payable?" | "nonpayable?" | "unknown";
  evidence: string[];
  opcodeOffsets: number[];
  hasStorageAccess: boolean;
  hasExternalCall: boolean;
  signatureSource: "curated" | "database" | "none";
  ambiguityNote: string | null;
}

export interface DispatcherAnalysis {
  selectors: FunctionCandidate[];
  dispatcherType: "standard" | "compact" | "none-detected" | "unusual";
  fallbackPresent: boolean | null;
  receivePresent: boolean | null;
  limitations: string[];
}

/**
 * Dispatcher detection strategy (conservative, evidence-based):
 * 1. Scan for PUSH4 <selector> + EQ/DUP + PUSH2/PUSH3 <dest> + JUMPI patterns.
 * 2. Also accept PUSH4 followed within 12 ops by an EQ and a JUMPI (optimizer-tolerant).
 * 3. Cross-check CALLDATALOAD/SHR(0xe0)/CALLDATASIZE guards to classify dispatcherType.
 */
export function detectSelectors(bytecodeHex: string, dis?: Disassembly): DispatcherAnalysis {
  const d = dis ?? disassemble(bytecodeHex);
  const ops = d.ops;
  const candidates = new Map<string, { offsets: number[]; evidences: string[] }>();

  const usesCalldataLoad = ops.some((o) => o.name === "CALLDATALOAD");
  const usesCalldataSize = ops.some((o) => o.name === "CALLDATASIZE");
  const hasShrE0 = ops.some(
    (o, i) => o.name === "SHR" && i > 0 && ops[i - 1].name.startsWith("PUSH") && (ops[i - 1].operand ?? "").toLowerCase().endsWith("e0"),
  );

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (!op.name.startsWith("PUSH")) continue;
    const operand = (op.operand ?? "").toLowerCase();
    // PUSH4 selector = exactly 8 hex chars
    const isPush4 = op.name === "PUSH4" && operand.length === 8;
    if (!isPush4) continue;
    const selector = "0x" + operand;
    if (selector === "0x00000000" || selector === "0xffffffff") continue;

    // Look ahead up to 14 ops for EQ/SUB+ISZERO and JUMPI
    let sawEq = false;
    let sawJumpi = false;
    let jumpiOffset: number | null = null;
    for (let j = i + 1; j < Math.min(i + 15, ops.length); j++) {
      if (ops[j].name === "EQ") sawEq = true;
      if (ops[j].name === "SUB" || ops[j].name === "XOR") sawEq = sawEq || j + 1 < ops.length && ops[j + 1].name === "ISZERO";
      if (ops[j].name === "JUMPI") {
        sawJumpi = true;
        jumpiOffset = ops[j].offset;
        break;
      }
      // A new PUSH4/JUMPDEST chain boundary without JUMPI weakens the match
      if (j > i + 6 && ops[j].name === "JUMP") break;
    }
    if (!sawEq || !sawJumpi) continue;
    const entry = candidates.get(selector) ?? { offsets: [], evidences: [] };
    entry.offsets.push(op.offset);
    entry.evidences.push(
      `PUSH4 ${selector} at offset ${op.offset} compared (EQ) and branched (JUMPI${jumpiOffset !== null ? ` @${jumpiOffset}` : ""})`,
    );
    candidates.set(selector, entry);
  }

  const selectors: FunctionCandidate[] = [...candidates.entries()].map(([selector, info]) => {
    const known = lookupKnownSelector(selector);
    const windowOps = opsNearOffsets(d, info.offsets, 40);
    const hasStorageAccess = windowOps.some((o) => ["SLOAD", "SSTORE"].includes(o));
    const hasExternalCall = windowOps.some((o) => ["CALL", "STATICCALL", "DELEGATECALL"].includes(o));
    let signature: string | null = null;
    let confidence: SelectorConfidence = "unknown";
    let source: FunctionCandidate["signatureSource"] = "none";
    let ambiguity: string | null = null;
    if (known.length === 1) {
      signature = known[0];
      confidence = "high";
      source = "curated";
    } else if (known.length > 1) {
      signature = known[0];
      confidence = "medium";
      source = "curated";
      ambiguity = `Selector collides with ${known.length} known signatures; shown candidate may not match the deployed function.`;
    }
    return {
      selector,
      signature,
      confidence,
      payableHint: "unknown",
      evidence: info.evidences.slice(0, 4),
      opcodeOffsets: info.offsets.slice(0, 8),
      hasStorageAccess,
      hasExternalCall,
      signatureSource: source,
      ambiguityNote:
        ambiguity ??
        (signature === null
          ? "Signature not in curated set. External signature databases may list colliding candidates — treat any such match as low confidence."
          : null),
    };
  });

  selectors.sort((a, b) => a.selector.localeCompare(b.selector));

  const dispatcherType: DispatcherAnalysis["dispatcherType"] = selectors.length >= 2
    ? usesCalldataLoad || hasShrE0 ? "standard" : "compact"
    : selectors.length === 1
      ? "compact"
      : ops.length > 0 && (usesCalldataSize || usesCalldataLoad) ? "unusual" : "none-detected";

  return {
    selectors,
    dispatcherType,
    fallbackPresent: null,
    receivePresent: null,
    limitations: [
      "Selectors are inferred from dispatcher pattern matching, not from verified source.",
      "Proxy/fallback dispatchers may hide the implementation's real selector set.",
      "Optimizer output and hand-written assembly can produce false negatives.",
    ],
  };
}

function opsNearOffsets(d: Disassembly, offsets: number[], radius: number): string[] {
  const set = new Set(offsets);
  void set;
  // Cheap heuristic: scan whole table and attribute CALL/SLOAD proximity by offset distance.
  const names: string[] = [];
  for (const op of d.ops) {
    const near = offsets.some((o) => Math.abs(op.offset - o) <= radius * 12);
    if (near) names.push(op.name);
  }
  return names;
}

/** Normalize bytecode for similarity: strip PUSH operands + metadata trailer. */
export function normalizeBytecode(bytecodeHex: string): string {
  const d = disassemble(bytecodeHex);
  const reachableEnd = d.metadata ? d.metadata.offset : d.byteSize;
  void reachableEnd;
  return d.ops.map((o) => o.opcode.toString(16).padStart(2, "0")).join("");
}
