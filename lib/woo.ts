// server-only
// WooCommerce REST API v3 client + product read layer for Calligraphy JOUD.
//
// IMPORTANT: this module reads server-only credentials (WOO_CONSUMER_KEY etc.)
// and must NEVER be imported into a client component / bundle. It is meant to be
// imported only from server code (Server Components, Route Handlers, Server
// Actions). The env vars are intentionally read via process.env WITHOUT the
// NEXT_PUBLIC_ prefix so they cannot leak to the browser.

import { cached, getCategoryId } from './woo-cache';
// Fallback catalogue (72 hand-curated items). content.js is plain JS, imported
// here as the source of truth when Woo is unconfigured or unreachable.
import { PRODUCTS as FALLBACK_PRODUCTS } from '@/app/data/content';
import { attrFor } from './product-attrs';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Our normalised catalogue item shape — mirrors content.js PRODUCTS entries. */
export interface CatalogueItem {
  id: string;
  name: string;
  name_ar: string;
  /** 0 = islamique, 1 = moderne, 2 = abstrait */
  col: 0 | 1 | 2;
  /** number of panels: 1 | 2 | 3 */
  comp: 1 | 2 | 3;
  /** 0 = Carré, 1 = Rectangulaire, 2 = Rond */
  forme: 0 | 1 | 2;
  /** price in MAD, or null → caller renders "Sur demande" */
  price: number | null;
  /** rectangulaire orientation — affects dimension display only (portrait swaps W×H). */
  orientation?: 'portrait' | 'paysage';
  /** Main image — Woo featured image when present, else /assets/products/{SKU}.webp. */
  img: string;
  /** Full gallery (main first) — Woo gallery when present, else [img]. */
  images: string[];
  /** Alt text from the Woo media library, when the owner filled it in. */
  alt?: string;
  /** Plain-text product description from Woo (short_description preferred). */
  description?: string;
}

/** Minimal WooCommerce product shape — only the fields we consume. */
export interface WooProduct {
  id: number;
  name: string;
  sku: string;
  price: string;
  regular_price: string;
  on_sale: boolean;
  stock_status: string;
  type: string;
  description?: string;
  short_description?: string;
  categories: Array<{ id: number; name: string; slug: string }>;
  attributes: Array<{
    name: string;
    option?: string;
    options?: string[];
  }>;
  images: Array<{ src: string; alt?: string }>;
  variations: number[];
  // Woo meta_data is loosely typed; we read name_ar from here if present.
  meta_data?: Array<{ key: string; value: unknown }>;
}

