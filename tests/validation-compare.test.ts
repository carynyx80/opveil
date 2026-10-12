import { describe, expect, it } from "vitest";
import { compareContracts, opcodeSimilarity } from "@/lib/evm/compare";
import { normalizeBytecode } from "@/lib/evm/selectors";
import { normalizeAddress, analyzeRequestSchema } from "@/lib/validate";

describe("validation", () => {
  it("accepts and checksums valid addresses", () => {
    expect(normalizeAddress("0x0000000000000000000000000000000000000001")).toBe("0x0000000000000000000000000000000000000001");
    expect(normalizeAddress("not-an-address")).toBeNull();
  });

  it("rejects bad analyze payloads with typed errors", () => {
    const bad = analyzeRequestSchema.safeParse({ chain: "ethereum", address: "0x123" });
    expect(bad.success).toBe(false);
    const good = analyzeRequestSchema.safeParse({ chain: "bsc", address: "0x0000000000000000000000000000000000000001" });
    expect(good.success).toBe(true);
    if (good.success) expect(good.data.chain).toBe("bsc");
  });

  it("accepts chain aliases (4663/56)", () => {
    expect(analyzeRequestSchema.safeParse({ chain: "4663", address: "0x0000000000000000000000000000000000000001" }).success).toBe(true);
    expect(analyzeRequestSchema.safeParse({ chain: "56", address: "0x0000000000000000000000000000000000000001" }).success).toBe(true);
  });
});

describe("comparison", () => {
  it("detects exact matches", () => {
    const r = compareContracts({
      chainA: "bsc", addressA: "0x0", chainB: "bsc", addressB: "0x1",
      codeHashA: "0xabc", codeHashB: "0xABC",
      normalizedA: "6080", normalizedB: "6080",
      selectorsA: ["0xa9059cbb"], selectorsB: ["0xa9059cbb"],
      proxyA: "none-detected", proxyB: "none-detected",
      findingIdsA: ["x"], findingIdsB: ["x"],
    });
    expect(r.exactBytecodeMatch).toBe(true);
    expect(r.similarityPct).toBe(100);
    expect(r.selectorsCommon).toEqual(["0xa9059cbb"]);
  });

  it("scores heuristic similarity without claiming identity", () => {
    const a = normalizeBytecode("0x608060405234801561001057600080fd5b50");
    const b = normalizeBytecode("0x608060405234801561002057600080fd5b50f4");
    const s = opcodeSimilarity(a, b);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(100);
    expect(compareContracts({
      chainA: "a", addressA: "0x0", chainB: "b", addressB: "0x1",
      codeHashA: "0x1", codeHashB: "0x2", normalizedA: a, normalizedB: b,
      selectorsA: [], selectorsB: [], proxyA: "none-detected", proxyB: "eip1967",
      findingIdsA: [], findingIdsB: [],
    }).caveats.join(" ")).toMatch(/does not prove identical/);
  });
});
