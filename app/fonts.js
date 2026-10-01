// Self-hosted Google fonts via next/font: files are downloaded at build time and
// served from our own domain (no fonts.googleapis.com / gstatic round-trips, no
// render-blocking @import). Each font exposes a CSS variable consumed by the
// --font-* tokens in globals.css. display: 'swap' is next/font's default.
import { Cormorant_Garamond, Montserrat, Tajawal, Aref_Ruqaa } from 'next/font/google';

// Latin display face (titles, wordmark, numbers). Variable font: one file per style.
export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

// Latin UI/body face. Variable font covers 400–700.
export const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

// Arabic body face — only downloaded when Arabic glyphs render (unicode-range),
// so it is not preloaded on FR/EN pages.
export const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  variable: '--font-tajawal',
  display: 'swap',
  preload: false,
});

// Arabic display face (RTL headings).
export const arefRuqaa = Aref_Ruqaa({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  variable: '--font-aref-ruqaa',
  display: 'swap',
  preload: false,
});

export const fontVars = [cormorant.variable, montserrat.variable, tajawal.variable, arefRuqaa.variable].join(' ');
