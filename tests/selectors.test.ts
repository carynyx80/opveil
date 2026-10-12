import { describe, expect, it } from "vitest";
import { detectSelectors, normalizeBytecode } from "@/lib/evm/selectors";
import { ERC20_DISPATCHER, SIMPLE_RUNTIME } from "./fixtures";

describe("selector detection", () => {
  it("finds transfer + owner selectors with curated signatures", () => {
    const r = detectSelectors(ERC20_DISPATCHER);
    const sels = r.selectors.map((s) => s.selector);
    expect(sels).toContain("0xa9059cbb");
    expect(sels).toContain("0x8da5cb5b");
    const t = r.selectors.find((s) => s.selector === "0xa9059cbb")!;
    expect(t.signature).toBe("transfer(address,uint256)");
    expect(t.confidence).toBe("high");
    expect(t.evidence.length).toBeGreaterThan(0);
    expect(r.dispatcherType).toBe("standard");
  });

  it("returns empty set honestly for selector-less code", () => {
    const r = detectSelectors(SIMPLE_RUNTIME);
    expect(r.selectors).toEqual([]);
    expect(r.dispatcherType).toBe("none-detected");
    expect(r.limitations.length).toBeGreaterThan(0);
  });

  it("ignores zero/dead PUSH4 values", () => {
    const r = detectSelectors("0x63000000001461010057");
    expect(r.selectors).toEqual([]);
  });

  it("normalizeBytecode strips operands for similarity", () => {
    const a = normalizeBytecode("0x6001600201");
    const b = normalizeBytecode("0x60ff60fe01");
    expect(a).toBe(b);
    expect(a).toContain("60");
  });
});
