import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Run on everything except Next internals and static assets. This lets us:
//   1) 301-redirect legacy WooCommerce/WordPress URLs to the new routes, and
//   2) password-gate the admin board + admin API.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets/|robots.txt|sitemap.xml).*)'],
};

/**
 * Map a legacy path to its new destination (category-level, safe). Returns null
 * when the path isn't a legacy URL. All of these are emitted as 301 (permanent).
 */
function legacyRedirect(pathname: string): string | null {
  const p = pathname.toLowerCase().replace(/\/+$/, '') || '/';

  // --- Old product detail pages → category-level collection ---
  if (p === '/product' || p.startsWith('/product/')) {
    const slug = p.slice('/product/'.length);
    if (
      slug.startsWith('art-islamique-') ||
      slug.startsWith('taj') ||
      slug.startsWith('amira')
    ) {
      return '/collection?cat=islamique';
    }
    if (slug.startsWith('art-moderne-') || slug.startsWith('art-modern-')) {
      return '/collection?cat=moderne';
    }
    if (slug.startsWith('art-abstri-')) {
      return '/collection?cat=abstrait';
    }
    // anything else under /product/* → the full collection
    return '/collection';
  }

  // --- Shop archive ---
  if (p === '/shop' || p.startsWith('/shop/')) return '/collection';

  // --- WooCommerce category archives ---
  if (p.startsWith('/product-category/')) {
    const cat = p.slice('/product-category/'.length);
    if (cat.startsWith('art-islamique')) return '/collection?cat=islamique';
    if (cat.startsWith('art-moderne') || cat.startsWith('art-modern')) return '/collection?cat=moderne';
    if (cat.startsWith('art-abstri') || cat.startsWith('art-abstrait')) return '/collection?cat=abstrait';
    return '/collection';
  }

  // --- Old filter pages ---
  if (p.startsWith('/filtrer-par-') || p === '/filtrer-par' || p.startsWith('/filtrer-par/')) {
    return '/collection';
  }

  // --- Renamed static pages ---
  // (/la-maison is the old label for the Maison/Story page, which now lives at /histoire)
  if (p === '/our-story' || p === '/la-maison') return '/histoire';
  if (p === '/contact-us') return '/contact';

  // --- WooCommerce account/cart/checkout → home ---
  if (p === '/my-account' || p.startsWith('/my-account/')) return '/';
  if (p === '/cart') return '/';
  if (p === '/checkout' || p.startsWith('/checkout/')) return '/';

  return null;
}

function adminGate(req: NextRequest): NextResponse | null {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return null; // not configured → no gate

  const user = process.env.ADMIN_USER || 'admin';
  const header = req.headers.get('authorization') || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme === 'Basic' && encoded) {
    let decoded = '';
    try {
      decoded = typeof atob === 'function' ? atob(encoded) : Buffer.from(encoded, 'base64').toString();
    } catch {
      decoded = '';
    }
    const idx = decoded.indexOf(':');
    const u = idx >= 0 ? decoded.slice(0, idx) : '';
    const pw = idx >= 0 ? decoded.slice(idx + 1) : '';
    if (u === user && pw === pass) return null; // authorized
  }

  return new NextResponse('Authentification requise', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Calligraphy JOUD Admin", charset="UTF-8"' },
  });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) Legacy URL redirects (301, permanent).
  const dest = legacyRedirect(pathname);
  if (dest) {
    return NextResponse.redirect(new URL(dest, req.url), 301);
  }

  // 2) Admin Basic-auth gate (only the admin board + admin API).
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const blocked = adminGate(req);
    if (blocked) return blocked;
  }

  return NextResponse.next();
}
