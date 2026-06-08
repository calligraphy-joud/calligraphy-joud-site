// Admin live-orders route handler — GET + PATCH /api/admin/orders
//
// GET   : list WooCommerce orders, normalised for the admin board.
// PATCH : move an order to a pipeline stage (writes back to Woo).
//
// Server-only: imports @/lib/woo (which reads secret env vars). NEVER bundled to
// the client — the admin client component talks to THIS api, never to woo.ts.
//
// SECURITY: this endpoint is currently UNAUTHENTICATED. It exposes order data
// and lets callers mutate order status. It MUST be protected before production
// (basic auth, the existing management-app login, or a middleware gate). See
// app/admin/page.tsx for the matching note.

import { NextRequest, NextResponse } from 'next/server';
import { isWooConfigured, wooGet, wooPut, WooError } from '@/lib/woo';
import {
  STAGES,
  isStage,
  wooToStage,
  stageToWooUpdate,
  type Stage,
} from '@/lib/order-status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WooLineItem {
  name?: string;
  sku?: string;
  quantity?: number;
  meta_data?: Array<{ key?: string; display_key?: string; value?: unknown; display_value?: unknown }>;
}

interface WooOrder {
  id: number;
  number?: string;
  status?: string;
  date_created?: string;
  date_created_gmt?: string;
  total?: string;
  currency?: string;
  customer_note?: string;
  billing?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    city?: string;
  };
  line_items?: WooLineItem[];
  meta_data?: Array<{ key?: string; value?: unknown }>;
}

interface NormalizedItem {
  name: string;
  sku: string;
  qty: number;
  options: Array<{ label: string; value: string }>;
}

interface NormalizedOrder {
  id: number;
  number: string;
  date: string;
  stage: Stage;
  wooStatus: string;
  total: string;
  currency: string;
  customer: { name: string; phone: string; city: string };
  items: NormalizedItem[];
  note: string;
  photoUrl: string;
  waNumber: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PER_PAGE = 50;

/** Pull a string-ish value from an order's meta_data by key. */
function readMeta(order: WooOrder, key: string): string {
  if (!Array.isArray(order.meta_data)) return '';
  const found = order.meta_data.find((m) => m && m.key === key);
  if (!found || found.value === undefined || found.value === null) return '';
  return String(found.value);
}

/** Reduce a phone string to its dialable digits for wa.me / tel:. */
function waDigits(phone: string | undefined): string {
  if (!phone) return '';
  // Keep digits only; a leading '+' is already implied by the country code.
  return phone.replace(/[^\d]/g, '');
}

/** Turn Woo line-item meta into a clean list of chosen options. */
function lineOptions(item: WooLineItem): Array<{ label: string; value: string }> {
  if (!Array.isArray(item.meta_data)) return [];
  const out: Array<{ label: string; value: string }> = [];
  for (const m of item.meta_data) {
    if (!m) continue;
    const rawKey = String(m.display_key ?? m.key ?? '').trim();
    // Skip Woo's internal underscore-prefixed meta.
    if (!rawKey || rawKey.startsWith('_')) continue;
    const rawVal = m.display_value ?? m.value;
    if (rawVal === undefined || rawVal === null) continue;
    const value = String(rawVal).trim();
    if (!value) continue;
    out.push({ label: rawKey, value });
  }
  return out;
}

/** Normalise a Woo order into the shape the admin board consumes. */
function normalize(order: WooOrder): NormalizedOrder {
  const b = order.billing || {};
  const name = `${b.first_name || ''} ${b.last_name || ''}`.trim();
  const phone = b.phone || '';

  const items: NormalizedItem[] = Array.isArray(order.line_items)
    ? order.line_items.map((li) => ({
        name: li.name || '',
        sku: li.sku || '',
        qty: typeof li.quantity === 'number' ? li.quantity : 1,
        options: lineOptions(li),
      }))
    : [];

  return {
    id: order.id,
    number: order.number ? String(order.number) : String(order.id),
    date: order.date_created || order.date_created_gmt || '',
    stage: wooToStage(order),
    wooStatus: order.status || '',
    total: order.total ? String(order.total) : '',
    currency: order.currency || 'MAD',
    customer: {
      name,
      phone,
      city: b.city || '',
    },
    items,
    note: order.customer_note || '',
    photoUrl: readMeta(order, '_joud_photo_url'),
    waNumber: waDigits(phone),
  };
}

// ---------------------------------------------------------------------------
// GET — list orders
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  if (!isWooConfigured()) {
    return NextResponse.json(
      { ok: false, source: 'unconfigured', orders: [], totalPages: 0, total: 0 },
      { status: 200 },
    );
  }

  const { searchParams } = new URL(req.url);
  const pageRaw = Number(searchParams.get('page'));
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  const stageParam = searchParams.get('stage');
  const stageFilter: Stage | null = isStage(stageParam) ? stageParam : null;

  try {
    const res = await wooGet<WooOrder[]>('orders', {
      per_page: PER_PAGE,
      page,
      status: 'any',
      orderby: 'date',
      order: 'desc',
    });

    const raw = Array.isArray(res.data) ? res.data : [];
    let orders = raw.map(normalize);

    // Optional in-memory stage filter (Woo has no notion of our pipeline).
    if (stageFilter) {
      orders = orders.filter((o) => o.stage === stageFilter);
    }

    return NextResponse.json(
      {
        ok: true,
        source: 'woo',
        orders,
        totalPages: res.totalPages || 1,
        total: res.total || orders.length,
      },
      { status: 200 },
    );
  } catch (err) {
    const status = err instanceof WooError && err.status ? err.status : 502;
    return NextResponse.json(
      {
        ok: false,
        source: 'woo',
        orders: [],
        totalPages: 0,
        total: 0,
        error: 'Impossible de charger les commandes depuis WooCommerce.',
      },
      { status: status >= 400 && status < 600 ? 502 : 502 },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH — move an order to a pipeline stage
// ---------------------------------------------------------------------------

async function updateStage(req: NextRequest) {
  if (!isWooConfigured()) {
    return NextResponse.json(
      { ok: false, source: 'unconfigured', error: 'WooCommerce non configuré.' },
      { status: 200 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Corps JSON invalide.' },
      { status: 400 },
    );
  }

  const id = Number(body?.id);
  const stage = body?.stage;

  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json(
      { ok: false, error: 'Identifiant de commande invalide.' },
      { status: 400 },
    );
  }
  if (!isStage(stage)) {
    return NextResponse.json(
      { ok: false, error: `Étape invalide. Valeurs autorisées : ${STAGES.join(', ')}.` },
      { status: 400 },
    );
  }

  const update = stageToWooUpdate(stage);

  try {
    const updated = await wooPut<WooOrder>(`orders/${id}`, update);
    const wooStatus = updated && updated.status ? updated.status : update.status || '';
    // Re-derive the stage from Woo's response so the client trusts the source of
    // truth (e.g. if a custom 'en-production' status was rejected → 'processing'
    // but our meta flag still classifies it as En production).
    const confirmedStage = updated ? wooToStage(updated) : stage;

    return NextResponse.json(
      { ok: true, id, stage: confirmedStage, wooStatus },
      { status: 200 },
    );
  } catch (err) {
    const message =
      err instanceof WooError
        ? `Échec de la mise à jour WooCommerce (${err.status ?? err.code ?? 'erreur'}).`
        : 'Échec de la mise à jour WooCommerce.';
    return NextResponse.json({ ok: false, id, error: message }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest) {
  return updateStage(req);
}

// Allow PUT as an alias for clients/proxies that don't support PATCH.
export async function PUT(req: NextRequest) {
  return updateStage(req);
}
