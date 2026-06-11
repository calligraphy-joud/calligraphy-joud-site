# Calligraphy JOUD — Marketing Website

A standalone **Next.js (App Router)** site, rebuilt from the Claude Design handoff:
the full brand design system, trilingual content (FR / EN / AR + RTL), SEO, and a
premium luxury homepage plus every inner page — production-ready, no placeholders.

## Run locally
```bash
npm install
npm run dev      # http://localhost:3000
```

## Production
```bash
npm run build
npm start
```

## Pages
- `/`            Homepage — hero, trust strip, collection, categories, before/after, mission, reviews, partners, Instagram
- `/collection`  Shop with live filters (style / composition / shape), sorting, per-category hero (`?cat=islamique|moderne|abstrait`)
- `/catalogue`   Full 2026 catalogue — 72 works, dense grid
- `/histoire`    Brand story (1977 → today), atelier, 4-step process, values
- `/contact`     WhatsApp-first contact, channels, Agadir map
- `/livraison`   Delivery & returns
- `/mentions`    Legal notice
- `404`          Custom not-found

## Tech & quality
- **Design system**: `app/globals.css` — Navy/Gold/Denim/Chalk tokens, Playfair Display + Cairo, spacing scale, Button/Badge.
- **Content**: `app/data/content.js` — artworks, 72 products, categories, reviews, partners, and all FR/EN/AR strings.
- **Components**: `app/components/` — Header/Footer, sections, boutique grid, content pages, icons, language context.
- **i18n**: header FR / EN / ع toggle; Arabic flips the whole layout to RTL; choice is remembered.
- **SEO**: per-page metadata, Open Graph/Twitter cards, Organization JSON-LD, `sitemap.xml`, `robots.txt`.
- **Performance & responsive**: server-rendered, lazy-loaded imagery, fluid type, mobile breakpoints down to phones.

## Assets
`public/assets/` — imagery, logos, and the 72 2026 product images. The few remaining
drop-slots (atelier photo, some Instagram tiles) are styled placeholders for your real photos.

## Content updates (WooCommerce as the source of truth)

Product **names, descriptions, and images are managed in WooCommerce** (wp-admin) —
no code changes or redeploys needed. What comes from where:

| Editable in wp-admin (Woo)        | Fixed in code (Woo values ignored)                          |
| --------------------------------- | ----------------------------------------------------------- |
| Product name / title              | Prices — matrix in `app/data/joud-pricing.json`             |
| Description (short or long)       | Forme / composition / orientation — `joud-products-attributes.json` |
| Featured image (= main image)     | Cadre (frame) logic                                         |
| Gallery images (= thumbnails 2…4) |                                                             |
| Image alt text (media library)    |                                                             |

**Matching is by SKU.** A Woo product's SKU field must equal its code
(`ABS-###`, `ISL-###`, `MOD-###`). Any product whose SKU is missing or not one of
the official 72 is excluded from the site and logged (`[woo] excluding …`). This also
keeps duplicates like *"Mizane (Copy)"* off the site until they're deleted.

**Images.** The featured image is the main; the rest of the gallery are the
thumbnails. If a product has no Woo image yet, the site falls back to
`public/assets/products/{SKU}.webp` so nothing breaks. Alt text uses the Woo media
alt when filled, otherwise an auto-generated French pattern. `next/image` optimizes
the Woo-served images (hosts are allow-listed in `next.config.mjs` → `images.remotePatterns`).

### Making edits appear instantly

Pages use ISR (`revalidate = 300`), so edits show within 5 minutes on their own. For
**instant** updates, wire a WooCommerce webhook to the on-demand revalidation route:

1. **Set the secret** (Vercel → Project → Settings → Environment Variables):
   `REVALIDATE_SECRET` = a long random string (also in `.env.local`). Redeploy once.
2. **Add the webhook** (wp-admin → WooCommerce → Settings → Advanced → Webhooks → Add):
   - Status: **Active**
   - Topic: **Product updated** (add a second one for *Product created* / *deleted*)
   - Delivery URL: `https://www.calligraphyjoud.com/api/revalidate?secret=YOUR_SECRET`
   - API version: WP REST API v3
3. Now any product edit fires the webhook → the route clears the Woo cache and
   revalidates the home, collection, catalogue, and all product pages within seconds.

Manual trigger (anytime): open
`https://www.calligraphyjoud.com/api/revalidate?secret=YOUR_SECRET` (optionally
`&sku=ISL-027` to also target one product). Returns `{ "revalidated": true, … }`.

## WhatsApp checkout
Every artwork card and every "Commande" / "Commander" button opens a premium order
sheet that pre-fills a WhatsApp message with the artwork, options and total, then sends
the visitor straight to your WhatsApp chat.

**The number is centralized in one place** — `lib/whatsapp.ts` (`WHATSAPP_NUMBER`).
Override it at deploy time with the env var `NEXT_PUBLIC_WHATSAPP_NUMBER` (country code,
digits only, no `+`), e.g. `NEXT_PUBLIC_WHATSAPP_NUMBER=212630690524`. Every usage point
(order modal, client link builder, server fallback, contact CTA) imports it from there —
do not hardcode the number anywhere else.
