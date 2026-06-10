// Reads .env.local and pushes every non-empty variable to the linked Vercel
// project (production, preview, development). Idempotent: removes then re-adds,
// so it is safe to run more than once. Secrets are read from your local file
// and sent only to your own Vercel project via the official CLI.

import fs from 'node:fs';
import { execSync } from 'node:child_process';

const FILE = '.env.local';
if (!fs.existsSync(FILE)) {
  console.error('ERROR: .env.local was not found in this folder.');
  process.exit(1);
}

const lines = fs.readFileSync(FILE, 'utf8').split(/\r?\n/);
const targets = ['production', 'preview', 'development'];
let set = 0;
let skipped = 0;

for (const raw of lines) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq === -1) continue;

  const key = line.slice(0, eq).trim();
  let val = line.slice(eq + 1).trim();

  // strip surrounding quotes if present
  if ((val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
  if (!val) { console.log('  -  ' + key + '  (empty, skipped)'); skipped++; continue; }

  for (const t of targets) {
    // remove an existing value so re-runs do not error out (timeout guards against a hang)
    try { execSync('vercel env rm ' + key + ' ' + t + ' --yes', { input: '\n', stdio: ['pipe', 'ignore', 'ignore'], timeout: 120000 }); } catch (e) {}
    // add the value (piped via stdin so it never appears on the command line)
    try {
      execSync('vercel env add ' + key + ' ' + t, { input: val + '\n', stdio: ['pipe', 'ignore', 'ignore'], timeout: 120000 });
    } catch (e) {
      console.log('  !  ' + key + ' (' + t + ') could not be set: ' + e.message.split('\n')[0]);
    }
  }
  console.log('  OK   ' + key);
  set++;
}

console.log('\nFinished. Variables set: ' + set + ', skipped (empty): ' + skipped);
