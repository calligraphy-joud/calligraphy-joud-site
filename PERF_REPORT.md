# PERF_REPORT — joudart.com mobile

Branche : `perf/mobile-speed` (base `origin/main` @ 55549ee). Date : 2026-10-01.

## 0. Contexte de mesure

- PageSpeed (fourni par l'owner, mobile, accueil) : **Score 50 · FCP 4.5 s · LCP 5.9 s · SI 7.6 s · TBT 510 ms · CLS 0.001**.
  CrUX terrain : LCP 4 s, INP 264 ms, TTFB 1.7 s → CWV FAIL.
- `joudart.com` / `www.joudart.com` résolvent (DNS public 8.8.8.8) vers **2.57.91.91 (Hostinger)**, pas vers Vercel,
  et le port 443 de cette IP ne répond pas depuis le poste de diagnostic. L'API PageSpeed publique est hors quota sans clé.
  → Baseline labo mesurée avec **Lighthouse 12.8 CLI (mobile, throttling simulé par défaut), 3 runs** sur le déploiement
  de production Vercel `https://calligraphy-joud-site-43z8.vercel.app/` (même build que main).

### Baseline Lighthouse (prod Vercel, accueil, mobile)

| run | Score | FCP | LCP | TBT | CLS | SI |
|---|---|---|---|---|---|---|
| 1 | 56 | 3.6 s | 5.8 s | 390 ms | 0 | 6.5 s |
| 2 | 61 | 3.4 s | 5.5 s | 350 ms | 0 | 5.4 s |
| 3 | 54 | 2.1 s | 5.3 s | 600 ms | 0.017 | 10.8 s |

## 1. Diagnostic

### 1.1 Élément LCP
`div.hero__art > figure.joud-frame > div.joud-frame__img > img` → `/assets/imagery/hero.webp` (1280×960, 147 KiB, `<img>` brut,
affiché ~335×446 sur mobile).

Décomposition LCP (run 2) : TTFB 751 ms · Load delay 596 ms · Load time 288 ms · **Render delay 3 881 ms (70 %)**.

Cause du render delay : tout le hero (`h1`, lead, CTA **et l'image**) porte `data-reveal`. Dans `globals.css`,
`[data-reveal] { opacity: 0 }` tant que `useReveal()` (JS client) n'a pas ajouté `.is-in` → l'image LCP est téléchargée
mais reste invisible jusqu'à la fin de l'hydratation React (+ transition 600 ms). C'est exactement le filmstrip
« page blanche puis box grise » (`.joud-frame__img { background: var(--surface-sunken) }`).
En plus `app/template.js` enveloppe chaque page dans `.page-fade` (animation opacity 0 → 1).

### 1.2 Ressources render-blocking
- `app/globals.css` ligne 1 : `@import url(https://fonts.googleapis.com/css2?...)` — **4 familles / 21 graisses**
  (Cormorant Garamond ital+wght, Montserrat 300-700, Tajawal 300-700, Aref Ruqaa 400/700). Chaîne :
  HTML → CSS Next → CSS Google (import, découvert tard) → woff2 gstatic. ~1.15 s estimés + FOUT tardif.
- CSS Next `/_next/static/css/*.css` (18 KiB) — normal.

### 1.3 Rendu / cache serveur
- `app/layout.js` appelle `cookies()` (langue) → **toutes les pages sont rendues dynamiquement à chaque requête** ;
  les `export const revalidate = 300` des pages sont **ignorés**. Réponse HTML :
  `Cache-Control: private, no-cache, no-store` · `X-Vercel-Cache: MISS`.
- Fonction servie depuis **iad1 (USA, Washington)** (`X-Vercel-Id: cdg1::iad1::…`) alors que les clients sont au Maroc
  et le backend Woo chez Hostinger.
- `lib/woo.ts` : toutes les lectures Woo en `fetch(..., { cache: 'no-store' })` + cache mémoire 15 s par instance
  → en pratique **1 à 3 requêtes Woo live par vue** (home, collection, catalogue, produit = produit + variations + liste).
  Hostinger répond en ~1–1.8 s → explique le TTFB terrain de 1.7 s.
- Webhook de revalidation déjà présent : `app/api/revalidate` (secret `REVALIDATE_SECRET`), appelle `revalidatePath`.

### 1.4 Images
- 100 % `<img>` bruts (aucun `next/image`) : hero, logos (512 px pour 36 px affichés, 48–56 KiB chacun), catégories,
  avant/après, maison, instagram, cartes produits.
- Cartes produits de l'accueil/collection = **images Woo plein format** depuis
  `floralwhite-gnu-428855.hostingersite.com/wp-content/...` (jpg, 21–138 KiB, cache 7 j, pas d'AVIF/WebP, pas de srcset).
- Insight « image delivery » : −377 KiB estimés.

### 1.5 Scripts tiers
- Présents dans le code : **Meta Pixel** (`app/components/pixel.js`) et **gtag GA4/Google Ads** (`app/components/gtag.js`),
  tous deux `next/script strategy="afterInteractive"` **et chargés seulement après consentement cookies**.
  CAPI Meta côté serveur (`lib/capi.ts`). **Pas de GTM, TikTok, Clarity ni widget chat dans le code** (le bouton WhatsApp est un lien `wa.me`).
- Lighthouse (sans consentement) : 0 ms de blocage tiers → le TBT vient de notre JS (React/Next + hydratation de toute la page client).

### 1.6 JavaScript
- Toute la home est un composant client (`home-client.js`) → hydratation complète. Chunks principaux : 55 KiB + 45 KiB + 23 KiB.
- Legacy JS : 11 KiB (polyfills `Array.prototype.at`, etc. dans le chunk 255) — pas de `browserslist` dans `package.json`.
- Modal de commande (`order.js`, 272 l.) chargée dans le bundle initial alors qu'elle ne s'ouvre qu'au clic.

### 1.7 Forced reflow
- `useReveal()` : boucle qui alterne `getBoundingClientRect()` (lecture) et `classList.add('is-in')` (écriture) pour
  chaque `[data-reveal]` → layout forcé à chaque itération après la première écriture.

### 1.8 Cache des assets
- `/assets/*` (public) servis par Vercel avec `max-age=0, must-revalidate` (défaut) → ~7 MiB « caches faibles » côté PSI
  (images + vidéos d'avis + posters).
- `/_next/static/*` : déjà `immutable` (défaut Next).

## 2. Plan / corrections

(voir section 3, mise à jour au fil des commits)
