# OpsTrace — Thammachart Seafood Retail

Self-hosted operations app for Thammachart Seafood Retail: React + Vite + Tailwind CSS + shadcn/ui on the front end, with its own Node.js (Express + SQLite) backend. **No external platform required** — data, logins, and file uploads all live on your own server.

Three workspaces behind a single login:

- **Operations** — dashboard, PO/invoice discrepancy tracking, workload tracker, and reports (PDF export included)
- **Shipment Tracker** — shipment list and calendar with document drop zones
- **Sourcing CRM** — sourcing projects, supplier database and approvals, quotations, samples, follow-ups, documents/certs, daily tasks, and an AI advisor

## Quick start

**Prerequisites:** Node.js 18+ and npm.

```sh
npm install          # install dependencies
npm run seed         # optional: load demo data (creates demo@thammachart.co.th / demo12345)
npm run build        # build the frontend
npm start            # serve the app at http://localhost:3001
```

Open http://localhost:3001, log in with the demo account (or click **Create one** to register — the **first registered user becomes admin**).

### Development mode

```sh
npm run dev          # runs the API server (:3001) and Vite dev server (:5173) together
```

Open http://localhost:5173 — API requests are proxied to the server automatically.

## Configuration (all optional)

Copy `.env.example` for the full list. The important ones:

| Variable | Enables |
| --- | --- |
| `ANTHROPIC_API_KEY` | AI features: AI Advisor, project briefs, email drafts, document auto-classification |
| `SMTP_URL` (+ `SMTP_FROM`) | Outgoing email (report sending, sourcing emails) |
| `DATA_DIR` | Where the SQLite database + uploads are stored (default `server/data/`) |
| `PORT`, `APP_URL`, `COOKIE_SECURE` | Deployment settings |

Without `ANTHROPIC_API_KEY` the AI buttons show a friendly "AI not configured" message; without `SMTP_URL` password resets print the reset link to the server log and email sending is skipped.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | API server + Vite dev server together |
| `npm run build` | Production frontend build into `dist/` |
| `npm start` | Run the server (serves `dist/` + API) |
| `npm run seed` | Load demo data (`--reset` wipes records first: `node server/seed.js --reset`) |
| `npm run lint` / `lint:fix` | ESLint |

## Architecture

```
server/            Express backend
  index.js         App entry: API + static frontend serving
  db.js            SQLite setup (better-sqlite3), entity registry
  auth.js          Cookie-session auth: register/login/logout/password reset
  entities.js      Generic CRUD API for all entities (/api/entities/:name)
  integrations.js  File uploads, email (SMTP), AI (Anthropic Claude)
  seed.js          Demo data
  data/            SQLite database + uploaded files (gitignored)
base44/entities/   Entity schemas (JSONC) — the API only accepts these entities
src/
  api/base44Client.js   API client (same interface the UI always used)
  components/      Feature components + shadcn/ui
  lib/             Auth context, query client, utilities
  pages/           Pages; sourcing/ holds the Sourcing CRM
```

- **Database:** single SQLite file — zero setup, easy backup (copy `server/data/`).
- **Auth:** salted scrypt password hashes, httpOnly session cookies, first user = admin.
- **Files:** stored on disk under `server/data/uploads`, served only to logged-in users.
- **AI:** server-side calls to the Anthropic API (Claude); the key never reaches the browser.

## Deploying

Any Node.js host works (a small VPS, Railway, Render, Fly.io):

1. `npm install && npm run build`
2. Set env vars (at minimum consider `COOKIE_SECURE=true` behind HTTPS and a persistent `DATA_DIR`)
3. `npm start` (put it behind a reverse proxy such as Caddy or Nginx for HTTPS)

Make sure `DATA_DIR` is on a persistent disk — it holds the database and all uploaded documents.

## History

This app was originally built on [Base44](https://base44.com) and exported; the Base44 backend has been fully replaced by the self-hosted server in `server/`. The entity schemas in `base44/entities/` are kept as the data-model reference.
