import { describe, expect, it } from "vitest";
import { disassemble, detectMetadata } from "@/lib/evm/disassembler";
import { SIMPLE_RUNTIME } from "./fixtures";

describe("disassembler", () => {
  it("decodes PUSH opcodes with operands and offsets", () => {
    const d = disassemble(SIMPLE_RUNTIME);
    expect(d.byteSize).toBe(6);
    expect(d.ops.map((o) => o.name)).toEqual(["PUSH1", "PUSH1", "MSTORE", "STOP"]);
    expect(d.ops[0]).toMatchObject({ offset: 0, operand: "80" });
    expect(d.ops[1]).toMatchObject({ offset: 2, operand: "40" });
    expect(d.ops[3].isTerminating).toBe(true);
  });

  it("decodes PUSH0 (0x5f) with zero width", () => {
    const d = disassemble("0x5f600035");
    expect(d.ops[0]).toMatchObject({ name: "PUSH0", operand: null, offset: 0 });
    expect(d.ops[1]).toMatchObject({ name: "PUSH1", offset: 1 });
  });

  it("rejects malformed hex", () => {
    expect(() => disassemble("0xzz")).toThrow();
    expect(() => disassemble("0x123")).toThrow();
  });

  it("detects Solidity CBOR metadata trailer and excludes it", () => {
    // Build: 4 bytes code + fake solc metadata (a264 ipfs 5812 + 32 bytes + solc) + length prefix
    const code = Buffer.from([0x60, 0x80, 0x60, 0x40]);
    const blob = Buffer.concat([
      Buffer.from([0xa2, 0x64, 0x69, 0x70, 0x66, 0x73, 0x58, 0x22]),
      Buffer.alloc(32, 0x11),
      Buffer.from("solc"),
    ]);
    const len = Buffer.alloc(2);
    len.writeUInt16BE(blob.length, 0);
    const full = Buffer.concat([code, blob, len]);
    const bytes = new Uint8Array(full);
    const meta = detectMetadata(bytes);
    expect(meta).not.toBeNull();
    expect(meta!.offset).toBe(4);
    const d = disassemble("0x" + Buffer.from(bytes).toString("hex"));
    expect(d.metadata).not.toBeNull();
    expect(d.ops.every((o) => o.offset < 4)).toBe(true);
  });

  it("marks JUMPDEST and branches", () => {
    const d = disassemble("0x5b56575b00");
    expect(d.ops[0].isJumpDest).toBe(true);
    expect(d.jumpDests).toEqual([0, 3]);
    expect(d.ops[1].isBranch).toBe(true);
  });
});
