// Re-pushes the WooCommerce keys to the linked Vercel project WITHOUT the
// trailing-newline corruption from the first run. Reads values from a temp
// file (value only, no newline) so Basic-auth encoding stays exact.

import fs from 'node:fs';
import { execSync } from 'node:child_process';

// Back up the real keys before any vercel command can overwrite .env.local
fs.copyFileSync('.env.local', '.env.local.bak');
const text = fs.readFileSync('.env.local.bak', 'utf8');

const wanted = ['WOO_STORE_URL', 'WOO_CONSUMER_KEY', 'WOO_CONSUMER_SECRET', 'WA_NUMBER', 'ADMIN_USER'];
const targets = ['production', 'preview', 'development'];

for (const raw of text.split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq < 0) continue;
  const key = line.slice(0, eq).trim();
  let val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  if (!wanted.includes(key) || !val) continue;

  fs.writeFileSync('.vtmp', val); // value ONLY - no trailing newline
  for (const t of targets) {
    try { execSync('vercel env rm ' + key + ' ' + t + ' --yes', { stdio: 'ignore', timeout: 120000 }); } catch (e) {}
    try { execSync('vercel env add ' + key + ' ' + t + ' < .vtmp', { stdio: 'ignore', timeout: 120000 }); }
    catch (e) { console.log('  ! could not set ' + key + ' (' + t + ')'); }
  }
  console.log('  reset ' + key);
}
try { fs.unlinkSync('.vtmp'); } catch (e) {}
console.log('\nKeys re-pushed cleanly (no trailing newline).');
