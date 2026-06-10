// SINGLE SOURCE OF TRUTH for the Calligraphy JOUD WhatsApp Business number.
//
// Override at deploy time with the env var NEXT_PUBLIC_WHATSAPP_NUMBER
// (NEXT_PUBLIC_ is required so the value is available in the browser bundle,
// since the order modal builds the wa.me link client-side).
//
// The constant below is the ONLY hardcoded number in the codebase — every
// usage point (order modal, client link builder, server fallback, contact CTA,
// API order message) imports WHATSAPP_NUMBER from here. Do not hardcode the
// number anywhere else.
//
// This module is client-safe: it reads only a NEXT_PUBLIC_ value (inlined at
// build time) and imports nothing server-only.

const FALLBACK_NUMBER = '212630690524';

/** Digits-only E.164-style number (no '+'), ready for https://wa.me/<number>. */
export const WHATSAPP_NUMBER: string =
  (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || FALLBACK_NUMBER).replace(/[^\d]/g, '') ||
  FALLBACK_NUMBER;

/** Build an encoded wa.me link to the business number from a message string. */
export function waLink(text: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
