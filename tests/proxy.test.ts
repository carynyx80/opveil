import { describe, expect, it } from "vitest";
import { addressFromSlotWord, classifyProxy, detectMinimalProxy, EIP1967_IMPL_SLOT } from "@/lib/evm/proxy";
import { MINIMAL_PROXY, SIMPLE_RUNTIME } from "./fixtures";

describe("proxy analysis", () => {
  it("detects EIP-1167 minimal proxy with embedded implementation", () => {
    const r = detectMinimalProxy(MINIMAL_PROXY);
    expect(r.isMinimal).toBe(true);
    expect(r.implementation?.toLowerCase()).toBe("0x1111111111111111111111111111111111111111");
  });

  it("classifies EIP-1967 transparent proxy from slot values", () => {
    const impl = "0x" + "00".repeat(12) + "2222222222222222222222222222222222222222";
    const admin = "0x" + "00".repeat(12) + "3333333333333333333333333333333333333333";
    const r = classifyProxy({
      bytecodeHex: SIMPLE_RUNTIME + "f4",
      implSlotValue: impl,
      adminSlotValue: admin,
      beaconSlotValue: null,
      hasDelegateCall: true,
    });
    expect(r.isProxy).toBe(true);
    expect(r.implementation?.toLowerCase()).toContain("2222");
    expect(r.admin?.toLowerCase()).toContain("3333");
    expect(["transparent", "eip1967"]).toContain(r.pattern);
    expect(r.provenance.join(" ")).toContain(EIP1967_IMPL_SLOT.slice(0, 12));
  });

  it("reports none-detected honestly for plain code", () => {
    const r = classifyProxy({
      bytecodeHex: SIMPLE_RUNTIME,
      implSlotValue: "0x" + "00".repeat(32),
      adminSlotValue: null,
      beaconSlotValue: null,
      hasDelegateCall: false,
    });
    expect(r.isProxy).toBe(false);
    expect(r.pattern).toBe("none-detected");
  });

  it("marks DELEGATECALL-without-slots as uncertain, not a proxy", () => {
    const r = classifyProxy({
      bytecodeHex: SIMPLE_RUNTIME + "f4",
      implSlotValue: null,
      adminSlotValue: null,
      beaconSlotValue: null,
      hasDelegateCall: true,
    });
    expect(r.isProxy).toBe(false);
    expect(r.pattern).toBe("uncertain");
    expect(r.confidence).toBe("low");
  });

  it("addressFromSlotWord rejects zero slots", () => {
    expect(addressFromSlotWord("0x" + "00".repeat(32))).toBeNull();
    expect(addressFromSlotWord("0x" + "00".repeat(12) + "a".repeat(40))).toBe("0x" + "a".repeat(40));
  });
});
