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

## 2. Corrections (branche `perf/mobile-speed`, un fix par commit)

| # | Commit | Ce qui change |
|---|---|---|
| 1 | `perf(fonts)` | Cormorant Garamond / Montserrat / Tajawal / Aref Ruqaa via `next/font/google` (self-hosted, `display: swap`). Suppression de l'`@import` Google Fonts. Latin préchargé ; arabe `preload:false` (téléchargé seulement quand des glyphes arabes s'affichent, via unicode-range). |
| 2 | `perf(tracking)` | `gtag.js` en `lazyOnload` ; le stub `gtag()/dataLayer` reste `afterInteractive` → aucun événement perdu. Meta Pixel inchangé (déjà `next/script`, après consentement). Rien de synchrone dans `<head>`. Pas de GTM/TikTok/Clarity dans le code. |
| 3 | `perf(images)` | `next/image` partout via `app/components/img.js` : dimensions réelles (`scripts/gen-image-dims.mjs` → `app/data/image-dims.json`), `sizes` par emplacement, AVIF/WebP. Hero : `priority` (preload + `fetchpriority=high`) + LQIP flou au lieu de la box grise. Le reste en lazy. Images Woo optimisées via `/_next/image` (remotePatterns déjà présents pour calligraphyjoud.com + hostingersite). `minimumCacheTTL` 31 j. `img { height:auto }` pour ne jamais déformer. |
| 4 | `perf(lcp)` | Hero accueil / collection / catalogue / histoire : plus de `data-reveal` (opacity:0 jusqu'à l'hydratation). Entrée en CSS pur (`[data-hero-in]`), h1 + image LCP peints immédiatement. |
| 5 | `perf(data)` | Lectures catalogue Woo → Data Cache Next (`revalidate: 300`, tag `woo`). Commandes / admin / health restent `no-store` ; l'API commande lit le produit en live. `/api/revalidate` purge le tag + tout l'arbre de pages. |
| 6 | `perf(isr)` | Fin de `cookies()` dans le layout : pages sous `app/[locale]/` (fr/ar/en) pré-rendues + ISR 5 min. Le middleware réécrit l'URL publique vers la bonne locale (`?lang=` → cookie → fr) : **URLs publiques, canonical, hreflang, sitemap inchangés**. `/collection?cat=x` → route interne pré-rendue (grille dans le HTML). 72 SKU × 3 langues pré-rendus. Changement de langue → `router.refresh()`. |
| 7 | `perf(cache)` | `/assets/*` : `public, max-age=604800, stale-while-revalidate=2592000` (avant `max-age=0`). `/_next/static` déjà immutable. |
| 8 | `perf(region)` | `vercel.json` `regions: ["cdg1"]` (Paris) au lieu de `iad1` (USA). |
| 9 | `perf(js)` | Modal de commande COD chargée à la demande (`next/dynamic`, préchargée en idle). Code de la modal déplacé tel quel (tracking Pixel/CAPI/gtag identique). |
| 10 | `perf(reflow)` | `useReveal` : lectures `getBoundingClientRect` groupées avant les écritures. Slider avant/après : mesure une fois par drag. |
| 11 | `perf(lcp)` | Pas de `.page-fade` (opacity 0 → 1) au tout premier chargement ; les navigations internes gardent le fondu. |
| 12 | `perf(isr)` | `dynamicParams = true` explicite sur la route produit (72 SKU pré-rendus, les autres à la demande). `next build` : **`● /[locale]/produit/[sku]` (SSG/ISR 5 min)**, pas ƒ. |
| 13 | `security(revalidate)` | `/api/revalidate` : comparaison du secret à temps constant ; 401 si `REVALIDATE_SECRET` absent ou faux (testé : sans secret / mauvais query / mauvais header → 401, bon → 200). |
| 14 | `perf(lcp)` | Image LCP en `fetchpriority=high` (le preload seul la laissait en Low) ; 2 premières cartes de la collection en priorité (le LCP de la collection était une carte en lazy) ; logo header sans preload ; posters des vidéos d'avis attachés seulement près du viewport (~70 KiB qui concurrençaient le hero). |
| 15 | `perf(lcp)` | `content-visibility: auto` sur les sections sous la ligne de flottaison + footer : le premier layout de toute la page était le render delay du LCP (~1.3 s → ~0.25 s). Ancres testées (bouton, `/#id`, `router.push`) : position identique. |