export interface GetProductsOptions {
  collection?: 'islamique' | 'moderne' | 'abstrait';
  forme?: 0 | 1 | 2;
  composition?: 1 | 2 | 3;
  search?: string;
  page?: number;
  perPage?: number;
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class WooError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'WooError';
    this.status = status;
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Config / client
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 5000;
const RETRY_BACKOFF_MS = 400;
const USER_AGENT = 'CalligraphyJOUD-Web/1.0 (+https://calligraphyjoud.com)';

/** True only when all three Woo env vars are present. */
export function isWooConfigured(): boolean {
  return Boolean(
    process.env.WOO_STORE_URL &&
      process.env.WOO_CONSUMER_KEY &&
      process.env.WOO_CONSUMER_SECRET,
  );
}

function baseUrl(): string {
  const url = process.env.WOO_STORE_URL || '';
  return `${url.replace(/\/$/, '')}/wp-json/wc/v3`;
}

function authHeader(): string {
  const ck = process.env.WOO_CONSUMER_KEY || '';
  const cs = process.env.WOO_CONSUMER_SECRET || '';
  const token = Buffer.from(`${ck}:${cs}`).toString('base64');
  return `Basic ${token}`;
}

function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  const rel = path.replace(/^\//, '');
  const url = new URL(`${baseUrl()}/${rel}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

interface RequestResult {
  res: Response;
  body: unknown;
}

/**
 * Low-level request with: 5s timeout (AbortController), one retry on network
 * error or HTTP 5xx (with ~400ms backoff). Throws WooError on non-2xx.
 */
async function request(
  method: 'GET' | 'POST' | 'PUT',
  url: string,
  jsonBody?: unknown,
): Promise<RequestResult> {
  if (!isWooConfigured()) {
    throw new WooError('WooCommerce is not configured', undefined, 'not_configured');
  }

  const headers: Record<string, string> = {
    Authorization: authHeader(),
    'Content-Type': 'application/json',
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
  };

  const attempt = async (): Promise<RequestResult> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: jsonBody !== undefined ? JSON.stringify(jsonBody) : undefined,
        signal: controller.signal,
        // Always hit the network; we do our own in-memory caching layer.
        cache: 'no-store',
      });
      const body = await parseBody(res);
      return { res, body };
    } finally {
      clearTimeout(timer);
    }
  };

  let lastErr: unknown;
  for (let i = 0; i < 2; i++) {
    try {
      const result = await attempt();
      // Retry once on 5xx.
      if (result.res.status >= 500 && result.res.status <= 599 && i === 0) {
        lastErr = new WooError(
          `WooCommerce ${result.res.status}`,
          result.res.status,
        );
        await delay(RETRY_BACKOFF_MS);
        continue;
      }
      if (!result.res.ok) {
        const b = result.body as { code?: string; message?: string } | null;
        throw new WooError(
          (b && b.message) || `WooCommerce request failed (${result.res.status})`,
          result.res.status,
          b?.code,
        );
      }
      return result;
    } catch (err) {
      // WooError from a non-retryable !ok above must propagate immediately.
      if (err instanceof WooError && err.status && err.status < 500) {
        throw err;
      }
      lastErr = err;
      if (i === 0) {
        await delay(RETRY_BACKOFF_MS);
        continue;
      }
    }
  }

  if (lastErr instanceof WooError) throw lastErr;
  throw new WooError(
    lastErr instanceof Error ? lastErr.message : 'WooCommerce request failed',
    undefined,
    'network_error',
  );
}

/**
 * GET a Woo resource. Returns parsed data plus pagination read from the
 * x-wp-totalpages / x-wp-total response headers (defaults: totalPages=1).
 */
export async function wooGet<T = any>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<{ data: T; totalPages: number; total: number }> {
  const { res, body } = await request('GET', buildUrl(path, params));
  const totalPages = Number(res.headers.get('x-wp-totalpages')) || 1;
  const total = Number(res.headers.get('x-wp-total')) || 0;
  return { data: body as T, totalPages, total };
}

/** POST a JSON body to a Woo resource. */
export async function wooPost<T = any>(path: string, body: any): Promise<T> {
  const { body: data } = await request('POST', buildUrl(path), body);
  return data as T;
}

/** PUT a JSON body to a Woo resource. */
export async function wooPut<T = any>(path: string, body: any): Promise<T> {
  const { body: data } = await request('PUT', buildUrl(path), body);
  return data as T;
}

// ---------------------------------------------------------------------------
// Fallback helpers
// ---------------------------------------------------------------------------

const FALLBACK: CatalogueItem[] = (FALLBACK_PRODUCTS as any[]).map((p) => {
  const a = attrFor(String(p.id));
  return {
    id: String(p.id),
    name: p.name,
    name_ar: p.name_ar,
    col: p.col as 0 | 1 | 2,
    comp: a ? a.composition : (p.comp as 1 | 2 | 3),
    forme: a ? a.formeIndex : (p.forme as 0 | 1 | 2),
    orientation: a ? a.orientation : undefined,
    price: null,
    img: `/assets/products/${p.id}.webp`,
    images: [`/assets/products/${p.id}.webp`],
  };
});

const FALLBACK_BY_SKU = new Map<string, CatalogueItem>(
  FALLBACK.map((item) => [item.id.toUpperCase(), item]),
);

const COLLECTION_TO_COL: Record<string, 0 | 1 | 2> = {
  islamique: 0,
  moderne: 1,
  abstrait: 2,
};

function filterCatalogue(
  items: CatalogueItem[],
  opts?: GetProductsOptions,
): CatalogueItem[] {
  if (!opts) return items;
  let out = items;
  if (opts.collection) {
    const col = COLLECTION_TO_COL[opts.collection];
    out = out.filter((i) => i.col === col);
  }
  if (opts.forme !== undefined) {
    out = out.filter((i) => i.forme === opts.forme);
  }
  if (opts.composition !== undefined) {
    out = out.filter((i) => i.comp === opts.composition);
  }
  if (opts.search) {
    const q = opts.search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.name_ar.includes(opts.search!.trim()) ||
          i.id.toLowerCase().includes(q),
      );
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Woo → Catalogue mapping
// ---------------------------------------------------------------------------

function attrValues(attr: WooProduct['attributes'][number]): string[] {
  if (Array.isArray(attr.options)) return attr.options;
  if (attr.option) return [attr.option];
  return [];
}

function findAttr(
  p: WooProduct,
  re: RegExp,
): WooProduct['attributes'][number] | undefined {
  if (!Array.isArray(p.attributes)) return undefined;
  return p.attributes.find((a) => re.test(a.name || ''));
}

function deriveCol(p: WooProduct): 0 | 1 | 2 {
  const cats = Array.isArray(p.categories) ? p.categories : [];
  for (const c of cats) {
    const hay = `${c.name || ''} ${c.slug || ''}`.toLowerCase();
    if (hay.includes('islam')) return 0;
    if (hay.includes('modern') || hay.includes('moderne')) return 1;
    if (hay.includes('abstrait') || hay.includes('abstract')) return 2;
  }
  return 0;
}

function deriveForme(p: WooProduct, sku: string): 0 | 1 | 2 {
  const attr = findAttr(p, /forme|shape/i);
  if (attr) {
    const vals = attrValues(attr).join(' ').toLowerCase();
    if (/carr[ée]|square/.test(vals)) return 0;
    if (/rectangul|rectang/.test(vals)) return 1;
    if (/rond|round/.test(vals)) return 2;
  }
  // Default from known content.js item if SKU matches, else Rectangulaire.
  const known = FALLBACK_BY_SKU.get(sku.toUpperCase());
  if (known) return known.forme;
  return 1;
}

function deriveComp(p: WooProduct): 1 | 2 | 3 {
  const attr = findAttr(p, /composition|panneaux|panels|pi[eè]ces?/i);
  if (attr) {
    const vals = attrValues(attr).join(' ');
    if (/\b3\b|trois/.test(vals)) return 3;
    if (/\b2\b|deux/.test(vals)) return 2;
    if (/\b1\b|une?/.test(vals)) return 1;
  }
  return 1;
}

function derivePrice(p: WooProduct): number | null {
  const raw = p.price || p.regular_price || '';
  const n = Number(raw);
  if (!raw || !isFinite(n) || n <= 0) return null;
  return n;
}

function deriveNameAr(p: WooProduct, sku: string, fallbackName: string): string {
  // 1) meta_data key name_ar
  if (Array.isArray(p.meta_data)) {
    const meta = p.meta_data.find((m) => m && m.key === 'name_ar');
    if (meta && typeof meta.value === 'string' && meta.value.trim()) {
      return meta.value;
    }
  }
  // 2) attribute named name_ar
  const attr = findAttr(p, /^name[_ ]?ar$/i);
  if (attr) {
    const vals = attrValues(attr);
    if (vals[0] && vals[0].trim()) return vals[0];
  }
  // 3) matching content.js item by SKU
  const known = FALLBACK_BY_SKU.get(sku.toUpperCase());
  if (known && known.name_ar) return known.name_ar;
  // 4) fall back to the (latin) name
  return fallbackName;
}

/** Strip HTML/entities from a Woo description into a plain, single-line string. */
function cleanDesc(html?: string): string | undefined {
  if (!html || typeof html !== 'string') return undefined;
  const txt = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return txt || undefined;
}

/**
 * Resolve product imagery. IMAGES are owner-managed in WooCommerce: the featured
 * image is the main, the rest are gallery thumbnails. When a product has no Woo
 * image yet, fall back to the static /assets/products/{SKU}.webp so nothing
 * breaks during the transition.
 */
function resolveImages(
  p: WooProduct,
  sku: string,
): { img: string; images: string[]; alt?: string } {
  const imgs = Array.isArray(p.images)
    ? p.images.filter((i) => i && typeof i.src === 'string' && i.src.trim())
    : [];
  if (imgs.length === 0) {
    const local = `/assets/products/${sku}.webp`;
    return { img: local, images: [local] };
  }
  const alt =
    typeof imgs[0].alt === 'string' && imgs[0].alt.trim()
      ? imgs[0].alt.trim()
      : undefined;
  return { img: imgs[0].src, images: imgs.map((i) => i.src), alt };
}

/** True when the SKU is one of the 72 official codes (present in the attrs file). */
export function isOfficialSku(sku: string | undefined | null): boolean {
  return Boolean(sku && sku.trim() && attrFor(sku.trim()));
}

/** Map a WooCommerce product to our normalised CatalogueItem shape. */
export function toCatalogueItem(p: WooProduct): CatalogueItem {
  const sku = p.sku && p.sku.trim() ? p.sku.trim() : String(p.id);
  const name = p.name || sku;
  // Fixed per-product attributes are authoritative (override Woo-derived guesses).
  const a = attrFor(sku);
  const media = resolveImages(p, sku);
  return {
    id: sku,
    name,
    name_ar: deriveNameAr(p, sku, name),
    col: deriveCol(p),
    comp: a ? a.composition : deriveComp(p),
    forme: a ? a.formeIndex : deriveForme(p, sku),
    orientation: a ? a.orientation : undefined,
    // PRICE is always from the matrix (joud-pricing.json) via the product page —
    // never read from Woo. derivePrice returns null here by design.
    price: derivePrice(p),
    img: media.img,
    images: media.images,
    alt: media.alt,
    description: cleanDesc(p.short_description) || cleanDesc(p.description),
  };
}

// ---------------------------------------------------------------------------
// Read API
// ---------------------------------------------------------------------------

const READ_TTL_MS = 15 * 1000;

function warnFallback(reason: string): void {
  // eslint-disable-next-line no-console
  console.warn(`[woo] Falling back to local catalogue — ${reason}`);
}

/**
 * Get the catalogue, from WooCommerce when configured/available, else from the
 * local content.js fallback (same in-memory filtering applied either way).
 */
export async function getProducts(opts?: GetProductsOptions): Promise<{
  items: CatalogueItem[];
  totalPages: number;
  total: number;
  source: 'woo' | 'fallback';
}> {
  const o = opts || {};

  if (!isWooConfigured()) {
    const items = filterCatalogue(FALLBACK, o);
    return { items, totalPages: 1, total: items.length, source: 'fallback' };
  }

  const perPage = o.perPage && o.perPage > 0 ? o.perPage : 100;
  const page = o.page && o.page > 0 ? o.page : 1;

  try {
    // Resolve category id (best-effort; if it fails we filter in-memory).
    let categoryId: number | null = null;
    if (o.collection) {
      try {
        categoryId = await getCategoryId(o.collection);
      } catch {
        categoryId = null;
      }
    }

    const cacheKey = `woo:products:${JSON.stringify({
      perPage,
      page,
      search: o.search || '',
      categoryId: categoryId ?? '',
    })}`;

    const result = await cached(cacheKey, READ_TTL_MS, async () => {
      const params: Record<string, string | number | boolean | undefined> = {
        per_page: perPage,
        page,
        status: 'publish',
      };
      if (o.search) params.search = o.search;
      if (categoryId) params.category = categoryId;

      const res = await wooGet<WooProduct[]>('products', params);
      return res;
    });

    const raw = Array.isArray(result.data) ? result.data : [];
    // Products are matched by SKU. Anything without an official SKU (one of the
    // 72 codes in the attributes file) is excluded and logged — this also keeps
    // duplicates like "Mizane (Copy)" off the site until they're deleted in Woo.
    let items: CatalogueItem[] = [];
    for (const p of raw) {
      const sku = p.sku && p.sku.trim() ? p.sku.trim() : '';
      if (!isOfficialSku(sku)) {
        // eslint-disable-next-line no-console
        console.warn(
          `[woo] excluding product id=${p.id} name="${p.name || ''}" sku="${p.sku || ''}" — SKU missing or not in the official 72`,
        );
        continue;
      }
      items.push(toCatalogueItem(p));
    }

    // Apply forme/composition (and collection if category id didn't resolve)
    // filters in-memory — Woo attribute filtering is unreliable across stores.
    const memOpts: GetProductsOptions = {
      forme: o.forme,
      composition: o.composition,
    };
    if (o.collection && !categoryId) memOpts.collection = o.collection;
    items = filterCatalogue(items, memOpts);

    return {
      items,
      totalPages: result.totalPages || 1,
      total: result.total || items.length,
      source: 'woo',
    };
  } catch (err) {
    warnFallback(
      `getProducts failed (${err instanceof Error ? err.message : 'unknown'})`,
    );
    const items = filterCatalogue(FALLBACK, o);
    return { items, totalPages: 1, total: items.length, source: 'fallback' };
  }
}

/**
 * Get a single product by SKU (preferred) or numeric id, with its variations
 * when it is a variable product. Falls back to the local item on any failure.
 */
export async function getProduct(idOrSku: string): Promise<{
  item: CatalogueItem;
  woo: WooProduct | null;
  variations: any[];
  source: 'woo' | 'fallback';
  /** true when the resolved Woo product is not one of the official 72 → page should 404 */
  notFound?: boolean;
}> {
  const key = String(idOrSku || '').trim();

  const fallbackItem = (): CatalogueItem => {
    const known = FALLBACK_BY_SKU.get(key.toUpperCase());
    if (known) return known;
    // Synthesise a minimal item so the page still renders.
    return {
      id: key || 'unknown',
      name: key || 'Œuvre',
      name_ar: key || 'عمل',
      col: 0,
      comp: 1,
      forme: 1,
      price: null,
      img: `/assets/products/${key}.webp`,
      images: [`/assets/products/${key}.webp`],
    };
  };

  if (!isWooConfigured()) {
    return { item: fallbackItem(), woo: null, variations: [], source: 'fallback' };
  }

  try {
    const cacheKey = `woo:product:${key}`;
    const found = await cached<WooProduct | null>(
      cacheKey,
      READ_TTL_MS,
      async () => {
        // Resolve by SKU first.
        const bySku = await wooGet<WooProduct[]>('products', {
          sku: key,
          per_page: 1,
        });
        if (Array.isArray(bySku.data) && bySku.data[0]) return bySku.data[0];

        // Else by numeric id.
        if (/^\d+$/.test(key)) {
          const byId = await wooGet<WooProduct>(`products/${key}`);
          if (byId.data && (byId.data as WooProduct).id) return byId.data;
        }
        return null;
      },
    );

    if (!found) {
      warnFallback(`getProduct("${key}") — not found in Woo`);
      return { item: fallbackItem(), woo: null, variations: [], source: 'fallback' };
    }

    // Exclude non-official products (e.g. "Mizane (Copy)") — signal a 404.
    const foundSku = found.sku && found.sku.trim() ? found.sku.trim() : '';
    if (!isOfficialSku(foundSku)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[woo] getProduct("${key}") resolved to non-official product id=${found.id} sku="${found.sku || ''}" — excluding (404)`,
      );
      return { item: fallbackItem(), woo: null, variations: [], source: 'fallback', notFound: true };
    }

    let variations: any[] = [];
    if (found.type === 'variable' && found.id) {
      try {
        const vars = await cached<any[]>(
          `woo:variations:${found.id}`,
          READ_TTL_MS,
          async () => {
            const res = await wooGet<any[]>(`products/${found.id}/variations`, {
              per_page: 100,
            });
            return Array.isArray(res.data) ? res.data : [];
          },
        );
        variations = vars;
      } catch {
        variations = [];
      }
    }

    return {
      item: toCatalogueItem(found),
      woo: found,
      variations,
      source: 'woo',
    };
  } catch (err) {
    warnFallback(
      `getProduct("${key}") failed (${err instanceof Error ? err.message : 'unknown'})`,
    );
    return { item: fallbackItem(), woo: null, variations: [], source: 'fallback' };
  }
}
