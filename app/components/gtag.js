'use client';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { useConsent } from './cookie-consent';

/*
 * Google tag (GA4 + Google Ads) — the Google twin of MetaPixel.
 * - Loads gtag.js ONLY after cookie consent ('granted'), exactly like MetaPixel.
 * - Captures the ad click ids (gclid/gbraid/wbraid) into first-party cookies on
 *   load so every COD order can be tied back to the Google click.
 * - Provides safe helpers (no-ops until the tag is loaded) used by the order modal.
 *
 * >>> YOU FILL THESE IN (Vercel env or hardcode). No tag fires while empty. <<<
 *   NEXT_PUBLIC_GA4_ID        = "G-XXXXXXXXXX"            (GA4 Measurement ID)
 *   NEXT_PUBLIC_GADS_ID       = "AW-XXXXXXXXXX"           (Google Ads conversion ID)
 *   NEXT_PUBLIC_GADS_ORDER_SENDTO = "AW-XXXXXXXXXX/aBcDeFg..."  (conversion "Commande passée")
 *   NEXT_PUBLIC_GADS_WA_SENDTO    = "AW-XXXXXXXXXX/hIjKlMn..."  (conversion "Clic WhatsApp")
 */
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;
const ADS_ID = process.env.NEXT_PUBLIC_GADS_ID;
const SENDTO_ORDER = process.env.NEXT_PUBLIC_GADS_ORDER_SENDTO; // "AW-…/label"
const SENDTO_WA = process.env.NEXT_PUBLIC_GADS_WA_SENDTO;       // "AW-…/label"

const CLICK_IDS = ['gclid', 'gbraid', 'wbraid'];

/** Read ad click ids from the URL and persist them as first-party cookies (90 days). */
export function captureClickIds() {
  if (typeof window === 'undefined') return;
  try {
    const p = new URLSearchParams(window.location.search);
    CLICK_IDS.forEach((k) => {
      const v = p.get(k);
      if (v) {
        document.cookie = `joud_${k}=${encodeURIComponent(v)}; path=/; max-age=7776000; samesite=lax`;
      }
    });
  } catch (e) {}
}

/** Read a stored click-id cookie (joud_gclid…), or null. */
export function getClickId(k = 'gclid') {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )joud_' + k + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

/** Safe gtag('event', …) — no-op until the tag is loaded (i.e. before consent). */
export function gtagEvent(name, params = {}) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', name, params);
    }
  } catch (e) {}
}

/* ---- Enhanced Conversions for Leads: SHA-256 of normalized identifiers ---- */
function normalizePhoneMA(raw) {
  let d = String(raw || '').replace(/[^\d+]/g, '').replace(/^00/, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('212')) {
    /* already country-coded */
  } else if (d.startsWith('0')) {
    d = '212' + d.slice(1);
  } else if (d.length === 9) {
    d = '212' + d;
  }
  return d ? '+' + d : '';
}
async function sha256Hex(s) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return '';
  }
}

/**
 * "Commande passée" — fires the Google Ads conversion + GA4 purchase, and sets
 * Enhanced Conversions user_data (hashed phone/email) just before, when available.
 * No-op if consent not granted / IDs not filled.
 */
export async function trackOrderPlaced({ value, currency = 'MAD', orderId, phone, email } = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  // Enhanced Conversions for Leads (helps match the WhatsApp/COD close to the click).
  const userData = {};
  if (phone) {
    const e164 = normalizePhoneMA(phone);
    if (e164) userData.sha256_phone_number = await sha256Hex(e164);
  }
  if (email) {
    const norm = String(email).trim().toLowerCase();
    if (norm) userData.sha256_email_address = await sha256Hex(norm);
  }
  if (Object.keys(userData).length) {
    try { window.gtag('set', 'user_data', userData); } catch (e) {}
  }
  const tx = orderId != null ? String(orderId) : undefined;
  // Google Ads conversion "Commande passée".
  if (SENDTO_ORDER) {
    gtagEvent('conversion', {
      send_to: SENDTO_ORDER,
      value: typeof value === 'number' ? value : undefined,
      currency,
      transaction_id: tx,
    });
  }
  // GA4 purchase (analytics).
  gtagEvent('purchase', {
    value: typeof value === 'number' ? value : undefined,
    currency,
    transaction_id: tx,
  });
}

/** "Clic WhatsApp" — secondary conversion + GA4 lead. Wired globally below. */
export function trackWhatsAppClick() {
  if (SENDTO_WA) gtagEvent('conversion', { send_to: SENDTO_WA });
  gtagEvent('generate_lead', { currency: 'MAD' });
}

export function GoogleTag() {
  const { consent } = useConsent();
  const [enabled, setEnabled] = useState(false);

  // 1) Capture click ids on first load (first-party cookie only — no Google script).
  useEffect(() => { captureClickIds(); }, []);

  // 2) Enable the Google tag only once cookies are accepted (same gate as MetaPixel).
  useEffect(() => {
    if (consent === 'granted') setEnabled(true);
    const onConsent = (e) => { if (e && e.detail === 'granted') setEnabled(true); };
    window.addEventListener('joud-consent', onConsent);
    return () => window.removeEventListener('joud-consent', onConsent);
  }, [consent]);

  // 3) Once enabled, track every WhatsApp link click sitewide via one delegated listener.
  useEffect(() => {
    if (!enabled) return;
    const onClick = (e) => {
      const a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (/wa\.me|api\.whatsapp\.com|whatsapp:\/\//i.test(href)) trackWhatsAppClick();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [enabled]);

  if (!enabled) return null;
  if (!GA4_ID && !ADS_ID) return null; // nothing configured yet → safe no-op

  const primary = GA4_ID || ADS_ID;
  return (
    <>
      <Script id="ga-lib" strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${primary}`} />
      <Script
        id="ga-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
${GA4_ID ? `gtag('config', '${GA4_ID}');` : ''}
${ADS_ID ? `gtag('config', '${ADS_ID}', { 'allow_enhanced_conversions': true });` : ''}
`,
        }}
      />
    </>
  );
}
