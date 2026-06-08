// server-only
// Tiny in-memory TTL cache + WooCommerce category id resolver.
// Used by lib/woo.ts read functions to avoid hammering the Hostinger-hosted store.
// NOTE: this module must never be imported by client components — it touches
// server-only env vars and performs outbound HTTP. Keep it on the server.

type CacheEntry<T> = { value: T; expires: number };

// Module-level cache. In a serverless/edge cold start this resets, which is fine —
// it only exists to coalesce bursts of requests within a single warm instance.
const store = new Map<string, CacheEntry<unknown>>();

// In-flight promise dedupe so concurrent callers for the same key share one fetch.
const inflight = new Map<string, Promise<unknown>>();

/**
 * Cache the result of `fn` under `key` for `ttlMs` milliseconds.
 * Concurrent calls with the same key while a fetch is in flight share the result.
 * If `fn` rejects, nothing is cached and the rejection propagates.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expires > now) {
    return hit.value;
  }

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = (async () => {
    try {
      const value = await fn();
      store.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

/** Clear the entire cache (useful for tests / manual revalidation). */
export function clearWooCache(): void {
  store.clear();
  inflight.clear();
}

// ---------------------------------------------------------------------------
// Category id resolver
// ---------------------------------------------------------------------------

// Synonyms mapping our three collections to substrings that may appear in a
// WooCommerce category slug or name (case-insensitive).
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  islamique: ['islamique', 'islamic', 'islam'],
  moderne: ['moderne', 'modern'],
  abstrait: ['abstrait', 'abstract'],
};

type WooCategory = { id: number; name: string; slug: string };

/**
 * Resolve a WooCommerce product-category id by slug or name.
 * Accepts our collection keys (islamique/moderne/abstrait) and their synonyms,
 * or any literal slug/name. Returns null if not found or if Woo is unreachable.
 *
 * The categories list is cached for 5 minutes (categories change rarely).
 */
export async function getCategoryId(slugOrName: string): Promise<number | null> {
  if (!slugOrName) return null;

  // Imported lazily to avoid a circular import at module-eval time
  // (woo.ts imports from this file too).
  const { wooGet, isWooConfigured } = await import('./woo');
  if (!isWooConfigured()) return null;

  let categories: WooCategory[];
  try {
    categories = await cached<WooCategory[]>(
      'woo:categories',
      5 * 60 * 1000,
      async () => {
        const acc: WooCategory[] = [];
        let page = 1;
        // Categories are usually few; cap pages defensively.
        // eslint-disable-next-line no-constant-condition
        while (page <= 10) {
          const res = await wooGet<WooCategory[]>('products/categories', {
            per_page: 100,
            page,
          });
          if (Array.isArray(res.data)) acc.push(...res.data);
          if (page >= (res.totalPages || 1)) break;
          page += 1;
        }
        return acc;
      },
    );
  } catch {
    return null;
  }

  if (!Array.isArray(categories) || categories.length === 0) return null;

  const needle = String(slugOrName).trim().toLowerCase();

  // Build the list of candidate substrings: explicit synonyms if the input is
  // one of our known collection keys, otherwise the literal input.
  const candidates =
    CATEGORY_SYNONYMS[needle] ??
    // also handle when caller passes a synonym directly (e.g. "islamic")
    Object.values(CATEGORY_SYNONYMS).find((syns) => syns.includes(needle)) ??
    [needle];

  // 1) Exact slug/name match first.
  for (const cat of categories) {
    const slug = (cat.slug || '').toLowerCase();
    const name = (cat.name || '').toLowerCase();
    if (candidates.includes(slug) || candidates.includes(name)) {
      return cat.id;
    }
  }

  // 2) Substring match.
  for (const cat of categories) {
    const slug = (cat.slug || '').toLowerCase();
    const name = (cat.name || '').toLowerCase();
    if (candidates.some((c) => slug.includes(c) || name.includes(c))) {
      return cat.id;
    }
  }

  return null;
}
