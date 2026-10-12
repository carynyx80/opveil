import { describe, expect, it } from "vitest";
import { disassemble } from "@/lib/evm/disassembler";
import { runSecurityChecks } from "@/lib/evm/security";
import { RISKY_RUNTIME, SIMPLE_RUNTIME } from "./fixtures";

function check(hex: string, extra?: Partial<Parameters<typeof runSecurityChecks>[0]>) {
  return runSecurityChecks({
    disassembly: disassemble(hex),
    bytecodeHex: hex,
    selectors: [],
    proxyPattern: "none-detected",
    isProxy: false,
    sourceVerified: true,
    ...extra,
  });
}

describe("security checks", () => {
  it("flags DELEGATECALL + SELFDESTRUCT + SSTORE with evidence", () => {
    const f = check(RISKY_RUNTIME, { sourceVerified: false });
    const ids = f.map((x) => x.id);
    expect(ids).toContain("delegatecall-proxy");
    expect(ids).toContain("selfdestruct-present");
    expect(ids).toContain("storage-writes");
    expect(ids).toContain("unverified-source");
    const dc = f.find((x) => x.id === "delegatecall-proxy")!;
    expect(dc.evidence.join(" ")).toMatch(/DELEGATECALL/);
    expect(dc.opcodeRefs.length).toBeGreaterThan(0);
    for (const x of f) {
      expect(x.title).toBeTruthy();
      expect(x.limitations).toBeTruthy();
      expect(x.impact).toBeTruthy();
    }
  });

  it("never issues safe/unsafe verdicts", () => {
    const f = check(SIMPLE_RUNTIME);
    const blob = JSON.stringify(f).toLowerCase();
    expect(blob).not.toMatch(/contract is safe|contract is secure|100% safe|audited and safe/);
  });

  it("detects ownership surface from selectors", () => {
    const f = check(SIMPLE_RUNTIME, { selectors: ["0x8da5cb5b", "0xf2fde38b"] });
    expect(f.map((x) => x.id)).toContain("ownership");
  });

  it("always includes the not-audit disclaimer signal via unverified finding when appropriate", () => {
    const verified = check(SIMPLE_RUNTIME, { sourceVerified: true });
    expect(verified.map((x) => x.id)).not.toContain("unverified-source");
  });
});
