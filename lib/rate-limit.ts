// Simple in-memory sliding-window rate limiter (per route + IP).
// For multi-instance production, back with Redis (see README / DEPLOY.md).

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

function clientIp(req: Request): string {
  const h = req.headers.get("x-forwarded-for");
  if (h) return h.split(",")[0].trim().slice(0, 64);
  return "unknown";
}

export function rateLimit(req: Request, opts?: { windowMs?: number; max?: number; prefix?: string }) {
  const windowMs = opts?.windowMs ?? 60_000;
  const max = opts?.max ?? Number(process.env.RATE_LIMIT_PER_MIN ?? 30);
  const now = Date.now();
  const key = `${opts?.prefix ?? "global"}:${clientIp(req)}`;
  let b = buckets.get(key);
  if (!b) {
    b = { hits: [] };
    buckets.set(key, b);
  }
  b.hits = b.hits.filter((t) => now - t < windowMs);
  if (b.hits.length >= max) {
    const retryAfter = Math.ceil((windowMs - (now - b.hits[0])) / 1000);
    return { allowed: false as const, retryAfter };
  }
  b.hits.push(now);
  return { allowed: true as const, retryAfter: 0 };
}

export function rateLimitHeaders(retryAfter: number): Record<string, string> {
  return retryAfter > 0 ? { "Retry-After": String(retryAfter) } : {};
}
