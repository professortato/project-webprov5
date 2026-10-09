# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

"Sakura" (ซากุระ) is a Japanese-restaurant table-tablet ordering system with four roles: customer (tablet per table), kitchen, service (waiters), and cashier. It is a server-rendered Express 5 + EJS app backed by SQLite (`food.db`). The UI text, DB status values, and comments are in Thai. The README (Thai) holds the user-facing setup and flow docs.

## Commands

- `npm install`: install dependencies (`sqlite3` is a native module)
- `npm start`: run `node index.js` on `http://localhost:3000` (override with the `PORT` env var)
- `npm run dev`: run with nodemon auto-reload

There are no tests, linter, or build step.

## Architecture

**All server code lives in `index.js`.** It contains the config, DB schema and seed data, helpers, and every route, grouped by `// ---------- ROLE ----------` section comments. Views in `views/` are plain EJS templates. `public/` is served at `/public` and holds `style.css`, the food images in `public/Pic/`, `customer.js` (a hidden staff escape: long-press the `.brand-mark` logo to go back to `/`), and the vendored `qrcode.min.js`. The QR library is bundled so the app works without internet access.

**Config constants at the top of `index.js`:** `RESTAURANT` (name and PromptPay number), `STAFF_PIN` (an empty string disables the PIN), `TABLES` (16 tables), and `CATEGORIES`.

**DB lifecycle (`initDb`, which runs before `listen`):**
- Tables are created with `CREATE TABLE IF NOT EXISTS`.
- On every start, the `addon` table is wiped and reseeded from the `addonData` array.
- The `menu` table is reseeded from `menuNames` only when its row count differs. Editing menu names or prices therefore needs a count change or a manual reset of `menu`.
- A legacy migration drops `menu`/`addon` if they lack `category_id` (an old schema stored `category` as TEXT).
- Images are resolved by `localImage()` by matching `public/Pic/<prefix>_<n>.*` (`sushi_`, `fried_`, `noodle_`, `snack_`, `drink_`) against the item's index within its category. The file extension can vary.
- `food.db` is committed to git and changes whenever the app runs.
- The schema has 7 tables, and all relations are 1:N FKs. `ERD.drawio` documents it.
- The `run`/`get`/`all` helpers are Promise wrappers over sqlite3.

**Order state machine:** `orders.status` uses Thai string literals, so match them exactly.
`กำลังทำ` (cooking) → `/kitchen/done` → `พร้อมเสิร์ฟ` (ready) → `/service/served` → `เสิร์ฟแล้ว` (served) → `/payment/confirm` → `ชำระแล้ว` (paid).
- Each transition's UPDATE is guarded with `WHERE status=<previous>` so a double-tap cannot move an order backwards. Keep this guard on any new transition.
- A bill can only be closed when every unpaid order for the table is `เสิร์ฟแล้ว` (`billForTable().allServed`).
- Paying marks the orders `ชำระแล้ว` and sets `tables_status` back to `ว่าง` (free). Placing an order sets it to `ไม่ว่าง` (occupied).
- Customer views hide paid orders, but the rows stay in the DB for reporting.

**Cart and session:**
- The cart lives only in `req.session.cart` (express-session, in-memory store) until `/confirm-order` writes `orders` and `order_items` rows.
- Add-on prices are recomputed server-side from DB IDs, filtered to the menu item's category. Never trust client prices.
- `order_items` denormalizes the item name and price and stores the selected add-ons as JSON in `addons`.
- The table number comes from `?table=` or the session, normalized by `tableNo()`.
- A middleware sets `res.locals.restaurant`, `cartCount`, and `cartTotal` for every view.

**Real-time sync:**
- `GET /events` is a Server-Sent Events stream. `broadcast()` sends a payload-less `update` message to every client.
- The kitchen, service, cashier, and orders views open an `EventSource` and simply `location.reload()` (debounced) when a message arrives. They also reload every 60s as a fallback.
- Any route that mutates order or table state must call `broadcast()`.

**Auth:** staff routes use the `requireStaff` middleware, which checks the `req.session.staff` flag set by `/staff/login` with `STAFF_PIN`. Customer routes are unauthenticated.

**PromptPay QR:** `promptpayPayload()` builds an EMVCo payload with CRC16 server-side. The payment view renders it client-side with `qrcode.min.js`.

**Deployment model:** one machine runs the server on the shop LAN, and the other devices open `http://<server-ip>:3000`. Customer tablets are bookmarked to `/?table=N`.
