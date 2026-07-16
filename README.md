# OpsTrace — Thammachart Seafood Retail

Internal operations app for Thammachart Seafood Retail, built with [Base44](https://base44.com), React, Vite, Tailwind CSS, and shadcn/ui. It bundles three workspaces behind a single login:

- **Operations** — dashboard, PO/invoice discrepancy tracking, workload tracker, and reports (PDF export included)
- **Shipment Tracker** — shipment list and calendar with document drop zones
- **Sourcing CRM** — sourcing projects, supplier database and approvals, quotations, samples, follow-ups, documents/certs, daily tasks, and an AI advisor

Data, auth, and backend functions are provided by the Base44 platform; entity schemas live in [`base44/entities/`](base44/entities/) and server functions in [`base44/functions/`](base44/functions/).

## Getting started

**Prerequisites:** Node.js 18+ and npm.

1. Install dependencies:

   ```sh
   npm install
   ```

2. Configure the environment. Copy `.env.example` to `.env.local` and fill in your Base44 app credentials:

   ```sh
   cp .env.example .env.local
   ```

   | Variable | Description |
   | --- | --- |
   | `VITE_BASE44_APP_ID` | Your Base44 app ID |
   | `VITE_BASE44_APP_BASE_URL` | Your app's backend URL, e.g. `https://my-app-12345678.base44.app` |

3. Run the dev server:

   ```sh
   npm run dev
   ```

   The app runs at http://localhost:5173. API requests are proxied to your Base44 backend, so a valid `VITE_BASE44_APP_BASE_URL` is required for data to load.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint (errors only) |
| `npm run lint:fix` | Run ESLint and auto-fix |
| `npm run typecheck` | Run `tsc` over the JS sources (`checkJs`) — currently reports pre-existing errors from the untyped Base44 export |

## Project structure

```
base44/            Base44 platform config: entity schemas + server functions
src/
  api/             Base44 SDK client
  components/      Feature components (grouped by domain) + shadcn/ui in ui/
  hooks/           Shared hooks
  lib/             Auth context, query client, app params, utilities
  pages/           Top-level pages; sourcing/ holds the Sourcing CRM pages
  utils/           Page-URL helpers
```

Routing is in `src/App.jsx`: unauthenticated routes (`/login`, `/register`, `/forgot-password`, `/reset-password`) plus the protected `MainApp`, which switches between the three workspaces via a tab bar.

## Publishing

Changes pushed to this repo are reflected in the Base44 Builder. Open your app on [Base44.com](https://base44.com) and click **Publish** to deploy.

- Docs: https://docs.base44.com/Integrations/Using-GitHub
- Support: https://app.base44.com/support
