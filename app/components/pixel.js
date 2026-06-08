'use client';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { useConsent } from './cookie-consent';

const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

/**
 * Meta (Facebook) Pixel — only loads after the visitor accepts cookies, and
 * only if NEXT_PUBLIC_FB_PIXEL_ID is set. No-op otherwise, so it's safe to ship
 * before you have a Pixel ID.
 */
export function MetaPixel() {
  const { consent } = useConsent();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (consent === 'granted') setEnabled(true);
    const onConsent = (e) => { if (e && e.detail === 'granted') setEnabled(true); };
    window.addEventListener('joud-consent', onConsent);
    return () => window.removeEventListener('joud-consent', onConsent);
  }, [consent]);

  if (!PIXEL_ID || !enabled) return null;

  return (
    <Script
      id="meta-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');
`,
      }}
    />
  );
}

/**
 * Fire a Pixel event from the client (no-op if the pixel isn't loaded / no consent).
 * Pass an eventId to deduplicate with the server-side Conversions API event.
 */
export function fbTrack(event, params = {}, eventId) {
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', event, params, eventId ? { eventID: eventId } : undefined);
    }
  } catch (e) {}
}

/** A simple unique id for Pixel<->CAPI event de-duplication. */
export function makeEventId(prefix = 'evt') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
