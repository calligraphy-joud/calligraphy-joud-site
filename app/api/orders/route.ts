// Orders WRITE route handler — POST /api/orders
//
// Creates a WooCommerce order (COD) when Woo is configured/reachable; otherwise
// captures the order via a best-effort fallback chain (Google Sheet, Resend
// email, WhatsApp link) and STILL returns 200 so the order is never lost.
//
// Server-only: imports @/lib/woo (which reads secret env vars). Never bundle to
// the client.

import { NextRequest, NextResponse } from 'next/server';
import { isWooConfigured, wooPost, getProduct, WooError } from '@/lib/woo';
import { sendCapiEvent } from '@/lib/capi';
import {
  postToSheet,
  sendOrderEmail,
  buildWaUrl,
  type OrderPayload,
} from '@/lib/order-fallback';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function splitName(full: string): { first_name: string; last_name: string } {
  const trimmed = (full || '').trim();
  const idx = trimmed.indexOf(' ');
  if (idx === -1) return { first_name: trimmed, last_name: '' };
  return {
    first_name: trimmed.slice(0, idx),
    last_name: trimmed.slice(idx + 1).trim(),
  };
}

interface MetaKV {
  key: string;
  value: string;
}

function metaList(entries: Array<[string, unknown]>): MetaKV[] {
  return entries
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([key, value]) => ({ key, value: String(value) }));
}

