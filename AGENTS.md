## Cursor Cloud specific instructions

### Overview

This is a full-stack Appointment Scheduling and Business Management Platform:
- **Frontend**: React 18 + Vite + TypeScript + Shadcn/UI on port 5000
- **Backend**: Express.js + TypeScript (tsx runtime) on port 5000
- **Database**: PostgreSQL via `@neondatabase/serverless` + Drizzle ORM (hosted on Neon)
- Single process serves both API and frontend (`npm run dev`).

### Running the dev server

Required environment variables (set as Cursor secrets): `DATABASE_URL`, `SESSION_SECRET`. Then:
```bash
npm run dev
```
The server listens on port 5000.

### Important: NODE_ENV must not be `production` during `npm install`

The environment may have `NODE_ENV=production` set, which causes `npm install` to skip devDependencies (drizzle-kit, vite, typescript, etc.). Always run:
```bash
unset NODE_ENV && npm install
```

### Pushing database schema

The Neon database already has the schema. If schema changes are needed:
```bash
npx drizzle-kit push --force
```
Note: `drizzle-kit push` uses the standard `pg` driver (TCP), not the Neon WebSocket driver. It may prompt interactively if tables already have data — be prepared to handle that or skip the prompt.

### Key scripts

See `package.json` for all scripts:
- `npm run dev` — Start development server (Express + Vite HMR)
- `npm run check` — TypeScript type check (`tsc --noEmit`)
- `npm run build` — Production build (Vite + esbuild)
- `npm run db:push` — Push Drizzle schema to database

### Known issues

- `npm run check` reports pre-existing TypeScript errors (null assignability in form components). These do not block the app from running.
- The appointment creation form (`AppointmentForm.tsx:323`) has a pre-existing bug where `providers?.map` fails. This is a codebase issue, not an environment issue.

### Optional external services

Google Calendar, Gmail/SendGrid email, and Anthropic AI integrations are optional. The app gracefully degrades without their credentials.
