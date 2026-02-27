## Cursor Cloud specific instructions

### Overview

This is a full-stack Appointment Scheduling and Business Management Platform:
- **Frontend**: React 18 + Vite + TypeScript + Shadcn/UI on port 5000
- **Backend**: Express.js + TypeScript (tsx runtime) on port 5000
- **Database**: PostgreSQL via `@neondatabase/serverless` + Drizzle ORM
- Single process serves both API and frontend (`npm run dev`).

### Database setup (local PostgreSQL)

The codebase uses `@neondatabase/serverless` which connects via WebSocket, not standard TCP. To use a local PostgreSQL:

1. PostgreSQL must be running with **cleartext `password` auth** in `pg_hba.conf` (not `scram-sha-256`), because the Neon driver's `pipelineConnect: "password"` only supports cleartext auth.
2. A **WebSocket-to-TCP proxy** must run on port 443 (wss) to bridge the Neon driver to local PostgreSQL. A helper script exists at `.dev/neon-ws-proxy.mjs` for this. Start it with:
   ```
   sudo $(which node) /workspace/.dev/neon-ws-proxy.mjs &
   ```
3. Self-signed TLS certs are needed at `/tmp/ws-proxy-key.pem` and `/tmp/ws-proxy-cert.pem`. Generate with:
   ```
   openssl req -x509 -newkey rsa:2048 -keyout /tmp/ws-proxy-key.pem -out /tmp/ws-proxy-cert.pem -days 365 -nodes -subj '/CN=localhost'
   ```
4. Set `NODE_TLS_REJECT_UNAUTHORIZED=0` in the environment.

### Running the dev server

Required environment variables: `DATABASE_URL` (PostgreSQL connection string), `SESSION_SECRET` (any random string), and `NODE_TLS_REJECT_UNAUTHORIZED=0` (for the self-signed WS proxy cert). Then run `npm run dev`. The server listens on port 5000.

### Pushing database schema

Use drizzle-kit (standard `pg` driver, works directly over TCP without the WS proxy):
```bash
DATABASE_URL=$DATABASE_URL npx drizzle-kit push --force
```

### Key scripts

See `package.json` for all scripts. The important ones:
- `npm run dev` — Start development server (Express + Vite HMR)
- `npm run check` — TypeScript type check (`tsc --noEmit`)
- `npm run build` — Production build (Vite + esbuild)
- `npm run db:push` — Push Drizzle schema to database

### Known issues

- `npm run check` reports pre-existing TypeScript errors (null assignability in form components). These do not block the app from running.
- The `initializeDefaultProviders()` function in `server/storage.ts` may fail on startup with a null constraint violation. The app catches this error and continues serving.
- The appointment creation form (`AppointmentForm.tsx:323`) has a pre-existing bug where `providers?.map` fails because the providers data is not returned as an array from the API. This is a codebase issue, not an environment issue.

### Optional external services

Google Calendar, Gmail/SendGrid email, and Anthropic AI integrations are optional. The app gracefully degrades without their credentials.
