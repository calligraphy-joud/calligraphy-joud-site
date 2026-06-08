// server-only
// Best-effort fallback helpers for order capture when WooCommerce is
// unconfigured or unreachable. Every function here is defensive: it NEVER
// throws — it logs and returns a boolean (or a string) so the route handler
// can keep responding 200 (the order is still captured for the merchant).
//
// IMPORTANT: this module reads server-only env vars (no NEXT_PUBLIC_ prefix)
// and must NOT be imported into any client bundle.

/** The normalised order payload the route hands to the fallbacks. */
export interface OrderPayload {
  sku?: string;
  variationId?: number;
  productName?: string;
  options?: { composition?: string; forme?: string; dimensions?: string };
  total?: number | string;
  name: string;
  phone?: string;
  ville: string;
  message?: string;
  photoUrl?: string;
  lang?: 'fr' | 'en' | 'ar';
}

const DEFAULT_WA_NUMBER = '212600000000'; // mirrors WA_NUMBER in app/components/order.js

/** Resolve the WhatsApp number from env, falling back to the site default. */
export function getWaNumber(): string {
  return (process.env.WA_NUMBER || DEFAULT_WA_NUMBER).replace(/[^\d]/g, '') || DEFAULT_WA_NUMBER;
}

// ---------------------------------------------------------------------------
// Localisation (mirror of the strings app/components/order.js builds)
// ---------------------------------------------------------------------------

type Lang = 'fr' | 'en' | 'ar';

function L(lang: Lang | undefined): Lang {
  return lang === 'ar' || lang === 'en' ? lang : 'fr';
}

const STR: Record<Lang, Record<string, string>> = {
  fr: {
    intro: 'Bonjour Calligraphy JOUD, ',
    wantOrder: 'je souhaite commander :',
    wantCommission: 'je souhaite une commande personnalisée.',
    piece: 'Œuvre',
    compo: 'Composition',
    forme: 'Forme',
    dim: 'Dimensions',
    total: 'Total',
    name: 'Nom',
    city: 'Ville',
    phone: 'Téléphone',
    message: 'Message',
    photo: 'Photo',
    sep: ' : ',
  },
  en: {
    intro: 'Hello Calligraphy JOUD, ',
    wantOrder: 'I would like to order:',
    wantCommission: 'I would like to request a custom commission.',
    piece: 'Piece',
    compo: 'Composition',
    forme: 'Shape',
    dim: 'Dimensions',
    total: 'Total',
    name: 'Name',
    city: 'City',
    phone: 'Phone',
    message: 'Message',
    photo: 'Photo',
    sep: ': ',
  },
  ar: {
    intro: 'مرحباً Calligraphy JOUD، ',
    wantOrder: 'أودّ طلب:',
    wantCommission: 'أودّ طلب عمل مخصّص.',
    piece: 'العمل',
    compo: 'التكوين',
    forme: 'الشكل',
    dim: 'الأبعاد',
    total: 'المجموع',
    name: 'الاسم',
    city: 'المدينة',
    phone: 'الهاتف',
    message: 'رسالة',
    photo: 'صورة',
    sep: ': ',
  },
};

/**
 * Build the localised order-summary text (same shape order.js produces). Pure;
 * returns the decoded message string (NOT URL-encoded).
 */
export function buildWaText(payload: OrderPayload, lang?: Lang): string {
  const l = L(lang ?? payload.lang);
  const s = STR[l];
  const sep = s.sep;
  const isCommission = !payload.sku && !payload.productName;

  const lines: string[] = [s.intro + (isCommission ? s.wantCommission : s.wantOrder)];

  if (!isCommission) {
    lines.push('');
    const pieceName = payload.productName || payload.sku || '';
    lines.push('• ' + s.piece + sep + pieceName + (payload.sku ? ' (' + payload.sku + ')' : ''));
    const o = payload.options || {};
    if (o.composition) lines.push('• ' + s.compo + sep + o.composition);
    if (o.forme) lines.push('• ' + s.forme + sep + o.forme);
    if (o.dimensions) lines.push('• ' + s.dim + sep + o.dimensions);
    if (payload.total !== undefined && payload.total !== null && String(payload.total).trim()) {
      lines.push('• ' + s.total + sep + String(payload.total));
    }
  }

  lines.push('');
  if (payload.name && payload.name.trim()) lines.push(s.name + sep + payload.name.trim());
  if (payload.ville && payload.ville.trim()) lines.push(s.city + sep + payload.ville.trim());
  if (payload.phone && payload.phone.trim()) lines.push(s.phone + sep + payload.phone.trim());
  if (payload.message && payload.message.trim()) lines.push(s.message + sep + payload.message.trim());
  if (payload.photoUrl && payload.photoUrl.trim()) lines.push(s.photo + sep + payload.photoUrl.trim());

  return lines.join('\n');
}

