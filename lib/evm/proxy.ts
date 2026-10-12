import type { Hex } from "viem";

export type ProxyPattern =
  | "eip1967"
  | "eip1967-beacon"
  | "minimal-eip1167"
  | "uups"
  | "transparent"
  | "none-detected"
  | "uncertain";

export interface ProxyResolution {
  isProxy: boolean;
  pattern: ProxyPattern;
  implementation: string | null;
  admin: string | null;
  beacon: string | null;
  codeHashImplementation: string | null;
  provenance: string[];
  confidence: "high" | "medium" | "low";
  limitations: string[];
}

// EIP-1967 slots
export const EIP1967_IMPL_SLOT =
  "0x360894a13ba1a3210667c828edb7d4a4815b5b12d5a144059444282246128812914" as Hex;
export const EIP1967_ADMIN_SLOT =
  "0xb53127684a568b3173ae13b9f721c1e064d77d0fd2aa1da26e342e11c5d1eaf7" as Hex;
export const EIP1967_BEACON_SLOT =
  "0xa3f0ad74e5423aebfd80d3160a3a487abc82d8993db4c78294e12f38e0988f6" as Hex;

export function addressFromSlotWord(word: string): string | null {
  const h = word.toLowerCase().startsWith("0x") ? word.slice(2) : word;
  const padded = h.padStart(64, "0");
  const addr = "0x" + padded.slice(24);
  if (/^0x0{40}$/.test(addr)) return null;
  if (!/^0x[0-9a-f]{40}$/.test(addr)) return null;
  return addr;
}

export function detectMinimalProxy(bytecodeHex: string): { isMinimal: boolean; implementation: string | null; evidence: string[] } {
  const h = bytecodeHex.toLowerCase().replace(/^0x/, "");
  // EIP-1167 runtime: 363d3d373d3d3d363d73<addr>5af43d82803e903d91602b57fd5bf3
  const m = h.match(/363d3d373d3d3d363d73([0-9a-f]{40})5af43d82803e903d91602b57fd5bf3/);
  if (m) {
    return {
      isMinimal: true,
      implementation: "0x" + m[1],
      evidence: ["Bytecode matches EIP-1167 minimal-proxy runtime template with embedded implementation address."],
    };
  }
  if (h.startsWith("363d3d373d3d3d363d73") && h.length < 200) {
    const maybe = h.slice(20, 60);
    if (/^[0-9a-f]{40}$/.test(maybe)) {
      return {
        isMinimal: true,
        implementation: "0x" + maybe,
        evidence: ["Bytecode prefix matches EIP-1167 minimal-proxy header (short-form match, verify implementation separately)."],
      };
    }
  }
  return { isMinimal: false, implementation: null, evidence: [] };
}

export function classifyProxy(opts: {
  bytecodeHex: string;
  implSlotValue: string | null;
  adminSlotValue: string | null;
  beaconSlotValue: string | null;
  hasDelegateCall: boolean;
}): ProxyResolution {
  const provenance: string[] = [];
  const limitations = [
    "Proxy detection reads well-known storage slots and code templates only.",
    "Custom proxy patterns and diamond (EIP-2535) facets are reported as uncertain.",
    "Implementation code must be fetched and analyzed separately; proxy storage is not equivalent to implementation storage.",
  ];
  const { isMinimal, implementation: minimalImpl, evidence: minimalEvidence } = detectMinimalProxy(opts.bytecodeHex);
  if (isMinimal && minimalImpl) {
    return {
      isProxy: true,
      pattern: "minimal-eip1167",
      implementation: minimalImpl,
      admin: null,
      beacon: null,
      codeHashImplementation: null,
      provenance: [...minimalEvidence, "Resolution source: bytecode template match (eth_getCode)."],
      confidence: "high",
      limitations,
    };
  }

  const impl = opts.implSlotValue ? addressFromSlotWord(opts.implSlotValue) : null;
  const admin = opts.adminSlotValue ? addressFromSlotWord(opts.adminSlotValue) : null;
  const beacon = opts.beaconSlotValue ? addressFromSlotWord(opts.beaconSlotValue) : null;

  if (beacon) {
    provenance.push(`Beacon slot ${EIP1967_BEACON_SLOT} resolves to ${beacon} (eth_getStorageAt). Admin: ${admin ?? "none"}.`);
    return { isProxy: true, pattern: "eip1967-beacon", implementation: null, admin, beacon, codeHashImplementation: null, provenance, confidence: "medium", limitations };
  }
  if (impl) {
    provenance.push(`EIP-1967 implementation slot ${EIP1967_IMPL_SLOT} resolves to ${impl} (eth_getStorageAt).`);
    if (admin) provenance.push(`EIP-1967 admin slot ${EIP1967_ADMIN_SLOT} resolves to ${admin} (eth_getStorageAt).`);
    if (opts.hasDelegateCall) provenance.push("Runtime bytecode contains DELEGATECALL, consistent with proxy forwarding.");
    const looksUUPS = /3659cfe6|4f1ef286/.test(opts.bytecodeHex.toLowerCase());
    return {
      isProxy: true,
      pattern: looksUUPS ? "uups" : admin ? "transparent" : "eip1967",
      implementation: impl,
      admin,
      beacon: null,
      codeHashImplementation: null,
      provenance,
      confidence: opts.hasDelegateCall ? "high" : "medium",
      limitations,
    };
  }
  if (opts.hasDelegateCall) {
    return {
      isProxy: false,
      pattern: "uncertain",
      implementation: null,
      admin: admin ?? null,
      beacon: null,
      codeHashImplementation: null,
      provenance: ["Runtime contains DELEGATECALL but no EIP-1967 implementation/beacon slot resolved. Manual review required."],
      confidence: "low",
      limitations,
    };
  }
  return {
    isProxy: false,
    pattern: "none-detected",
    implementation: null,
    admin: null,
    beacon: null,
    codeHashImplementation: null,
    provenance: ["Checked EIP-1967 implementation/admin/beacon slots (all zero) and EIP-1167 template (no match)."],
    confidence: "medium",
    limitations,
  };
}
