// CLIENT-SAFE order helper.
//
// This file runs in the browser. It must NOT import '@/lib/woo', must NOT touch
// process.env, and must NOT read any server secret. It only POSTs to the
// /api/orders route and builds a local WhatsApp link for the failure path.

import { WHATSAPP_NUMBER } from './whatsapp';

export interface ClientOrderPayload {
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

export interface SubmitOrderResult {
  ok: boolean;
  source: string; // 'woo' | 'fallback' | 'network' | 'error'
  orderId?: number;
  waUrl?: string;
  savedToSheet?: boolean;
  emailed?: boolean;
  reason?: string;
  error?: string;
}

// WhatsApp number — single source of truth: ./whatsapp (WHATSAPP_NUMBER)

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
 * Build a wa.me URL on the client (no server roundtrip). Mirrors the summary
 * shape the modal + server fallback use. `waNumber` defaults to the site value.
 */
export function buildClientWaUrl(
  payload: ClientOrderPayload,
  lang?: Lang,
  waNumber?: string,
): string {
  const l = L(lang ?? payload.lang);
  const s = STR[l];
  const sep = s.sep;
  const num = (waNumber || WHATSAPP_NUMBER).replace(/[^\d]/g, '') || WHATSAPP_NUMBER;
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
      lines.push('• ' + s.total + sep + String(payload.total) + ' MAD');
    }
  }

  lines.push('');
  if (payload.name && payload.name.trim()) lines.push(s.name + sep + payload.name.trim());
  if (payload.ville && payload.ville.trim()) lines.push(s.city + sep + payload.ville.trim());
  if (payload.phone && payload.phone.trim()) lines.push(s.phone + sep + payload.phone.trim());
  if (payload.message && payload.message.trim()) lines.push(s.message + sep + payload.message.trim());
  if (payload.photoUrl && payload.photoUrl.trim()) lines.push(s.photo + sep + payload.photoUrl.trim());

  return `https://wa.me/${num}?text=${encodeURIComponent(lines.join('\n'))}`;
}

/**
 * Submit an order to /api/orders. Always resolves (never throws). On a network
 * error it returns { ok:false, source:'network', waUrl } with a locally-built
 * WhatsApp link so the caller can still route the customer to WhatsApp.
 */
export async function submitOrder(
  payload: ClientOrderPayload,
): Promise<SubmitOrderResult> {
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    if (json && typeof json === 'object') {
      // Ensure a waUrl is always available to the caller.
      if (!json.waUrl) {
        json.waUrl = buildClientWaUrl(payload, payload.lang);
      }
      return json as SubmitOrderResult;
    }

    // Non-JSON / unexpected response → behave like a network failure.
    return {
      ok: false,
      source: 'network',
      waUrl: buildClientWaUrl(payload, payload.lang),
      reason: `bad_response_${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      source: 'network',
      waUrl: buildClientWaUrl(payload, payload.lang),
      reason: err instanceof Error ? err.message : 'network_error',
    };
  }
}
