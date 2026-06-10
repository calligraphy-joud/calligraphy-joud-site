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

## WhatsApp checkout
Every artwork card and every "Commande" / "Commander" button opens a premium order
sheet that pre-fills a WhatsApp message with the artwork, options and total, then sends
the visitor straight to your WhatsApp chat.

**The number is centralized in one place** — `lib/whatsapp.ts` (`WHATSAPP_NUMBER`).
Override it at deploy time with the env var `NEXT_PUBLIC_WHATSAPP_NUMBER` (country code,
digits only, no `+`), e.g. `NEXT_PUBLIC_WHATSAPP_NUMBER=212630690524`. Every usage point
(order modal, client link builder, server fallback, contact CTA) imports it from there —
do not hardcode the number anywhere else.
