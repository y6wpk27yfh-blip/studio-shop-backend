# HN Studios — backend

A small Express server that gives the site a real backend:

- `GET  /api/products` — product catalog (prices live here now, not in the frontend JS)
- `POST /api/checkout` — creates a real Stripe Checkout session from the cart
- `POST /api/webhook` — Stripe calls this when payment succeeds; marks the order paid + emails both sides
- `POST /api/contact` — replaces the formsubmit.co contact form
- `GET  /api/admin/orders`, `GET /api/admin/messages` — password-protected, used by `/admin`

Orders and contact messages are stored in a local SQLite file (`data.sqlite`), so you have a record of everything even if an email bounces.

## 1. Install

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in:

- **`STRIPE_SECRET_KEY`** — from the [Stripe dashboard](https://dashboard.stripe.com/test/apikeys) (start with the test key, `sk_test_...`)
- **`CHECKOUT_EMAIL`** — where you want order + enquiry notifications sent
- **`SMTP_*`** — your email provider's SMTP credentials (Gmail App Password, Resend, Postmark, SES, etc.) so the server can actually send mail. Leave blank while testing — emails will just print to the console instead.
- **`ADMIN_USER` / `ADMIN_PASSWORD`** — login for the `/admin` page
- **`STRIPE_WEBHOOK_SECRET`** — see step 3 below

## 2. Run it locally

```bash
npm run dev
```

Server starts at `http://localhost:3000`. Visit `http://localhost:3000/health` to confirm it's up, and `http://localhost:3000/admin` to see the (empty) admin dashboard.

## 3. Wire up Stripe webhooks (needed for orders to actually mark as paid)

Install the [Stripe CLI](https://docs.stripe.com/stripe-cli), then:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhook
```

This prints a `whsec_...` value — put that in `.env` as `STRIPE_WEBHOOK_SECRET` and restart the server. Now when you complete a test checkout, the CLI forwards Stripe's event to your server and the order flips to `paid`.

Use Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC.

## 4. Point the frontend at it

In `site.html`, near the top of the `<script>` block, there's:

```js
const API_BASE = 'http://localhost:3000';
```

Change this to wherever you deploy the backend (step 5). During local development the default is fine as long as both are running on your machine.

## 5. Deploy

This server keeps state in a local SQLite file, so it needs a host that runs a persistent Node process with a writable disk — **not** a serverless platform like Vercel/Netlify functions (those don't persist files between requests). Good fits:

- **[Render](https://render.com)** — free tier, connects to a GitHub repo, auto-deploys on push
- **[Railway](https://railway.app)**
- **[Fly.io](https://fly.io)**
- Any basic VPS (DigitalOcean, Hetzner, etc.) running `node server.js` behind a process manager like `pm2`

Whichever you pick:

1. Push this `backend/` folder to a GitHub repo (or deploy directly).
2. Set the same environment variables from `.env` in the host's dashboard — **do not** commit `.env`.
3. Set `FRONTEND_URL` to your real site's URL (so Stripe redirects and CORS work).
4. In the Stripe dashboard, add a **live** webhook endpoint pointing at `https://your-backend-url/api/webhook`, subscribed to `checkout.session.completed`, and copy its signing secret into `STRIPE_WEBHOOK_SECRET` on the host.
5. Switch `STRIPE_SECRET_KEY` to your live secret key once you're ready to take real payments.
6. Serve `site.html` from any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages) with `API_BASE` pointing at the backend URL from step 2.

## Notes

- Prices are computed **server-side** in `lib/catalog.js` — the browser only ever sends product/size IDs, never amounts, so nobody can tamper with checkout totals from dev tools.
- `data.sqlite` is your database. Back it up periodically, or swap `db.js` for Postgres later if you outgrow SQLite (the query surface is small).
- The honeypot field (`_honey`) from the old contact form is preserved for basic bot filtering.
