/**
 * Sets core store settings via the WooCommerce REST API (deterministic).
 * Run: node --env-file=.env.local scripts/configure-store.mjs
 */
const STORE = (process.env.WOO_STORE_URL || '').replace(/\/+$/, '');
const A = 'Basic ' + Buffer.from(`${process.env.WOO_CONSUMER_KEY}:${process.env.WOO_CONSUMER_SECRET}`).toString('base64');

async function setOpt(id, value) {
  const r = await fetch(`${STORE}/wp-json/wc/v3/settings/general/${id}`, {
    method: 'PUT',
    headers: { Authorization: A, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  const j = await r.json();
  if (!r.ok) { console.log(`✖ ${id}: ${r.status} ${j && j.message}`); return; }
  console.log(`✓ ${id} -> ${j.value}`);
}

(async () => {
  console.log('Configuring store:', STORE);
  await setOpt('woocommerce_currency', 'MAD');
  await setOpt('woocommerce_default_country', 'MA');
  await setOpt('woocommerce_currency_pos', 'right_space'); // 1 000 MAD
  console.log('done');
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
