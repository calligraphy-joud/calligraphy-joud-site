# Connect the site to WooCommerce — setup guide

You only need to do **Phase A** (the parts that require your WordPress login).
I handle **Phase B & C** (seeding the store + verifying) once your keys are in place.

---

## Phase A — your steps in WordPress admin (≈10 min)

### 1. Install WooCommerce
WP Admin → **Plugins → Add New** → search **WooCommerce** → **Install Now** → **Activate**.

### 2. Run the setup wizard (or skip)
When the wizard appears, set:
- **Country/Region:** Morocco
- **Currency:** Moroccan dirham (MAD)
- Product type: physical. You can skip payment/shipping/marketing steps — I configure payments via the API.
(If you skipped it, that's fine.)

### 3. Set permalinks (critical — the REST API needs this)
Settings → **Permalinks** → choose **Post name** → **Save changes**.

### 4. Create the REST API key
WooCommerce → **Settings → Advanced → REST API → Add key**:
- **Description:** Website integration
- **User:** your admin user
- **Permissions:** **Read/Write**
- Click **Generate API key**. You'll see a **Consumer key (ck_…)** and **Consumer secret (cs_…)** — copy them now (the secret is shown only once).

### 5. Put the keys in `.env.local`
In the project root (`Desktop\calligraphy-joud-site`), create a file named **`.env.local`** containing:
```
WOO_STORE_URL=https://your-wordpress-domain.com
WOO_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxxxxxxxxx
WOO_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxxxxxxxxx
```
(There's a `.env.local.example` you can copy.)

➡️ **Tell me when Phase A is done** and share your **store URL** (the domain only — keep the keys in the file, not in chat). I'll take it from there.

---

## Phase B — seed the store (I run this on your machine)

This creates everything automatically via the API:
- 3 collections: **Art islamique / Art moderne / Art abstrait**
- Global attributes: **Forme** (Carré/Rectangulaire/Rond), **Composition** (1/2/3 pièces), **Dimensions** (5 sizes)
- All **72 artworks** as variable products with **5 size variations each** (per-size prices)
- **Cash on Delivery** enabled

```bash
npm install                                   # installs deps incl. TypeScript
node --env-file=.env.local scripts/seed-woo.mjs --dry-run   # preview, writes nothing
node --env-file=.env.local scripts/seed-woo.mjs             # the real run
```
The seeder is **idempotent** — safe to re-run; it skips anything that already exists.

---

## Phase C — verify the live connection (I run this)

```bash
npm run dev
```
- `http://localhost:3000/api/health` → should report `"woo":"reachable"` with your product count.
- `http://localhost:3000/catalogue` → shows your real Woo products.
- Place a **test order** from any artwork → it appears in **WooCommerce → Orders** as a COD order, status *Processing*. (You can delete it after.)
- `http://localhost:3000/admin` → the live order board (gate this before going public).

---

## What I configure vs. what you configure

| Task | Who | How |
|---|---|---|
| Install WooCommerce plugin | You | wp-admin (Phase A.1) |
| Permalinks = Post name | You | wp-admin (Phase A.3) |
| Generate REST API keys | You | wp-admin (Phase A.4) — secret shown once |
| Categories | Me | seeder (API) |
| Attributes + terms | Me | seeder (API) |
| 72 products + size variations + prices | Me | seeder (API) |
| Cash on Delivery | Me | seeder (API) |
| Site wiring, orders, admin, health | Me | already built |

> I never enter your WordPress password or read your secret keys — you create the
> key and place it in `.env.local` yourself; the code reads it from there, server-side only.
