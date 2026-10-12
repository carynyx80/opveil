export interface CompareInput {
  chainA: string;
  addressA: string;
  chainB: string;
  addressB: string;
  codeHashA: string;
  codeHashB: string;
  normalizedA: string;
  normalizedB: string;
  selectorsA: string[];
  selectorsB: string[];
  proxyA: string;
  proxyB: string;
  findingIdsA: string[];
  findingIdsB: string[];
}

export interface CompareResult {
  exactBytecodeMatch: boolean;
  normalizedMatch: boolean;
  similarityPct: number;
  selectorsOnlyInA: string[];
  selectorsOnlyInB: string[];
  selectorsCommon: string[];
  proxyMatch: boolean;
  findingsOnlyInA: string[];
  findingsOnlyInB: string[];
  findingsCommon: string[];
  caveats: string[];
}

function setOps<T>(a: T[], b: T[]) {
  const sa = new Set(a);
  const sb = new Set(b);
  return {
    onlyA: a.filter((x) => !sb.has(x)),
    onlyB: b.filter((x) => !sa.has(x)),
    common: a.filter((x) => sb.has(x)),
  };
}

/** Jaccard-ish similarity over opcode streams (normalized, no operands). */
export function opcodeSimilarity(normA: string, normB: string): number {
  if (normA === normB) return 100;
  if (!normA || !normB) return 0;
  // Compare 4-opcode shingles for optimizer tolerance.
  const shingles = (s: string) => {
    const ops: string[] = [];
    for (let i = 0; i < s.length; i += 2) ops.push(s.slice(i, i + 2));
    const set = new Set<string>();
    for (let i = 0; i + 4 <= ops.length; i++) set.add(ops.slice(i, i + 4).join(""));
    return set;
  };
  const A = shingles(normA);
  const B = shingles(normB);
  if (A.size === 0 || B.size === 0) {
    // Fallback for tiny contracts: Jaccard over single opcodes.
    const single = (s: string) => {
      const set = new Set<string>();
      for (let i = 0; i < s.length; i += 2) set.add(s.slice(i, i + 2));
      return set;
    };
    const SA = single(normA);
    const SB = single(normB);
    if (SA.size === 0 || SB.size === 0) return 0;
    let inter = 0;
    for (const x of SA) if (SB.has(x)) inter++;
    return Math.round((1000 * inter) / (SA.size + SB.size - inter)) / 10;
  }
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return Math.round((1000 * inter) / union) / 10;
}

export function compareContracts(input: CompareInput): CompareResult {
  const exactBytecodeMatch = input.codeHashA.toLowerCase() === input.codeHashB.toLowerCase();
  const normalizedMatch = input.normalizedA === input.normalizedB && input.normalizedA.length > 0;
  const similarityPct = exactBytecodeMatch ? 100 : opcodeSimilarity(input.normalizedA, input.normalizedB);
  const sel = setOps(input.selectorsA.map((s) => s.toLowerCase()), input.selectorsB.map((s) => s.toLowerCase()));
  const fnd = setOps(input.findingIdsA, input.findingIdsB);
  return {
    exactBytecodeMatch,
    normalizedMatch,
    similarityPct,
    selectorsOnlyInA: sel.onlyA,
    selectorsOnlyInB: sel.onlyB,
    selectorsCommon: sel.common,
    proxyMatch: input.proxyA === input.proxyB,
    findingsOnlyInA: fnd.onlyA,
    findingsOnlyInB: fnd.onlyB,
    findingsCommon: fnd.common,
    caveats: [
      "Matching bytecode does not prove identical behavior: proxy implementations, storage, constructor args, and chain context (chainid, precompiles) can differ.",
      "Selector overlap is heuristic where dispatchers are non-standard.",
      "Re-run both sides at the same block height for apples-to-apples comparison.",
    ],
  };
}
