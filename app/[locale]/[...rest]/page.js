// Every public URL is rewritten to /{locale}/… by middleware.ts; anything that
// doesn't match a real route lands here and renders the localized 404 page
// (app/[locale]/not-found.js) inside the normal layout.
import { notFound } from 'next/navigation';

export default function CatchAll() {
  notFound();
}
