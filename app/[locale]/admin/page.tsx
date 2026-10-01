// Admin · Commandes — private live-orders board (server shell).
//
// ⚠️ SECURITY: this route is UNAUTHENTICATED. Anyone who can reach
// /admin can view and mutate orders. It MUST be protected before
// production — e.g. HTTP basic auth, a Next.js middleware gate, or the
// user's existing management-app login. No auth is implemented here on
// purpose; this is the place to add it. The matching note lives in
// app/api/admin/orders/route.ts.
//
// This server component stays thin: it sets metadata and renders the
// client board. It does NOT fetch Woo — the client calls the API so the
// kanban refreshes live as statuses change.

import type { Metadata } from 'next';
import AdminClient from './admin-client';

export const metadata: Metadata = {
  title: 'Admin · Commandes',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  return <AdminClient />;
}
