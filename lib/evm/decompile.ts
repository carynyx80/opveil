import { execFile } from "node:child_process";
import type { Disassembly } from "./disassembler";
import type { FunctionCandidate } from "./selectors";

export interface DecompileResult {
  mode: "external" | "structural-fallback";
  language: "solidity-like" | "pseudocode";
  approximate: true;
  output: string;
  mapping: { label: string; offsets: number[] }[];
  provenance: string[];
  warnings: string[];
}

/**
 * Pluggable decompiler adapter.
 * - If DECOMPILER_CMD is set (e.g. "/usr/local/bin/evm-decompile"), it is executed
 *   in a sandboxed manner: single file arg, strict timeout, max buffer, no shell.
 * - Otherwise a deterministic structural pseudocode is generated from disassembly.
 * NEVER fabricate exact Solidity.
 */
export async function decompile(opts: {
  bytecodeHex: string;
  disassembly: Disassembly;
  selectors: FunctionCandidate[];
}): Promise<DecompileResult> {
  const cmd = (process.env.DECOMPILER_CMD ?? "").trim();
  if (cmd) {
    try {
      const out = await runExternal(cmd, opts.bytecodeHex);
      return {
        mode: "external",
        language: "solidity-like",
        approximate: true,
        output: out.slice(0, 60_000),
        mapping: opts.selectors.map((s) => ({ label: s.signature ?? s.selector, offsets: s.opcodeOffsets })),
        provenance: [`External decompiler executed via DECOMPILER_CMD (${cmd}) with 20s timeout, no shell.`],
        warnings: ["APPROXIMATE: machine-generated reconstruction. Do not treat as original source."],
      };
    } catch (e) {
      return {
        ...(structural(opts) as DecompileResult),
        provenance: [`External decompiler failed (${e instanceof Error ? e.message : String(e)}); fell back to structural view.`],
      };
    }
  }
  return structural(opts);
}

function structural(opts: { disassembly: Disassembly; selectors: FunctionCandidate[]; bytecodeHex: string }): DecompileResult {
  const { disassembly: d, selectors } = opts;
  const L: string[] = [];
  L.push("// ── OPVEIL structural reconstruction (APPROXIMATE) ──────────────────");
  L.push("// Derived from dispatcher + opcode structure. NOT original source.");
  L.push("");
  L.push(`// runtime: ${d.byteSize} bytes · ${d.ops.length} ops · ${d.jumpDests.length} jumpdests`);
  if (d.metadata) L.push(`// metadata trailer: ${d.metadata.length} bytes @${d.metadata.offset} (excluded)`);
  L.push("");
  L.push("contract Decompiled {");
  if (selectors.length === 0) {
    L.push("  // No public dispatcher detected — likely fallback-only, proxy stub, or hand-written init.");
    L.push("  fallback() external {");
    L.push("    // see disassembly tab for control flow");
    L.push("  }");
  } else {
    for (const s of selectors.slice(0, 64)) {
      const name = (s.signature ?? `fn_${s.selector.slice(2)}`).replace("()", "");
      const kind = s.hasExternalCall ? " // → external call" : s.hasStorageAccess ? " // → storage" : "";
      L.push(`  function ${name}(${s.selector}) external ${s.payableHint === "unknown" ? "" : s.payableHint}${kind};`);
    }
    if (selectors.length > 64) L.push(`  // … +${selectors.length - 64} more selectors (see Functions tab)`);
  }
  L.push("}");
  L.push("");
  L.push("// Control-flow skeleton (first 40 branch points):");
  const branches = d.ops.filter((o) => o.isBranch || o.isJumpDest).slice(0, 40);
  for (const b of branches) {
    L.push(`//   @${b.offset}  ${b.name}${b.operand ? " 0x" + b.operand : ""}`);
  }
  return {
    mode: "structural-fallback",
    language: "pseudocode",
    approximate: true,
    output: L.join("\n"),
    mapping: selectors.map((s) => ({ label: s.signature ?? s.selector, offsets: s.opcodeOffsets })),
    provenance: ["Deterministic structural adapter (no external binary, no LLM)."],
    warnings: [
      "APPROXIMATE: control-flow skeleton only. Variable names, types, and logic are not recovered.",
      "Use Bytecode + Functions tabs as ground truth.",
    ],
  };
}

function runExternal(cmd: string, bytecodeHex: string): Promise<string> {
  // Strict sandbox: no shell, single data argument via stdin-equivalent argv, timeout, bounded buffer.
  if (!/^[a-zA-Z0-9_./\\:-]+$/.test(cmd)) return Promise.reject(new Error("DECOMPILER_CMD contains unsafe characters"));
  return new Promise((resolve, reject) => {
    const child = execFile(
      cmd,
      [bytecodeHex.slice(0, 2 + 2 * 24576)],
      { timeout: 20_000, maxBuffer: 2 * 1024 * 1024, windowsHide: true, shell: false },
      (err, stdout, _stderr) => {
        if (err) return reject(err);
        if (!stdout || stdout.trim().length < 8) return reject(new Error("empty decompiler output"));
        resolve(stdout);
      },
    );
    void child;
  });
}