/** Run the fallback chain. Best-effort; never throws. */
async function runFallback(
  payload: OrderPayload,
  reason: 'woo_unreachable' | 'woo_unconfigured' | string,
): Promise<NextResponse> {
  // eslint-disable-next-line no-console
  console.error(`[orders] Woo failed, used fallback: ${reason}`);

  let savedToSheet = false;
  let emailed = false;

  try {
    savedToSheet = await postToSheet(payload);
  } catch {
    savedToSheet = false;
  }
  try {
    emailed = await sendOrderEmail(payload);
  } catch {
    emailed = false;
  }

  let waUrl = '';
  try {
    waUrl = buildWaUrl(payload, payload.lang);
  } catch {
    waUrl = '';
  }

  return NextResponse.json(
    {
      ok: false,
      source: 'fallback',
      savedToSheet,
      emailed,
      waUrl,
      reason,
    },
    { status: 200 },
  );
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // Parse body defensively.
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, source: 'error', error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const payload: OrderPayload = {
    sku: typeof body?.sku === 'string' ? body.sku : undefined,
    variationId:
      typeof body?.variationId === 'number' && body.variationId > 0
        ? body.variationId
        : undefined,
    productName: typeof body?.productName === 'string' ? body.productName : undefined,
    options:
      body?.options && typeof body.options === 'object'
        ? {
            composition:
              typeof body.options.composition === 'string'
                ? body.options.composition
                : undefined,
            forme:
              typeof body.options.forme === 'string' ? body.options.forme : undefined,
            dimensions:
              typeof body.options.dimensions === 'string'
                ? body.options.dimensions
                : undefined,
          }
        : undefined,
    total:
      typeof body?.total === 'number' || typeof body?.total === 'string'
        ? body.total
        : undefined,
    name: typeof body?.name === 'string' ? body.name : '',
    phone: typeof body?.phone === 'string' ? body.phone : undefined,
    ville: typeof body?.ville === 'string' ? body.ville : '',
    message: typeof body?.message === 'string' ? body.message : undefined,
    photoUrl: typeof body?.photoUrl === 'string' ? body.photoUrl : undefined,
    lang:
      body?.lang === 'fr' || body?.lang === 'en' || body?.lang === 'ar'
        ? body.lang
        : undefined,
  };

  // --- Validation: name + ville required ---
  const missing: string[] = [];
  if (!payload.name || !payload.name.trim()) missing.push('name');
  if (!payload.ville || !payload.ville.trim()) missing.push('ville');
  if (missing.length) {
    return NextResponse.json(
      {
        ok: false,
        source: 'error',
        error: `Missing required field(s): ${missing.join(', ')}`,
        missing,
      },
      { status: 400 },
    );
  }

  // --- Woo unconfigured → straight to fallback ---
  if (!isWooConfigured()) {
    return runFallback(payload, 'woo_unconfigured');
  }

  // --- Woo path ---
  try {
    // Resolve the product to get the numeric Woo product id from the SKU, and
    // (when not explicitly provided) the exact size variation so the order
    // always carries the correct per-size price.
    const wantedDim = payload.options?.dimensions;
    let productId: number | undefined;
    let variationId: number | undefined = payload.variationId;
    if (payload.sku) {
      try {
        const resolved = await getProduct(payload.sku);
        if (resolved.woo && resolved.woo.id) productId = resolved.woo.id;
        if (!variationId && wantedDim && Array.isArray(resolved.variations)) {
          const norm = (s: unknown) =>
            String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
          const target = norm(wantedDim);
          const match = resolved.variations.find(
            (v: any) =>
              Array.isArray(v?.attributes) &&
              v.attributes.some((a: any) => norm(a?.option) === target),
          );
          if (match && match.id) variationId = match.id;
        }
      } catch {
        productId = undefined;
      }
    }

    const { first_name, last_name } = splitName(payload.name);
    const o = payload.options || {};

    const lineItemMeta = metaList([
      ['Composition', o.composition],
      ['Forme', o.forme],
      ['Dimensions', o.dimensions],
    ]);

    const lineItem: Record<string, unknown> = {
      quantity: 1,
    };
    if (productId) lineItem.product_id = productId;
    if (variationId) lineItem.variation_id = variationId;
    if (lineItemMeta.length) lineItem.meta_data = lineItemMeta;

    const orderMeta = metaList([
      ['_joud_sku', payload.sku],
      ['_joud_photo_url', payload.photoUrl],
      ['_joud_source', 'website'],
      ['_joud_lang', payload.lang],
      ['_joud_product_name', payload.productName],
      ['_joud_total_display', payload.total],
    ]);

    const wooOrder: Record<string, unknown> = {
      payment_method: 'cod',
      payment_method_title: 'Paiement à la livraison',
      set_paid: false,
      status: 'processing',
      billing: {
        first_name,
        last_name,
        phone: payload.phone || '',
        city: payload.ville,
      },
      line_items: [lineItem],
      meta_data: orderMeta,
    };
    if (payload.message && payload.message.trim()) {
      wooOrder.customer_note = payload.message.trim();
    }

    const created = await wooPost<{ id: number; status?: string }>('orders', wooOrder);

    if (!created || !created.id) {
      // Treat a missing id as an unreachable/invalid Woo response → fallback.
      return runFallback(payload, 'woo_unreachable');
    }

    // eslint-disable-next-line no-console
    console.log(`[orders] Woo order #${created.id} created`);

    // Server-side Meta Conversions API (deduplicated with the browser Pixel via eventId).
    try {
      const eventId = typeof body?.eventId === 'string' ? body.eventId : undefined;
      const numericTotal =
        typeof payload.total === 'number'
          ? payload.total
          : typeof payload.total === 'string'
          ? Number(payload.total.replace(/[^\d.]/g, '')) || undefined
          : undefined;
      await sendCapiEvent('Purchase', {
        eventId,
        value: numericTotal,
        currency: 'MAD',
        contentIds: payload.sku ? [payload.sku] : undefined,
        clientIp: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      });
    } catch {}

    return NextResponse.json(
      {
        ok: true,
        source: 'woo',
        orderId: created.id,
        status: created.status || 'processing',
      },
      { status: 200 },
    );
  } catch (err) {
    const reason =
      err instanceof WooError
        ? `woo_unreachable (${err.status ?? err.code ?? err.message})`
        : 'woo_unreachable';
    return runFallback(payload, reason);
  }
}
