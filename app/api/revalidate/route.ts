// On-demand cache invalidation for the headless catalogue.
//
// Call this when a product is created/updated/deleted in WooCommerce so the
// Vercel frontend refreshes immediately — no redeploy, no waiting for the ISR
// window. Secure it with the REVALIDATE_SECRET env var.
//
// Wire it as a WooCommerce webhook (WooCommerce > Settings > Advanced > Webhooks):
//   Topic:        Product created  (add more for updated / deleted)
//   Delivery URL: https://joudart.com/api/revalidate?secret=YOUR_SECRET
//   Method:       POST
//
// Manual trigger (anytime):
//   https://joudart.com/api/revalidate?secret=YOUR_SECRET

import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { clearWooCache } from '@/lib/woo-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LISTING_PATHS = ['/', '/catalogue', '/collection'];

function presentedSecret(req: NextRequest): string {
  return (
    req.nextUrl.searchParams.get('secret') ||
    req.headers.get('x-revalidate-secret') ||
    ''
  );
}

/** Constant-time comparison so the secret can't be guessed from response timing. */
function secretMatches(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(req: NextRequest) {
  // Fail closed: no REVALIDATE_SECRET configured → nobody can trigger it.
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !secretMatches(presentedSecret(req), expected)) {
    return NextResponse.json(
      { revalidated: false, error: 'unauthorized' },
      { status: 401 },
    );
  }

  // Drop the in-memory Woo cache and the shared Data Cache entries (every
  // catalogue fetch is tagged 'woo'), so the next render fetches fresh data —
  // products deleted in Woo disappear from the listings right away.
  clearWooCache();
  revalidateTag('woo');

  const extra = req.nextUrl.searchParams.get('path');
  const paths = extra ? [...LISTING_PATHS, extra] : LISTING_PATHS;
  for (const p of paths) {
    try {
      revalidatePath(p);
    } catch {
      /* ignore individual path failures */
    }
  }
  // Pages are pre-rendered per locale (app/[locale]/…, see middleware.ts):
  // purge the whole tree so every locale + every product page is regenerated.
  try {
    revalidatePath('/', 'layout');
  } catch {
    /* ignore */
  }

  return NextResponse.json({
    revalidated: true,
    cacheCleared: true,
    paths,
    at: new Date().toISOString(),
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
