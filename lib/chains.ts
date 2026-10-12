export type ChainKey = "robinhood" | "bsc";

export interface ChainConfig {
  key: ChainKey;
  label: string;
  shortLabel: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  explorerApiUrl?: string;
  currency: string;
  isTestnet: false;
}

function envOr(fallback: string, ...names: string[]): string {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim().length > 0) return v.trim();
  }
  return fallback;
}

export function getChains(): Record<ChainKey, ChainConfig> {
  return {
    robinhood: {
      key: "robinhood",
      label: "Robinhood Chain",
      shortLabel: "RHC",
      chainId: 4663,
      rpcUrl: envOr(
        "https://rpc.mainnet.chain.robinhood.com",
        "ROBINHOOD_RPC_URL",
        "NEXT_PUBLIC_ROBINHOOD_RPC_URL",
      ),
      explorerUrl: envOr(
        "https://robinhoodchain.blockscout.com",
        "ROBINHOOD_EXPLORER_URL",
        "NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL",
      ),
      explorerApiUrl: envOr(
        "https://robinhoodchain.blockscout.com/api",
        "ROBINHOOD_EXPLORER_API_URL",
      ),
      currency: "ETH",
      isTestnet: false,
    },
    bsc: {
      key: "bsc",
      label: "BNB Smart Chain",
      shortLabel: "BSC",
      chainId: 56,
      rpcUrl: envOr(
        "https://bsc-dataseed.bnbchain.org",
        "BSC_RPC_URL",
        "NEXT_PUBLIC_BSC_RPC_URL",
      ),
      explorerUrl: envOr("https://bscscan.com", "BSC_EXPLORER_URL", "NEXT_PUBLIC_BSC_EXPLORER_URL"),
      explorerApiUrl: envOr("https://api.bscscan.com/api", "BSC_EXPLORER_API_URL"),
      currency: "BNB",
      isTestnet: false,
    },
  };
}

export function parseChainKey(input: unknown): ChainKey | null {
  if (typeof input !== "string") return null;
  const s = input.trim().toLowerCase();
  if (s === "robinhood" || s === "rhc" || s === "4663" || s === "robinhoodchain") return "robinhood";
  if (s === "bsc" || s === "bnb" || s === "56" || s === "binance" || s === "bscmainnet") return "bsc";
  return null;
}

export function explorerAddressUrl(chain: ChainConfig, address: string): string {
  const base = chain.explorerUrl.replace(/\/$/, "");
  return `${base}/address/${address}`;
}

export function explorerTxUrl(chain: ChainConfig, hash: string): string {
  const base = chain.explorerUrl.replace(/\/$/, "");
  return `${base}/tx/${hash}`;
}
