// Meta Conversions API (server-side events) — complements the browser Pixel.
// No-op unless FB_PIXEL_ID (or NEXT_PUBLIC_FB_PIXEL_ID) and FB_CAPI_TOKEN are set,
// so it's safe to ship before you have credentials. Server-only.

const PIXEL = process.env.FB_PIXEL_ID || process.env.NEXT_PUBLIC_FB_PIXEL_ID || '';
const TOKEN = process.env.FB_CAPI_TOKEN || '';
const VERSION = 'v19.0';

export function isCapiConfigured(): boolean {
  return Boolean(PIXEL && TOKEN);
}

export interface CapiOptions {
  eventId?: string;
  value?: number;
  currency?: string;
  contentIds?: string[];
  contentType?: string;
  sourceUrl?: string;
  clientIp?: string;
  userAgent?: string;
}

/** Send one server-side event to the Meta Conversions API. Best-effort; never throws. */
export async function sendCapiEvent(eventName: string, opts: CapiOptions = {}): Promise<boolean> {
  if (!isCapiConfigured()) return false;
  const {
    eventId,
    value,
    currency = 'MAD',
    contentIds,
    contentType = 'product',
    sourceUrl,
    clientIp,
    userAgent,
  } = opts;

  const body = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        ...(eventId ? { event_id: eventId } : {}),
        ...(sourceUrl ? { event_source_url: sourceUrl } : {}),
        user_data: {
          ...(clientIp ? { client_ip_address: clientIp } : {}),
          ...(userAgent ? { client_user_agent: userAgent } : {}),
        },
        custom_data: {
          currency,
          ...(value != null ? { value } : {}),
          ...(contentIds && contentIds.length ? { content_ids: contentIds, content_type: contentType } : {}),
        },
      },
    ],
  };

  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(
      `https://graph.facebook.com/${VERSION}/${PIXEL}/events?access_token=${encodeURIComponent(TOKEN)}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal },
    );
    clearTimeout(to);
    if (!r.ok) {
      console.warn(`[capi] event ${eventName} → ${r.status}`);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn(`[capi] event ${eventName} failed: ${e?.message || e}`);
    return false;
  }
}
