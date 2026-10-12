import { opcodeInfo } from "./opcodes";

export interface DecodedOp {
  offset: number;
  opcode: number;
  name: string;
  operand: string | null; // hex without 0x
  gas: string;
  kind: string;
  isJumpDest: boolean;
  isBranch: boolean;
  isTerminating: boolean;
}

export interface MetadataTrailer {
  offset: number;
  length: number;
  protocol: "cborsolidity" | "unknown";
  raw: string;
}

export interface Disassembly {
  ops: DecodedOp[];
  byteSize: number;
  metadata: MetadataTrailer | null;
  jumpDests: number[];
}

export function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (h.length === 0) return new Uint8Array(0);
  if (h.length % 2 !== 0) throw new Error("Odd-length hex");
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    const b = parseInt(h.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(b)) throw new Error(`Invalid hex at byte ${i}`);
    out[i] = b;
  }
  return out;
}

/** Detect trailing Solidity CBOR metadata (a26469706673...5820...). Returns trailer or null. */
export function detectMetadata(code: Uint8Array): MetadataTrailer | null {
  if (code.length < 10) return null;
  // Solidity metadata ends with 2-byte length prefix of the CBOR blob.
  const total = code.length;
  const metaLen = (code[total - 2] << 8) | code[total - 1];
  if (metaLen <= 2 || metaLen > 256 || metaLen >= total) return null;
  const start = total - 2 - metaLen;
  if (start < 0) return null;
  const blob = code.slice(start, total - 2);
  // Heuristic: starts with 0xa2 0x64 'ipfs' 0x58 0x22 (solc >=0.6) — accept also 0xa3/0xa4 maps.
  if (blob[0] !== 0xa2 && blob[0] !== 0xa3 && blob[0] !== 0xa4) return null;
  const ascii = Buffer.from(blob).toString("latin1");
  if (!ascii.includes("ipfs") && !ascii.includes("solc") && !ascii.includes("bzzr")) return null;
  const raw = "0x" + Buffer.from(code.slice(start)).toString("hex");
  return { offset: start, length: total - start, protocol: "cborsolidity", raw };
}

export function disassemble(bytecodeHex: string): Disassembly {
  const bytes = hexToBytes(bytecodeHex);
  const meta = detectMetadata(bytes);
  const end = meta ? meta.offset : bytes.length;
  const ops: DecodedOp[] = [];
  const jumpDests: number[] = [];
  let pc = 0;
  while (pc < end) {
    const byte = bytes[pc];
    const info = opcodeInfo(byte);
    let operand: string | null = null;
    let width = 0;
    if (byte === 0x5f) {
      width = 0;
    } else if (byte >= 0x60 && byte <= 0x7f) {
      width = byte - 0x5f;
      const slice = bytes.slice(pc + 1, pc + 1 + width);
      operand = Buffer.from(slice).toString("hex").padStart(width * 2, "0");
    }
    const isJumpDest = byte === 0x5b;
    if (isJumpDest) jumpDests.push(pc);
    ops.push({
      offset: pc,
      opcode: byte,
      name: info.name,
      operand,
      gas: info.gas,
      kind: info.kind,
      isJumpDest,
      isBranch: byte === 0x56 || byte === 0x57,
      isTerminating: Boolean(info.terminating),
    });
    pc += 1 + width;
    // Guard against truncated PUSH at end of code
    if (pc > end) break;
  }
  return { ops, byteSize: bytes.length, metadata: meta, jumpDests };
}

export function opcodeClass(name: string): string {
  if (name.startsWith("PUSH")) return "PUSH";
  if (name === "JUMPDEST") return "JUMPDEST";
  if (["CALL", "DELEGATECALL", "STATICCALL", "CALLCODE"].includes(name)) return "CALLLIKE";
  if (["STOP", "RETURN", "REVERT", "INVALID", "SELFDESTRUCT"].includes(name)) return "HALT";
  if (["SLOAD", "SSTORE", "TLOAD", "TSTORE"].includes(name)) return "STORAGE";
  return "OTHER";
}
