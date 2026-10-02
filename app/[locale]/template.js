'use client';
// template.js re-mounts on every navigation, so a CSS mount animation here
// gives a subtle 200ms page fade. Gated by prefers-reduced-motion in globals.css.
//
// Not on the very first page load: there the fade would start the whole page
// (hero/LCP included) at opacity 0 and only delay first paint. The module flag
// flips after the first mount, so only client-side navigations fade in. The
// first client render matches the server HTML (no class), so hydration is clean.
import { useEffect } from 'react';

let firstLoadDone = false;

export default function Template({ children }) {
  const fade = firstLoadDone;
  useEffect(() => { firstLoadDone = true; }, []);
  return <div className={fade ? 'page-fade' : undefined}>{children}</div>;
}