/** Build a fully-formed wa.me URL (encoded) for the merchant fallback. */
export function buildWaUrl(payload: OrderPayload, lang?: Lang): string {
  const text = buildWaText(payload, lang ?? payload.lang);
  return `https://wa.me/${getWaNumber()}?text=${encodeURIComponent(text)}`;
}

// ---------------------------------------------------------------------------
// Google Sheet (Apps Script web app) fallback
// ---------------------------------------------------------------------------

/**
 * POST the full order JSON (plus a timestamp) to ORDERS_FALLBACK_SHEET_URL.
 * Returns true on a 2xx response, false otherwise. Never throws.
 */
export async function postToSheet(payload: OrderPayload): Promise<boolean> {
  const url = process.env.ORDERS_FALLBACK_SHEET_URL;
  if (!url) return false;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    let ok = false;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, timestamp: new Date().toISOString() }),
        signal: controller.signal,
        cache: 'no-store',
      });
      ok = res.ok;
    } finally {
      clearTimeout(timer);
    }
    if (!ok) {
      // eslint-disable-next-line no-console
      console.error('[orders] postToSheet: non-2xx response');
    }
    return ok;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      '[orders] postToSheet failed:',
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

// ---------------------------------------------------------------------------
// Resend email fallback
// ---------------------------------------------------------------------------

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildEmailHtml(payload: OrderPayload): string {
  const o = payload.options || {};
  const rows: Array<[string, unknown]> = [
    ['Nom', payload.name],
    ['Ville', payload.ville],
    ['Téléphone', payload.phone],
    ['SKU', payload.sku],
    ['Produit', payload.productName],
    ['Variation', payload.variationId],
    ['Composition', o.composition],
    ['Forme', o.forme],
    ['Dimensions', o.dimensions],
    ['Total', payload.total],
    ['Message', payload.message],
    ['Photo', payload.photoUrl],
    ['Langue', payload.lang],
  ];
  const trs = rows
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px;font-weight:600;border-bottom:1px solid #eee;">${esc(
          k,
        )}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${esc(v)}</td></tr>`,
    )
    .join('');
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
    <h2 style="margin:0 0 12px;">Nouvelle commande — ${esc(payload.name)}</h2>
    <table style="border-collapse:collapse;width:100%;max-width:560px;">${trs}</table>
    <p style="margin-top:16px;color:#888;font-size:12px;">Calligraphy JOUD — site web</p>
  </div>`;
}

/**
 * Send an order-notification email via the Resend REST API (no npm dep).
 * Returns true on a 2xx response, false otherwise. Never throws.
 */
export async function sendOrderEmail(payload: OrderPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ORDER_NOTIFY_EMAIL;
  if (!apiKey || !to) return false;

  const from = process.env.ORDER_FROM_EMAIL || 'orders@calligraphyjoud.com';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    let ok = false;
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: `Nouvelle commande — ${payload.name}`,
          html: buildEmailHtml(payload),
        }),
        signal: controller.signal,
        cache: 'no-store',
      });
      ok = res.ok;
      if (!ok) {
        // eslint-disable-next-line no-console
        console.error('[orders] sendOrderEmail: Resend non-2xx', res.status);
      }
    } finally {
      clearTimeout(timer);
    }
    return ok;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      '[orders] sendOrderEmail failed:',
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}
