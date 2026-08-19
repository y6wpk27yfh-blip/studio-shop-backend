# Studio website — backend + admin panel setup guide

This turns your "Be Back Soon" page into a real website with an admin
panel where you can add/edit/delete shop products and change the headline,
tagline, about text, contact email, and Instagram link — no code needed
after today.

**How it fits together:** one small server does three jobs at once —
it shows your website, it runs the `/admin` control panel, and it stores
everything in a database (Turso). Because it's all one server, anything
you change in `/admin` appears on the live site the moment you refresh
it. There's nothing separate to "sync."

Everything below is done entirely in Safari/Chrome on your iPad — no
terminal, no laptop required.

---

## Part 1 — Put the code on GitHub

1. Go to [github.com](https://github.com) and create a free account if
   you don't have one.
2. Tap the **+** in the top right → **New repository**.
3. Name it `studio-website` (any name works), leave it **Public** or
   **Private** (your choice), don't add a README, and tap **Create repository**.
4. On the new repo's page, tap **uploading an existing file** (or
   **Add file → Upload files**).
5. From the files I've given you, drag/upload the **whole folder
   contents** — every file and folder (`public/`, `server.js`, `db.js`,
   `package.json`, `.env.example`, this guide) — keeping the same folder
   structure. On an iPad, open the Files app, select all the files, and
   share/upload them into the GitHub upload box.
   - GitHub's upload box supports dragging folders in Safari; if a
     folder doesn't upload as a folder, upload the files one by one and
     type the folder path (e.g. `public/admin/index.html`) into the
     filename box before uploading.
6. Scroll down, add a commit message like "Initial upload", and tap
   **Commit changes**.

You now have a repo with this structure:
```
studio-website/
  server.js
  db.js
  package.json
  .env.example
  public/
    index.html
    admin/
      index.html
```

---

## Part 2 — Create your database (Turso)

1. Go to [turso.tech](https://turso.tech) and sign up (you can sign up
   with your GitHub account — easiest on iPad).
2. In the dashboard, go to **Databases** → **New Database** (or
   **Create Database**).
3. Give it a name, e.g. `studio-db`, pick the default region, and tap
   **Create**.
4. Once it's created, open the database and find the **Connect** /
   **Details** panel. Copy the **Database URL** — it looks like
   `libsql://studio-db-yourname.turso.io`.
5. Still on that panel, tap **Generate Token** (sometimes called
   **Create Token**). Copy the long token string it gives you.
6. Save both of these somewhere safe (Notes app is fine) — you'll paste
   them into Render in the next step:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`

You don't need to create any tables manually — the server creates them
automatically the first time it starts, and fills them with your current
products/text as a starting point.

---

## Part 3 — Deploy the backend on Render

1. Go to [render.com](https://render.com) and sign up (again, GitHub
   sign-in is easiest).
2. From the dashboard, tap **New +** → **Web Service**.
3. Choose **Build and deploy from a Git repository**, then connect your
   GitHub account if asked, and select the `studio-website` repo.
4. Fill in the settings:
   - **Name:** `studio-website` (this becomes part of your URL)
   - **Region:** closest to your visitors
   - **Branch:** `main`
   - **Root Directory:** leave blank
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free is fine to start
5. Scroll to **Environment Variables** and add these one at a time
   (**Add Environment Variable**):

   | Key | Value |
   |---|---|
   | `TURSO_DATABASE_URL` | (paste from Part 2) |
   | `TURSO_AUTH_TOKEN` | (paste from Part 2) |
   | `ADMIN_PASSWORD` | any password you'll remember |
   | `ADMIN_SECRET` | any long random text, e.g. mash your keyboard for 30 characters |
   | `NODE_ENV` | `production` |

6. Tap **Create Web Service**. Render will install everything and start
   your server — this takes 2–5 minutes. Watch the log; when it says
   `Server running on port ...` you're live.
7. Render gives you a URL like `https://studio-website.onrender.com` —
   that is now your real, live website.

**Note on the free tier:** Render's free web services "sleep" after 15
minutes of no traffic and take ~30–60 seconds to wake up on the next
visit. That's fine for testing; if it matters for real customers later,
Render's cheapest paid tier ($7/mo) keeps it always-on.

---

## Part 4 — Log into your admin panel

1. Visit `https://YOUR-RENDER-URL.onrender.com/admin`.
2. Enter the `ADMIN_PASSWORD` you set in Part 3.
3. From here you can:
   - **Products tab:** add, edit, or delete shop items (originals and
     prints), set prices, and reorder them.
   - **Site Content tab:** change the headline, tagline, about text,
     contact email, and Instagram link.
   - **Orders tab:** see a log of orders placed through the "Checkout"
     button on the shop (this is separate from the email you already
     get via the contact form).
4. Tap **Save**, then open your live site in another tab and refresh —
   your change is there.

---

## Part 5 — Making future changes

Any time you want to change a picture's price, add a new piece, fix a
typo in the About text, etc: just go to `/admin`, log in, and edit it.
You never need to touch GitHub or Render again for content changes.

You'd only go back to GitHub/Render if you want to change how the site
*works* (new features, layout changes) — for that, come back to me with
the request and I'll give you updated files to upload the same way as
Part 1, and Render will redeploy automatically within a minute or two
of the GitHub files changing.

---

## Appendix — Adding a custom domain later

Once you buy a domain (e.g. from Namecheap, GoDaddy, Google Domains):
1. In Render, open your service → **Settings** → **Custom Domains** →
   **Add Custom Domain**, and type your domain.
2. Render shows you a DNS record (usually a `CNAME` or `A` record) to
   add.
3. Go to wherever you bought the domain, find **DNS settings**, and add
   that exact record.
4. Wait 10 minutes–a few hours for it to propagate. Render will show a
   green checkmark once it's connected, and will automatically issue a
   free HTTPS certificate.

---

## Appendix — Adding Stripe for real payments (when you're ready)

Right now "Checkout" on the shop logs an order in `/admin` and emails
you via the same contact form service — no card is charged. Here's the
outline for wiring up real payments later; come back and I can write the
exact code when you're ready:

1. **Create a Stripe account** at [stripe.com](https://stripe.com) and
   finish their verification (bank details, business info).
2. **Get your API keys**: Stripe Dashboard → **Developers** → **API
   keys**. You'll use the **Secret key** (starts `sk_`) — never the
   publishable key — for this integration.
3. **Add the key to Render**: Environment → add `STRIPE_SECRET_KEY`
   with that value, exactly like the Turso variables in Part 3.
4. **Server change**: the backend adds one endpoint,
   `POST /api/checkout`, that takes the cart and asks Stripe to create
   a "Checkout Session" (Stripe's own hosted, secure payment page — you
   never handle card numbers directly). The response includes a URL;
   the site redirects the customer there.
5. **Webhook**: Stripe needs a way to tell your server "this order was
   paid." You add a `STRIPE_WEBHOOK_SECRET` env var and a
   `POST /api/webhook` endpoint that Stripe calls automatically after
   payment — this is what marks the order "paid" in `/admin`.
6. **Test mode first**: Stripe gives you fake test card numbers so you
   can place practice orders before going live — always test end-to-end
   before flipping the switch to real payments.

This is roughly 1–2 hours of focused work when you're ready — just let
me know and I'll write the code and the exact click-by-click steps for
the Stripe dashboard.
