# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Full-stack TypeScript appointment scheduling platform. Single unified Express server serves both the REST API and Vite-powered React frontend on **port 5000**.

- **Frontend**: React 18 + Vite + Tailwind CSS + Shadcn/ui (Wouter for routing)
- **Backend**: Express.js + TypeScript (via `tsx`)
- **Database**: PostgreSQL via Neon Serverless (`@neondatabase/serverless` + WebSocket driver)
- **ORM**: Drizzle ORM (schema at `shared/schema.ts`)

### Required secrets

| Secret | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string (or constructed from `PGHOST`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`) |
| `SESSION_SECRET` | Express session encryption key |

Optional: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_CALENDAR_ID`, `GOOGLE_ARCHIVE_CALENDAR_ID`, `GMAIL_EMAIL`, `GMAIL_APP_PASSWORD`, `NOTIFICATION_EMAIL`.

### Running the dev server

```bash
# Construct DATABASE_URL from PG* vars if not set directly
export DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT:-5432}/${PGDATABASE}?sslmode=require"
npm run dev
```

The server starts on **port 5000** and serves both API (`/api/*`) and the React frontend.

### Key gotchas

- The app uses `@neondatabase/serverless` with WebSocket transport (`neonConfig.webSocketConstructor = ws`). This driver connects via WebSocket to the Neon proxy and **does not work with a local PostgreSQL instance**. You must use a Neon-hosted database.
- `DATABASE_URL` must be constructed from `PGHOST`/`PGUSER`/`PGPASSWORD`/`PGDATABASE` env vars with `?sslmode=require`.
- `drizzle-kit push` is interactive and will prompt for confirmation if schema changes affect existing data. The existing Neon database already has the schema; avoid running `db:push` unless schema changes are needed.
- `npm run check` (`tsc --noEmit`) reports pre-existing type errors in `server/storage.ts`, `server/utils/csv.ts`, `server/vite.ts`, and `shared/schema.ts`. These do not block runtime.
- Node.js 20 is required (per `.replit` config).
- The project uses `package-lock.json`, so use `npm install` for dependency management.

### Scripts reference

See `package.json` for available scripts: `dev`, `build`, `start`, `check`, `db:push`.
