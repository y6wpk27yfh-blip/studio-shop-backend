# Studio shop backend

A small Node/Express backend for the art portfolio + shop site.

## Setup

1. Create a free Turso account at turso.tech, create a database, copy its Database URL and an Auth Token.
2. Create a free Render account at render.com, "New" -> "Web Service" -> connect this GitHub repo.
3. Free instance type. Build command npm install, start command npm start.
4. Add environment variables: ADMIN_PASSWORD, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN.
5. Deploy. Render gives you a live URL. The product catalogue seeds itself in on first boot.

## What's in here

- server.js - Express app
- db.js - Turso/libSQL connection + schema
- seed.js - loads starter artworks
- adminAuth.js - admin password auth
- routes/products.js - GET /api/products (public)
- routes/orders.js - POST /api/orders (checkout)
- routes/admin.js - artworks/variants/orders CRUD (protected)
- public/admin.html and public/admin.js - the admin panel, served at /admin

## Running locally

cd backend
npm install
cp .env.example .env
npm start

Visit http://localhost:4000/admin for the admin panel.

## Using the admin panel

- Add an artwork: type original, print, or both.
- Print sizes: add size, price, stock, edition size per artwork.
- Mark an original sold: click "Cycle status".
- Images: paste a link to a photo already hosted somewhere.
- Orders tab: view orders and update their status.

## Payment processing

Not included yet - orders record but don't take payment. Stripe Checkout is the natural next step once you have a Stripe account.
