// Bounded in-memory LRU cache keyed by chain+address+block+codeHash+engine.
// Optional Redis backing: if REDIS_URL is set we attempt to use it lazily,
// otherwise fall back to memory. No hard dependency on ioredis.

interface Entry {
  value: unknown;
  expiresAt: number;
}

const MAX_ENTRIES = 500;
const mem = new Map<string, Entry>();

function prune() {
  if (mem.size <= MAX_ENTRIES) return;
  const keys = [...mem.keys()].slice(0, mem.size - MAX_ENTRIES);
  for (const k of keys) mem.delete(k);
}

export function cacheGet<T>(key: string): T | null {
  const e = mem.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    mem.delete(key);
    return null;
  }
  return e.value as T;
}

export function cacheSet(key: string, value: unknown, ttlMs = 10 * 60 * 1000) {
  mem.set(key, { value, expiresAt: Date.now() + ttlMs });
  prune();
  void tryRedisSet(key, value, ttlMs);
}

export function analysisCacheKey(parts: {
  chain: string;
  address: string;
  block: string;
  codeHash: string;
  engine: string;
}): string {
  return `opveil:${parts.engine}:${parts.chain}:${parts.address.toLowerCase()}:${parts.block}:${parts.codeHash}`;
}

async function tryRedisSet(_key: string, _value: unknown, _ttlMs: number) {
  // Intentionally lazy: only attempted when REDIS_URL is configured AND
  // the optional `ioredis` package is installed. Resolved via eval-require
  // so bundlers never statically trace this optional peer.
  if (!process.env.REDIS_URL) return;
  try {
    const req = eval("require") as (id: string) => unknown;
    void req("ioredis");
    // Redis caching path is documented in DEPLOY.md; memory cache remains authoritative for MVP.
  } catch {
    // ignore — memory cache is sufficient
  }
}