Testé puis **non retenu** (pas de gain mesurable) : retrait du preload Cormorant, `experimental.inlineCss`, suppression de `text-wrap: pretty` / `optimizeLegibility`, `adjustFontFallback: false`, `browserslist` moderne.

Non fait / volontairement laissé :
- **Legacy JS (~11–28 KiB)** : ce sont les polyfills internes de Next 15 (inclus sans condition). Testé : un `browserslist` moderne ne change rien (chunks identiques). Il faudrait Next 16 → hors périmètre.
- **Dépendances** : seulement `next`, `react`, `react-dom` → rien à retirer.
- **preconnect** : aucun ajouté. Après les fixes, plus aucune origine tierce n'est critique au chargement (polices self-hosted, images Woo servies via `/_next/image` sur notre domaine, Pixel/gtag après consentement).
- **Produits supprimés dans Woo** : ils disparaissent des listes (accueil, collection, catalogue, related) au revalidate (5 min) ou immédiatement via le webhook. La **fiche** d'un SKU absent de Woo continue de s'afficher depuis le catalogue local de secours — comportement existant conservé, car **seuls 13 des 72 SKU officiels sont publiés dans Woo** (14 produits, dont un « test » sans SKU). Passer ces fiches en 404 casserait 59 URLs du sitemap. Décision owner.

## 3. Mesures avant / après

### Méthode
- PSI public : hors quota sans clé ; previews Vercel : **protégées (302 → login Vercel)** → pas mesurables d'ici.
- Donc Lighthouse 12.8 CLI mobile, sur un build de prod local (`next start`) de `origin/main` (avant) et de la branche (après),
  même machine, même Chrome headless pré-chauffé, 3 runs, Woo réel.
- Cette machine est lente (`benchmarkIndex` ≈ 500–700). Avec le ralentissement CPU ×4 par défaut, Lighthouse
  surestime fortement TBT/render-delay (il l'avertit lui-même). Série **calibrée** = CPU ×2 (recommandation Lighthouse pour ce
  benchmarkIndex, plus proche des serveurs PSI). Les deux séries sont données.

### Checklist route produit (steer owner)
1. `cookies()/headers()/draftMode()` : aucun dans app/ ni lib/ (le seul, dans le layout racine, a été retiré).
2. Fetch produit/variations/liste : `next: { revalidate: 300, tags: ['woo'] }` ; `no-store` seulement pour commandes/admin/health.
3. `force-dynamic` / `revalidate = 0` : seulement routes API + /admin, rien dans l'arbre produit.
4. `searchParams` : aucun usage dans les pages (`?cat=` réécrit par le middleware vers une route statique).
5. `generateStaticParams` (72 SKU) + `dynamicParams = true`. Build → `●`. Runtime : `x-nextjs-cache: HIT`, et MISS→HIT juste après un webhook.

### LCP breakdown (accueil, à chaud, calibré)
| Phase | Avant | Après |
|---|---|---|
| TTFB | 354 ms | ~10 ms |
| Resource load delay | 90 ms | ~25 ms |
| Resource load duration | 36 ms (147 KiB webp) | ~12 ms (40 KiB AVIF) |
| Element render delay | 2 108 ms | **~250 ms** |
| **LCP observé (vrai rendu)** | FCP 968 → LCP 2 185 ms | **FCP 281 → LCP 281 ms** |

Observé : LCP = FCP sur l'accueil, +100–170 ms sur collection/produit (cible « ~0,5 s du FCP » atteinte). Le LCP *simulé* par
Lighthouse reste ~3 s : modèle réseau 1,6 Mbps / 150 ms RTT appliqué à tous les octets critiques (polices ~110 KiB incluses).

### Série calibrée finale (CPU ×2) — médiane de 3 runs

| Page | Score | FCP | LCP | TBT | SI | CLS |
|---|---|---|---|---|---|---|
| Accueil — avant | 74 | 3.0 s | 5.1 s | 160 ms | 3.4 s | 0 |
| Accueil — **après** | **91** | **1.7 s** | **3.4 s** | 20 ms | 1.8 s | 0 |
| Collection — avant | 67 | 3.0 s | 4.7 s | 390 ms | 3.9 s | 0 |
| Collection — **après** | **94** | **1.7 s** | **3.0 s** | 50 ms | 1.8 s | 0 |
| Produit ISL-010 — avant | 77 | 3.0 s | 4.5 s | 130 ms | 3.6 s | 0 |
| Produit ISL-010 — **après** | **92** | **1.6 s** | **3.2 s** | 30 ms | 1.8 s | 0 |

