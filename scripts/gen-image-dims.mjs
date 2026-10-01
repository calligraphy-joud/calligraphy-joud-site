// Generates app/data/image-dims.json: intrinsic { w, h } of every self-hosted
// webp under /public/assets, plus a tiny blurred LQIP (`b`) for
// the above-the-fold images listed in BLUR. next/image needs real dimensions to
// emit a correct srcset; the LQIP replaces the grey box while the hero loads.
//
// Re-run after adding/replacing images in /public/assets:
//   node scripts/gen-image-dims.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve('public');
const DIRS = ['assets', 'assets/imagery', 'assets/products', 'assets/videos'];
const BLUR = new Set([
  '/assets/imagery/hero.webp',
  '/assets/imagery/categorie-islamique.webp',
  '/assets/imagery/categorie-moderne.webp',
  '/assets/imagery/categorie-abstrait.webp',
]);

const out = {};
for (const dir of DIRS) {
  for (const f of fs.readdirSync(path.join(ROOT, dir)).sort()) {
    if (!/\.webp$/i.test(f)) continue; // the site only renders the webp variants
    const rel = `/${dir}/${f}`;
    const file = path.join(ROOT, dir, f);
    const { width, height } = await sharp(file).metadata();
    const entry = { w: width, h: height };
    if (BLUR.has(rel)) {
      const buf = await sharp(file).resize(12).webp({ quality: 40 }).toBuffer();
      entry.b = `data:image/webp;base64,${buf.toString('base64')}`;
    }
    out[rel] = entry;
  }
}
fs.writeFileSync('app/data/image-dims.json', JSON.stringify(out) + '\n');
console.log(`wrote ${Object.keys(out).length} entries`);
