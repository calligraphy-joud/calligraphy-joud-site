/**
 * Calligraphy JOUD — WooCommerce one-time seeder
 * ----------------------------------------------------------------------------
 * Builds your whole store structure over the REST API:
 *   1. Enables Cash on Delivery
 *   2. Creates the 3 collections (categories)
 *   3. Creates global attributes Forme / Composition / Dimensions (+ terms)
 *   4. Creates all 72 artworks as VARIABLE products with 5 size variations
 *      (each size has its own price), the right category, and Forme/Composition.
 *
 * It is IDEMPOTENT: products are matched by SKU, categories/attributes/terms by
 * name — re-running skips what already exists and fills in what's missing.
 *
 * RUN (from the project root, after putting your keys in .env.local):
 *   node --env-file=.env.local scripts/seed-woo.mjs
 * Dry run (no writes, just shows what it would do):
 *   node --env-file=.env.local scripts/seed-woo.mjs --dry-run
 *
 * Requires Node 20.6+ (uses --env-file and global fetch). Server-side only.
 */

import { PRODUCTS } from '../app/data/content.js';

const DRY = process.argv.includes('--dry-run');

const STORE = (process.env.WOO_STORE_URL || '').replace(/\/+$/, '');
const CK = process.env.WOO_CONSUMER_KEY || '';
const CS = process.env.WOO_CONSUMER_SECRET || '';

if (!STORE || !CK || !CS) {
  console.error('\n✖ Missing credentials. Set WOO_STORE_URL, WOO_CONSUMER_KEY and WOO_CONSUMER_SECRET in .env.local,\n  then run:  node --env-file=.env.local scripts/seed-woo.mjs\n');
  process.exit(1);
}

const BASE = `${STORE}/wp-json/wc/v3`;
const AUTH = 'Basic ' + Buffer.from(`${CK}:${CS}`).toString('base64');

// ---- domain config ----------------------------------------------------------
const CATEGORIES = [
  { col: 0, name: 'Art islamique', slug: 'art-islamique' },
  { col: 1, name: 'Art moderne',   slug: 'art-moderne' },
  { col: 2, name: 'Art abstrait',  slug: 'art-abstrait' },
];
const FORMES = ['Carré', 'Rectangulaire', 'Rond'];          // index = product.forme (0/1/2)
const COMPOSITIONS = ['1 pièce', '2 pièces', '3 pièces'];   // index = product.comp - 1
const DIMENSIONS = ['60 × 60 cm', '80 × 80 cm', '100 × 100 cm', '120 × 90 cm', '140 × 100 cm'];
const DIM_MULT = [0.7, 0.85, 1, 1.25, 1.5];                 // base price is the "100×100" (index 2) price
const DESC_BY_COL = [
  "Œuvre de calligraphie arabe entièrement faite main — l'encre, l'or et la couleur travaillés lettre après lettre. Pièce unique, signée.",
  "Composition contemporaine aux lignes franches, pensée pour les intérieurs d'aujourd'hui. 100% faite main, pièce unique et signée.",
  "Explosion maîtrisée de matière et de couleur — relief, dorure et profondeur. 100% faite main, pièce unique et signée.",
];

const priceForSize = (base, dimI) => Math.round((base * DIM_MULT[dimI]) / 100) * 100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- REST helpers -----------------------------------------------------------
async function api(method, path, body, { tries = 3 } = {}) {
  const url = `${BASE}/${path}`;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(url, {
        method,
        headers: { Authorization: AUTH, 'Content-Type': 'application/json', 'User-Agent': 'joud-seed/1.0' },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      clearTimeout(to);
      const text = await res.text();
      let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
      if (!res.ok) {
        const msg = (data && data.message) || res.statusText;
        const err = new Error(`${method} ${path} → ${res.status} ${msg}`);
        err.status = res.status; err.data = data;
        if (res.status >= 500 && attempt < tries) { await sleep(600 * attempt); continue; }
        throw err;
      }
      return data;
    } catch (e) {
      if (attempt < tries && (e.name === 'AbortError' || e.code === 'ECONNRESET')) { await sleep(600 * attempt); continue; }
      throw e;
    }
  }
}
const get = (p) => api('GET', p);
const post = (p, b) => api('POST', p, b);
const put = (p, b) => api('PUT', p, b);

// ---- 1. Cash on Delivery ----------------------------------------------------
async function enableCOD() {
  console.log('• Enabling Cash on Delivery…');
  if (DRY) return;
  await put('payment_gateways/cod', {
    enabled: true,
    title: 'Paiement à la livraison',
    description: 'Payez en espèces à la réception de votre œuvre.',
  });
  console.log('  ✓ COD enabled');
}

// ---- 2. Categories ----------------------------------------------------------
async function ensureCategories() {
  console.log('• Ensuring product categories…');
  const byCol = {};
  const existing = await get('products/categories?per_page=100');
  for (const c of CATEGORIES) {
    let found = existing.find((e) => e.slug === c.slug || e.name.toLowerCase() === c.name.toLowerCase());
    if (!found) {
      if (DRY) { console.log(`  + would create category "${c.name}"`); byCol[c.col] = -1; continue; }
      found = await post('products/categories', { name: c.name, slug: c.slug });
      console.log(`  ✓ created category "${c.name}" (#${found.id})`);
    } else {
      console.log(`  = category "${c.name}" exists (#${found.id})`);
    }
    byCol[c.col] = found.id;
  }
  return byCol;
}

