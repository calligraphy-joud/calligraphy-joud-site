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

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
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

async function handle(req: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || presentedSecret(req) !== expected) {
    return NextResponse.json(
      { revalidated: false, error: 'unauthorized' },
      { status: 401 },
    );
  }

  // Drop the in-memory Woo cache so the next render fetches fresh data.
  clearWooCache();

  const extra = req.nextUrl.searchParams.get('path');
  const paths = extra ? [...LISTING_PATHS, extra] : LISTING_PATHS;
  for (const p of paths) {
    try {
      revalidatePath(p);
    } catch {
      /* ignore individual path failures */
    }
  }
  // Refresh every product detail page too.
  try {
    revalidatePath('/produit/[sku]', 'page');
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
