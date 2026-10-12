// Canonical EVM opcode table (Paris/Shanghai/Cancun-relevant subset + PUSH0).
// Gas notes are indicative ("reliable" ones only); dynamic costs marked as such.

export interface OpcodeInfo {
  name: string;
  gas: string;
  kind: "STOP" | "MATH" | "PUSH" | "DUP" | "SWAP" | "STACK" | "MEM" | "STORAGE" | "FLOW" | "CALL" | "LOG" | "SYS" | "INVALID";
  terminating?: boolean;
}

const OPCODES = new Map<number, OpcodeInfo>();

function reg(byte: number, name: string, gas: string, kind: OpcodeInfo["kind"], terminating?: boolean) {
  OPCODES.set(byte, { name, gas, kind, terminating });
}

reg(0x00, "STOP", "0", "SYS", true);
reg(0x01, "ADD", "3 (verylow)", "MATH");
reg(0x02, "MUL", "5 (low)", "MATH");
reg(0x03, "SUB", "3 (verylow)", "MATH");
reg(0x04, "DIV", "5 (low)", "MATH");
reg(0x05, "SDIV", "5 (low)", "MATH");
reg(0x06, "MOD", "5 (low)", "MATH");
reg(0x07, "SMOD", "5 (low)", "MATH");
reg(0x08, "ADDMOD", "8 (mid)", "MATH");
reg(0x09, "MULMOD", "8 (mid)", "MATH");
reg(0x0a, "EXP", "dynamic", "MATH");
reg(0x0b, "SIGNEXTEND", "5 (low)", "MATH");
reg(0x10, "LT", "3 (verylow)", "MATH");
reg(0x11, "GT", "3 (verylow)", "MATH");
reg(0x12, "SLT", "3 (verylow)", "MATH");
reg(0x13, "SGT", "3 (verylow)", "MATH");
reg(0x14, "EQ", "3 (verylow)", "MATH");
reg(0x15, "ISZERO", "3 (verylow)", "MATH");
reg(0x16, "AND", "3 (verylow)", "MATH");
reg(0x17, "OR", "3 (verylow)", "MATH");
reg(0x18, "XOR", "3 (verylow)", "MATH");
reg(0x19, "NOT", "3 (verylow)", "MATH");
reg(0x1a, "BYTE", "3 (verylow)", "MATH");
reg(0x1b, "SHL", "3 (verylow)", "MATH");
reg(0x1c, "SHR", "3 (verylow)", "MATH");
reg(0x1d, "SAR", "3 (verylow)", "MATH");
reg(0x20, "KECCAK256", "dynamic", "SYS");
reg(0x30, "ADDRESS", "2", "SYS");
reg(0x31, "BALANCE", "dynamic", "SYS");
reg(0x32, "ORIGIN", "2", "SYS");
reg(0x33, "CALLER", "2", "SYS");
reg(0x34, "CALLVALUE", "2", "SYS");
reg(0x35, "CALLDATALOAD", "3 (verylow)", "MEM");
reg(0x36, "CALLDATASIZE", "2", "MEM");
reg(0x37, "CALLDATACOPY", "dynamic", "MEM");
reg(0x38, "CODESIZE", "2", "MEM");
reg(0x39, "CODECOPY", "dynamic", "MEM");
reg(0x3a, "GASPRICE", "2", "SYS");
reg(0x3b, "EXTCODESIZE", "dynamic", "SYS");
reg(0x3c, "EXTCODECOPY", "dynamic", "SYS");
reg(0x3d, "RETURNDATASIZE", "2", "SYS");
reg(0x3e, "RETURNDATACOPY", "dynamic", "SYS");
reg(0x3f, "EXTCODEHASH", "dynamic", "SYS");
reg(0x40, "BLOCKHASH", "20", "SYS");
reg(0x41, "COINBASE", "2", "SYS");
reg(0x42, "TIMESTAMP", "2", "SYS");
reg(0x43, "NUMBER", "2", "SYS");
reg(0x44, "PREVRANDAO", "2", "SYS");
reg(0x45, "GASLIMIT", "2", "SYS");
reg(0x46, "CHAINID", "2", "SYS");
reg(0x47, "SELFBALANCE", "5 (low)", "SYS");
reg(0x48, "BASEFEE", "2", "SYS");
reg(0x49, "BLOBHASH", "3 (verylow)", "SYS");
reg(0x4a, "BLOBBASEFEE", "2", "SYS");
reg(0x50, "POP", "2", "STACK");
reg(0x51, "MLOAD", "3 (verylow)", "MEM");
reg(0x52, "MSTORE", "3 (verylow)", "MEM");
reg(0x53, "MSTORE8", "3 (verylow)", "MEM");
reg(0x54, "SLOAD", "dynamic (cold 2100 / warm 100)", "STORAGE");
reg(0x55, "SSTORE", "dynamic", "STORAGE");
reg(0x56, "JUMP", "8 (mid)", "FLOW");
reg(0x57, "JUMPI", "10 (high)", "FLOW");
reg(0x58, "PC", "2", "FLOW");
reg(0x59, "MSIZE", "2", "MEM");
reg(0x5a, "GAS", "2", "SYS");
reg(0x5b, "JUMPDEST", "1", "FLOW");
reg(0x5c, "TLOAD", "100 (warm)", "STORAGE");
reg(0x5d, "TSTORE", "100", "STORAGE");
reg(0x5e, "MCOPY", "dynamic", "MEM");
reg(0x5f, "PUSH0", "2", "PUSH");
for (let n = 1; n <= 32; n++) OPCODES.set(0x5f + n, { name: `PUSH${n}`, gas: "3 (verylow)", kind: "PUSH" });
for (let n = 1; n <= 16; n++) OPCODES.set(0x7f + n, { name: `DUP${n}`, gas: "3 (verylow)", kind: "DUP" });
for (let n = 1; n <= 16; n++) OPCODES.set(0x8f + n, { name: `SWAP${n}`, gas: "3 (verylow)", kind: "SWAP" });
for (let n = 0; n <= 4; n++) reg(0xa0 + n, `LOG${n}`, "dynamic", "LOG");
reg(0xf0, "CREATE", "dynamic", "SYS");
reg(0xf1, "CALL", "dynamic", "CALL");
reg(0xf2, "CALLCODE", "dynamic", "CALL");
reg(0xf3, "RETURN", "0", "SYS", true);
reg(0xf4, "DELEGATECALL", "dynamic", "CALL");
reg(0xf5, "CREATE2", "dynamic", "SYS");
reg(0xfa, "STATICCALL", "dynamic", "CALL");
reg(0xfd, "REVERT", "0", "SYS", true);
reg(0xfe, "INVALID", "0", "INVALID", true);
reg(0xff, "SELFDESTRUCT", "dynamic", "SYS", true);

export function opcodeInfo(byte: number): OpcodeInfo {
  return OPCODES.get(byte) ?? { name: `UNKNOWN_0x${byte.toString(16).padStart(2, "0").toUpperCase()}`, gas: "—", kind: "INVALID" };
}

export function isPush(byte: number): boolean {
  return byte >= 0x60 && byte <= 0x7f;
}

export function pushWidth(byte: number): number {
  if (byte === 0x5f) return 0;
  if (byte >= 0x60 && byte <= 0x7f) return byte - 0x5f;
  return 0;
}