// ---- 3. Global attributes + terms ------------------------------------------
async function ensureAttribute(name, slug, terms) {
  const all = await get('products/attributes');
  let attr = all.find((a) => a.slug === `pa_${slug}` || a.name.toLowerCase() === name.toLowerCase());
  if (!attr) {
    if (DRY) { console.log(`  + would create attribute "${name}"`); return { id: -1, terms: {} }; }
    attr = await post('products/attributes', { name, slug, type: 'select', has_archives: false });
    console.log(`  ✓ created attribute "${name}" (#${attr.id})`);
  } else {
    console.log(`  = attribute "${name}" exists (#${attr.id})`);
  }
  const termMap = {};
  if (attr.id > 0) {
    const existingTerms = await get(`products/attributes/${attr.id}/terms?per_page=100`);
    for (const t of terms) {
      let term = existingTerms.find((x) => x.name === t);
      if (!term && !DRY) { term = await post(`products/attributes/${attr.id}/terms`, { name: t }); }
      termMap[t] = term ? term.id : -1;
    }
  }
  return { id: attr.id, terms: termMap };
}

async function ensureAttributes() {
  console.log('• Ensuring global attributes…');
  const forme = await ensureAttribute('Forme', 'forme', FORMES);
  const composition = await ensureAttribute('Composition', 'composition', COMPOSITIONS);
  const dimensions = await ensureAttribute('Dimensions', 'dimensions', DIMENSIONS);
  return { forme, composition, dimensions };
}

// ---- 4. Products + variations ----------------------------------------------
async function findProductBySku(sku) {
  const res = await get(`products?sku=${encodeURIComponent(sku)}`);
  return Array.isArray(res) && res.length ? res[0] : null;
}

async function ensureProduct(p, catByCol, attrs) {
  const existing = await findProductBySku(p.id);
  if (existing) { console.log(`  = ${p.id} "${p.name}" exists (#${existing.id}) — skipping`); return 'skip'; }
  if (DRY) { console.log(`  + would create ${p.id} "${p.name}" (${COMPOSITIONS[p.comp - 1]}, ${FORMES[p.forme]}) + ${DIMENSIONS.length} sizes`); return 'dry'; }

  const productBody = {
    name: p.name,
    sku: p.id,
    type: 'variable',
    status: 'publish',
    catalog_visibility: 'visible',
    description: DESC_BY_COL[p.col],
    short_description: 'Pièce originale · 100% faite main · paiement à la livraison.',
    categories: [{ id: catByCol[p.col] }],
    meta_data: [{ key: 'name_ar', value: p.name_ar }, { key: '_joud_sku', value: p.id }],
    attributes: [
      { id: attrs.forme.id, name: 'Forme', visible: true, variation: false, options: [FORMES[p.forme]] },
      { id: attrs.composition.id, name: 'Composition', visible: true, variation: false, options: [COMPOSITIONS[p.comp - 1]] },
      { id: attrs.dimensions.id, name: 'Dimensions', visible: true, variation: true, options: DIMENSIONS },
    ],
    default_attributes: [{ id: attrs.dimensions.id, name: 'Dimensions', option: DIMENSIONS[2] }],
  };
  const created = await post('products', productBody);

  // size variations with per-size prices
  const variations = DIMENSIONS.map((dim, i) => ({
    sku: `${p.id}-${[60, 80, 100, 120, 140][i]}`,
    regular_price: String(priceForSize(p.price, i)),
    attributes: [{ id: attrs.dimensions.id, name: 'Dimensions', option: dim }],
  }));
  await post(`products/${created.id}/variations/batch`, { create: variations });
  console.log(`  ✓ ${p.id} "${p.name}" (#${created.id}) + ${variations.length} sizes`);
  return 'created';
}

// ---- run --------------------------------------------------------------------
(async () => {
  console.log(`\nCalligraphy JOUD — WooCommerce seeder${DRY ? ' (DRY RUN)' : ''}`);
  console.log(`Store: ${STORE}\n`);
  try {
    // connectivity check
    await get('products?per_page=1');
    console.log('✓ Connected to WooCommerce\n');
  } catch (e) {
    console.error(`✖ Could not reach WooCommerce: ${e.message}`);
    console.error('  Check WOO_STORE_URL, the keys (Read/Write), Permalinks="Post name", and that the site is up.\n');
    process.exit(1);
  }

  await enableCOD();
  const catByCol = await ensureCategories();
  const attrs = await ensureAttributes();

  console.log(`• Creating ${PRODUCTS.length} products…`);
  let created = 0, skipped = 0;
  for (const p of PRODUCTS) {
    try {
      const r = await ensureProduct(p, catByCol, attrs);
      if (r === 'created') created++; else if (r === 'skip') skipped++;
      await sleep(250); // be gentle on Hostinger
    } catch (e) {
      console.error(`  ✖ ${p.id}: ${e.message}`);
    }
  }

  console.log(`\nDone.${DRY ? ' (dry run — nothing was written)' : ''}`);
  console.log(`  Created: ${created}   Skipped (already existed): ${skipped}   Total catalogue: ${PRODUCTS.length}`);
  console.log(`\nNext: open your site's /catalogue and /api/health to confirm the live connection.\n`);
})();
