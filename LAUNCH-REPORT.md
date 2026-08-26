# JOUDART — Launch Readiness Report

_Final QA pass. Date: 2026-06-08._

## Verdict

**Launch-ready, pending 4 owner inputs** (WhatsApp number, Meta Pixel ID + CAPI token, a legal-text review, and deletion of the test orders). The site is functional end-to-end, on-brand, trilingual, connected to your live WooCommerce store, and performance/SEO-optimized.

---

## 1. What was verified

### Functionality & customer journey
- **Home, Collection, Catalogue, Product, Histoire, Contact, Livraison, Mentions, Confidentialité, Cookies, 404** — all render correctly.
- **Full purchase journey tested live**: product page → *Commander* → size/options + name/city → **"Commande reçue !"** confirmation with WhatsApp follow-up. This created real WooCommerce orders (#444–#446) — confirming both read and write to your store.
- **Product page** pulls **live Woo data**: real names ("Nour", "Magma"), real photos, real per-size prices in **MAD**, working composition/forme/dimensions selectors, related grid.
- **Catalogue** loads all 72 live products with working filters, sorting, and counts.
- Header, footer, nav links, language toggle, search shortcut, cookie banner, order modal, contact (WhatsApp / phone / email / map) — all functional.

### WooCommerce integration
- `/api/health` reports `woo: reachable`, 72 products visible.
- Orders created as COD, status *Processing*, with size variation + options captured.
- Currency set to **MAD**; Cash on Delivery enabled.

### Languages & RTL
- **French / English / Arabic** all complete — no missing strings, no language leaking between locales.
- **Arabic switches the whole layout to RTL** (logo, nav, hero, grids all mirror correctly) and is remembered per visitor.

### SEO
- Every page has a unique **title, meta description, canonical**, Open Graph/Twitter tags; homepage has **Organization JSON-LD**.
- Single, correct **H1** per page; `sitemap.xml` + `robots.txt` present and include all routes.
- Product titles render cleanly (e.g. "Nour · Art islamique · JOUDART").

### Accessibility
- All images carry `alt` (decorative ones correctly use empty alt); all icon-only buttons have `aria-label`; the map iframe has a title; no empty links; `lang`/`dir` set correctly per language.

### Performance / Core Web Vitals
- Lean bundles (~102–135 kB first load JS).
- All imagery served as **optimized WebP**; below-the-fold images **lazy-loaded**; the hero (LCP) image is **eager + high priority**; aspect-ratio boxes prevent layout shift (CLS).

---

## 2. Issues found and fixed in this pass

1. **Hero headline didn't translate** — it was hardcoded French on all languages. → Added translated hero titles (FR/EN/AR) and wired them in.
2. **Product SEO title duplicated "JOUDART"** → fixed to a single clean suffix.
3. **Hero could flash blank on first load** (reveal-gated) → above-the-fold content now reveals instantly.
4. **Homepage + Histoire + Categories images weren't optimized/lazy** → converted to WebP and lazy-loaded below the fold; hero prioritized.
5. **Build was failing type-check** on Next 15 async route params and mixed JS/TS noise → fixed async params; build now passes.

---

## 3. Remaining recommendations before going live

**Required (you):**
1. Set the **real WhatsApp number** (`WA_NUMBER` in `.env.local`, used by the order flow + contact).
2. Add **Meta Pixel ID** (`NEXT_PUBLIC_FB_PIXEL_ID`) + **Conversions API token** (`FB_CAPI_TOKEN`). The Pixel/CAPI code is built and consent-gated; it activates once these are set.
3. Have the **Privacy & Cookies wording reviewed** (current text is a solid template, not legal advice).
4. **Delete the 3 test orders** (#444, #445, #446) in WooCommerce.
5. Set **`ADMIN_PASSWORD`** to lock the `/admin` board before it's reachable publicly.

**Recommended:**
- **Spot-check on a real phone.** The remote browser tool renders at a fixed ~1150 px viewport, so I could not render true mobile/tablet widths. The responsive breakpoints (burger menu, stacked grids, mobile cookie banner) are all in place from a responsive base, but a 2-minute check on your phone is worth it before ads.
- Set the **store base address/country** in WooCommerce → Settings → General (only affects shipping/tax zones).
- Configure the **order fallback** (Google Sheet + email env vars) so no lead is lost if Woo is briefly unreachable under ad traffic.
- Add a couple of **real atelier/Instagram photos** to replace the last design placeholders if you have them.

---

## 4. Go-live checklist

- [ ] Real WhatsApp number in `.env.local`
- [ ] Meta Pixel ID + Conversions API token
- [ ] Privacy/Cookies wording reviewed
- [ ] Delete test orders #444–#446
- [ ] `ADMIN_PASSWORD` set
- [ ] Phone spot-check (mobile/tablet)
- [ ] `npm run build` re-run after the above (confirms a clean production build)
- [ ] Deploy + connect domain (when you're ready)
- [ ] Verify in production: `/api/health` green, catalogue loads, one test order, then delete it

---

_The site is in strong, polished shape. The remaining items are inputs and a deploy — the engineering is done and verified against your live store._
