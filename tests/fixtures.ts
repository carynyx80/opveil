// Shared fixtures: tiny hand-built runtime snippets + a realistic ERC-20 dispatcher fragment.
// None of these touch the network.

/** Minimal runtime: PUSH1 0x80 PUSH1 0x40 MSTORE STOP */
export const SIMPLE_RUNTIME = "0x608060405200";

/** Dispatcher fragment exposing transfer(address,uint256)=a9059cbb and owner()=8da5cb5b.
 *  Layout: PUSH4 <sel> DUP1 PUSH1 0xe0 SHR (via CALLDATALOAD) EQ PUSH2 <dest> JUMPI, twice.
 *  CALLDATALOAD(0x35) + SHR 0xe0 preamble included so dispatcherType=standard.
 */
export const ERC20_DISPATCHER =
  "0x" +
  [
    "60", "80", // PUSH1 0x80
    "60", "40", // PUSH1 0x40
    "52", // MSTORE
    "35", // CALLDATALOAD
    "60", "e0", // PUSH1 0xe0
    "1c", // SHR
    "80", // DUP1
    "63", "a9059cbb", // PUSH4 transfer
    "14", // EQ
    "61", "0100", // PUSH2 0x0100
    "57", // JUMPI
    "80", // DUP1
    "63", "8da5cb5b", // PUSH4 owner
    "14", // EQ
    "61", "0200", // PUSH2 0x0200
    "57", // JUMPI
    "5b", // JUMPDEST @dest1
    "54", // SLOAD (storage access near transfer)
    "f1", // CALL (external call near transfer)
    "00", // STOP
    "5b", // JUMPDEST @dest2
    "33", // CALLER
    "00", // STOP
  ].join("");

/** Runtime containing DELEGATECALL + SELFDESTRUCT + SSTORE for security-check tests. */
export const RISKY_RUNTIME =
  "0x" +
  [
    "60", "80", "60", "40", "52", // preamble
    "73", "1111111111111111111111111111111111111111", // PUSH20 addr
    "5a", // GAS
    "f4", // DELEGATECALL
    "60", "00", "55", // PUSH1 0 SSTORE
    "ff", // SELFDESTRUCT
    "00",
  ].join("");

/** EIP-1167 minimal proxy for 0x1111111111111111111111111111111111111111 */
export const MINIMAL_PROXY =
  "0x363d3d373d3d3d363d7311111111111111111111111111111111111111115af43d82803e903d91602b57fd5bf3";
