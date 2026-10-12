import { promises as fs } from "node:fs";
import path from "node:path";

// File-backed history store for MVP (zero-config).
// Production path: Prisma + PostgreSQL (see prisma/schema.prisma + DEPLOY.md).
// The file store keeps the app fully working without a database.

export interface HistoryEntry {
  id: string;
  chain: string;
  address: string;
  blockNumber: string;
  codeHash: string;
  byteSize: number;
  selectorCount: number;
  findingCount: number;
  isProxy: boolean;
  proxyPattern: string;
  createdAt: string;
}

export interface FullAnalysis extends HistoryEntry {
  bytecode: string;
  selectorsJson: string;
  findingsJson: string;
  proxyJson: string;
  decompiled: string;
  sourceVerified: boolean;
}

function dataDir(): string {
  return path.join(process.cwd(), "data");
}

function historyPath(): string {
  return path.join(dataDir(), "history.json");
}

function fullPath(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(dataDir(), `analysis-${safe}.json`);
}

export function analysisId(chain: string, address: string, codeHash: string): string {
  return `${chain}-${address.toLowerCase()}-${codeHash.slice(2, 10)}`;
}

async function readHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await fs.readFile(historyPath(), "utf8");
    const arr = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function writeHistory(entries: HistoryEntry[]): Promise<void> {
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.writeFile(historyPath(), JSON.stringify(entries.slice(0, 500), null, 2), "utf8");
}

export async function saveAnalysis(full: FullAnalysis): Promise<HistoryEntry> {
  const entry: HistoryEntry = {
    id: full.id,
    chain: full.chain,
    address: full.address,
    blockNumber: full.blockNumber,
    codeHash: full.codeHash,
    byteSize: full.byteSize,
    selectorCount: full.selectorCount,
    findingCount: full.findingCount,
    isProxy: full.isProxy,
    proxyPattern: full.proxyPattern,
    createdAt: full.createdAt,
  };
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.writeFile(fullPath(full.id), JSON.stringify(full, null, 2), "utf8");
  const hist = await readHistory();
  const rest = hist.filter((h) => h.id !== entry.id);
  await writeHistory([entry, ...rest]);
  // Best-effort Prisma mirror (ignored when DATABASE_URL is absent)
  void mirrorToPrisma(full).catch(() => undefined);
  return entry;
}

export async function getAnalysis(id: string): Promise<FullAnalysis | null> {
  try {
    const raw = await fs.readFile(fullPath(id), "utf8");
    return JSON.parse(raw) as FullAnalysis;
  } catch {
    return null;
  }
}

export async function findAnalysisByChainAddress(chain: string, address: string): Promise<FullAnalysis | null> {
  const hist = await readHistory();
  const match = hist.find((h) => h.chain === chain && h.address.toLowerCase() === address.toLowerCase());
  if (!match) return null;
  return getAnalysis(match.id);
}

export async function listHistory(opts?: { chain?: string; q?: string; limit?: number }): Promise<HistoryEntry[]> {
  let hist = await readHistory();
  if (opts?.chain) hist = hist.filter((h) => h.chain === opts.chain);
  if (opts?.q) {
    const q = opts.q.toLowerCase();
    hist = hist.filter((h) => h.address.toLowerCase().includes(q) || h.codeHash.toLowerCase().includes(q));
  }
  return hist.slice(0, Math.min(opts?.limit ?? 50, 200));
}

async function mirrorToPrisma(_full: FullAnalysis): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    // Optional: @prisma/client only exists after `prisma generate`.
    // eval-require keeps bundlers from statically tracing this optional peer.
    const req = eval("require") as (id: string) => { PrismaClient: new () => { $connect: () => Promise<unknown>; $disconnect: () => Promise<unknown> } };
    const { PrismaClient } = req("@prisma/client");
    const prisma = new PrismaClient();
    await prisma.$connect().catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
  } catch {
    // Prisma not generated / DB unreachable — file store remains authoritative.
  }
}