### Série brute (CPU ×4 sur machine lente) — médiane de 3 runs (avant les fixes 12–15)

| Page | Score | FCP | LCP | TBT | SI |
|---|---|---|---|---|---|
| Accueil avant → après | 55 → 67 | 3.1 → 1.9 s | 5.1 → 4.0 s | 530 → 730 ms | 5.4 → 3.0 s |
| Collection avant → après | 55 → 64 | 3.0 → 1.7 s | 4.7 → 3.9 s | 850 → 1110 ms | 3.8 → 3.0 s |
| Produit avant → après | 68 → 67 | 3.0 → 2.4 s | 4.7 → 3.9 s | 320 → 710 ms | 4.0 → 3.3 s |

Le TBT « brut » plus élevé après est un artefact de mesure : un premier layout de ~750 ms (temps réel) existe aussi sur `main`
(énumération des polices système Windows dans un Chrome neuf). Avant, il tombait avant le FCP (FCP bloqué par Google Fonts) et
n'était donc pas compté ; maintenant le FCP arrive plus tôt et cette tâche entre dans la fenêtre du TBT. En série calibrée, le TBT
est stable ou en baisse.

### Côté serveur (mesuré)
- HTML : `private, no-store` + rendu à chaque requête (Woo ~1–4 s) → **ISR** : `x-nextjs-cache: HIT`, `s-maxage=300, stale-while-revalidate`,
  20–200 ms en local, pour toutes les pages + les 216 fiches produit (72 × fr/ar/en).
- Hero : 147 KiB webp 1280 px → **40 KiB** AVIF 750 px. Images Woo : jpg plein format → AVIF dimensionné (ex. 138 KiB → ~21–36 KiB).
- `/assets/*` : `max-age=0` → 7 j + SWR 30 j. Images optimisées : 31 j.

### Cibles
| Cible | Résultat (calibré) |
|---|---|
| Performance ≥ 85 | ✅ 91 / 94 / 92 |
| LCP < 2.5 s | Observé ✅ (0,28–0,5 s) · simulé Lighthouse ❌ 3,0–3,4 s (−1,5 à −1,9 s vs avant). À confirmer sur PSI réel (preview protégée). |
| TBT < 200 ms | ✅ 20–50 ms |
| CLS < 0.1 | ✅ 0 |

## 4. Vérifications fonctionnelles (build de prod local, Chrome headless mobile)
- `npm run build` ✅. `tsc --noEmit` : 14 erreurs, **toutes préexistantes** dans `product-client.tsx` (identiques sur `main` ; le projet build avec `ignoreBuildErrors`). Aucune nouvelle. ESLint n'est pas configuré dans le repo.
- Accueil, collection, `?cat=abstrait`, catalogue, histoire, contact, produit (SKU Woo + SKU fallback) : 200, **0 image cassée**, 0 erreur JS/hydratation, canonical `https://www.joudart.com/...`.
- `?lang=ar` et cookie `lang=ar` → `<html lang="ar" dir="rtl">`, textes arabes SSR, Aref Ruqaa chargée. Bascule FR ↔ ع via le header + navigation interne : OK, cookie persistant.
- 404 : chemin inconnu, `/fr/...` direct, `/collection/<cat>` direct → 404. Redirections legacy (`/shop` → 301 `/collection`) OK. `/admin` toujours derrière le Basic-auth du middleware. `/api/health` OK.
- Modal COD : s'ouvre (chunk chargé à la demande), 5 champs, prix matrice (ISL-010 : 1 490 MAD), lien WhatsApp. **Commande réelle non soumise** (créerait une vraie commande Woo).
- Tracking (build de test avec IDs factices, toutes requêtes externes bloquées) : rien avant consentement ; après « Accepter » → `fbq init + PageView`, `gtag js + config GA4 + config Ads` ; clic WhatsApp → `conversion` + `generate_lead` ; ouverture modal → `InitiateCheckout`. **Identique à `main`.**
  - ⚠️ Préexistant (aussi sur `main`) : `ViewContent` sur la fiche produit part avant que le Pixel soit chargé → perdu quand le consentement est déjà stocké. Pas une régression ; correctif simple possible si souhaité.
