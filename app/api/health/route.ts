import { NextResponse } from 'next/server';
import { isWooConfigured, wooGet, WooError } from '@/lib/woo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/health
 * Pings WooCommerce and reports the connection status so you can verify
 * the live link any time. Never throws; never exposes credentials.
 */
export async function GET() {
  const startedAt = Date.now();

  if (!isWooConfigured()) {
    console.warn('[health] WooCommerce is not configured (missing WOO_STORE_URL / WOO_CONSUMER_KEY / WOO_CONSUMER_SECRET).');
    return NextResponse.json(
      {
        ok: false,
        woo: 'unconfigured',
        message:
          'Set WOO_STORE_URL, WOO_CONSUMER_KEY and WOO_CONSUMER_SECRET in .env.local, then restart the server.',
        checkedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  }

  try {
    // Lightest possible authenticated read: a single product.
    const res = await wooGet('products', { per_page: 1 });
    const latencyMs = Date.now() - startedAt;
    return NextResponse.json(
      {
        ok: true,
        woo: 'reachable',
        latencyMs,
        productsVisible: res.total,
        checkedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const status = err instanceof WooError ? err.status : undefined;
    const reason =
      status === 401 || status === 403
        ? 'auth_failed'
        : status && status >= 500
        ? 'store_error'
        : 'unreachable';
    console.error(
      `[health] WooCommerce check FAILED (${reason}${status ? ', HTTP ' + status : ''}) after ${latencyMs}ms:`,
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      {
        ok: false,
        woo: reason,
        httpStatus: status,
        latencyMs,
        message:
          reason === 'auth_failed'
            ? 'WooCommerce rejected the API keys. Re-check WOO_CONSUMER_KEY/SECRET and that the key has Read/Write access.'
            : reason === 'store_error'
            ? 'The store responded with an error. Check the WooCommerce/WordPress logs on Hostinger.'
            : 'Could not reach the store. Check WOO_STORE_URL, that the site is up, and that permalinks are set to "Post name".',
        checkedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
