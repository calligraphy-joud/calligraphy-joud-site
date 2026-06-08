import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Password-gate the admin board + admin API with HTTP Basic auth.
// Enable by setting ADMIN_PASSWORD (and optionally ADMIN_USER) in the environment.
// If ADMIN_PASSWORD is unset, the gate is OFF (handy in local dev).
export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

export function middleware(req: NextRequest) {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return NextResponse.next(); // not configured → no gate

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
    const p = idx >= 0 ? decoded.slice(idx + 1) : '';
    if (u === user && p === pass) return NextResponse.next();
  }

  return new NextResponse('Authentification requise', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Calligraphy JOUD Admin", charset="UTF-8"' },
  });
}
