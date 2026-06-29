# API Security Remediation

**App:** Appointment Scheduling Platform  
**Public URL:** https://scheduleing.replit.app/  
**Status:** CRITICAL — API is open to the internet  
**Date:** June 2026

---

## The Problem

The React frontend hides pages behind `ProtectedRoute`, but **the Express API has almost no server-side authentication**. Anyone on the internet can call API endpoints directly with `curl`, Postman, or a browser — no login required.

`isAuthenticated` middleware exists in `server/middleware/auth.ts` but is applied to **only one route**: `POST /api/conversation/analyze`. Every other `/api/*` route is unprotected.

### What an attacker can do right now

| Severity | Endpoint | Impact |
|----------|----------|--------|
| **CRITICAL** | `GET /api/appointments` | Download all appointments — client names, phone numbers, emails, addresses, revenue, deposits |
| **CRITICAL** | `GET /api/clients` | Download entire client database with PII |
| **CRITICAL** | `GET /api/providers` | Download provider HR data — compensation, credentials, emergency contacts |
| **CRITICAL** | `POST /api/appointments`, `PATCH`, `DELETE` | Create, modify, or delete appointments |
| **CRITICAL** | `POST /api/backup/restore/:backupName` | Overwrite the production database from a backup |
| **CRITICAL** | `POST /api/import/appointments` | Bulk inject fraudulent appointment data |
| **HIGH** | `GET /api/appointments/:id` | Read any single appointment's full financial and PII record |
| **HIGH** | `PATCH /api/appointments/:id/confirm-deposit-return` | Modify financial records without logging in |
| **HIGH** | `POST /api/auth/register` | Create new user accounts — open self-registration |
| **HIGH** | `GET /uploads/*` | Access provider photos and documents without auth |
| **MEDIUM** | `POST /api/test/email` | Trigger outbound emails via your Gmail account |
| **MEDIUM** | `POST /api/test/calendar` | Trigger Google Calendar API calls |
| **MEDIUM** | `GET /api/analytics/future-earnings` | Expose business revenue projections |
| **LOW** | Session cookie `secure: false` | Session cookies not marked secure in production |

### Proof of concept (run without logging in)

```bash
# Returns ALL appointments with client PII and financials
curl https://scheduleing.replit.app/api/appointments

# Returns ALL clients
curl https://scheduleing.replit.app/api/clients

# Anyone can register an account
curl -X POST https://scheduleing.replit.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"intruder","email":"intruder@example.com","password":"password123"}'
```

### Root cause

```
Browser UI  →  ProtectedRoute (client-side only)  →  blocks page render
curl/Postman →  Express API  →  NO auth check  →  full database access
```

The frontend sends `credentials: "include"` on API calls, but the server never validates the session on most routes. **UI protection is not API protection.**

### Affected files

- `server/routes.ts` — 44+ unprotected API routes
- `server/middleware/auth.ts` — `isAuthenticated` exists but barely used
- `server/middleware/session.ts` — `secure: false` on cookies
- `server/index.ts` — `/uploads` served as public static files
- `client/src/components/auth/ProtectedRoute.tsx` — client-side only, not a security boundary

---

## The Fix Plan

### Phase 1 — Immediate hotfix on Replit (deploy this week)

Seven changes, no database schema changes, no business logic changes.

#### 1. Global API auth middleware

Create `server/middleware/requireAuth.ts`:
- Apply to all `/api/*` routes in `server/routes.ts` immediately after `setupSession(app)`
- Return `401 Unauthorized` if `req.session.userId` is missing
- **Public allowlist** (skip auth check):
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
  - `POST /api/auth/register` (gated separately — see item 3)
  - `GET /api/public/appointments/:id/deposit-status` (token required — see item 2)
  - `PATCH /api/public/appointments/:id/confirm-deposit-return` (token required — see item 2)

#### 2. Secure the deposit-return email flow

Staff click a link in cancellation emails to confirm deposit refunds. This must work without a login, but must NOT expose full appointment data.

**Add** `server/middleware/depositToken.ts`:
- `generateDepositConfirmToken(appointmentId)` — HMAC-SHA256 signed token with 30-day expiry
- `validateDepositConfirmToken(appointmentId, token)` — verify signature and expiry
- Secret: `DEPOSIT_CONFIRM_SECRET` env var (fallback to `SESSION_SECRET`)

**Add public endpoints** in `server/routes.ts`:
- `GET /api/public/appointments/:id/deposit-status?token=...`
  - Validates token, returns ONLY: `id`, `clientName`, `depositAmount`, `depositReturnAmount`, `depositReturned`
- `PATCH /api/public/appointments/:id/confirm-deposit-return?token=...`
  - Validates token, calls existing `storage.confirmDepositReturn(id)`

**Update** `server/services/emailService.ts` (line ~232):
```typescript
// Before:
const confirmUrl = `${baseUrl}/confirm-deposit-return/${appointment.id}`;
// After:
const token = generateDepositConfirmToken(appointment.id);
const confirmUrl = `${baseUrl}/confirm-deposit-return/${appointment.id}?token=${token}`;
```

**Update** `client/src/pages/confirm-deposit-return.tsx`:
- Read `token` from `window.location.search`
- Call `/api/public/appointments/:id/deposit-status?token=...` instead of `/api/appointments/:id`
- Call `/api/public/appointments/:id/confirm-deposit-return?token=...` instead of the old PATCH endpoint

**Remove** unauthenticated access to `GET /api/appointments/:id` and `PATCH /api/appointments/:id/confirm-deposit-return`.

#### 3. Disable open registration

Add Replit secret: `ALLOW_REGISTRATION=false`

In `registerHandler` (`server/middleware/auth.ts`):
```typescript
if (process.env.ALLOW_REGISTRATION !== 'true') {
  return res.status(403).json({ message: 'Registration is disabled' });
}
```

Optionally hide the Register tab in `client/src/pages/auth.tsx` when registration is disabled.

#### 4. Auth-gate dangerous endpoints

These routes must require `isAuthenticated` (covered by global middleware after item 1):
- `GET /api/backup/list`
- `POST /api/backup/restore/:backupName`
- `POST /api/import/validate`
- `POST /api/import/appointments`
- `POST /api/import/preview`
- `POST /api/import/secure`

**Delete or dev-only gate** test endpoints:
- `POST /api/test/email` — return 404 in production, or require auth + `NODE_ENV=development`
- `POST /api/test/calendar` — same

#### 5. Protect uploaded files

In `server/index.ts`:
- **Remove:** `app.use('/uploads', express.static('uploads'))`

In `server/routes.ts`, add authenticated file serving:
```typescript
app.get('/api/uploads/*', isAuthenticated, (req, res) => {
  const filePath = path.join('uploads', req.params[0]);
  // validate path doesn't escape uploads/ directory (no ..)
  res.sendFile(path.resolve(filePath));
});
```

Update any frontend references from `/uploads/...` to `/api/uploads/...` (provider photos, documents).

#### 6. Harden session cookies

In `server/middleware/session.ts`, change:
```typescript
secure: false  // REMOVE THIS
```
To:
```typescript
secure: process.env.NODE_ENV === 'production',
```

#### 7. Rate limit auth endpoints

```bash
npm install express-rate-limit
```

In `server/routes.ts`, before auth routes:
```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many attempts, please try again later' },
});

app.post('/api/auth/login', authLimiter, loginHandler);
app.post('/api/auth/register', authLimiter, registerHandler);
```

### Phase 2 — Verify after deploy

Run without being logged in. All must return `401` or `403`:

```bash
curl -s -o /dev/null -w "%{http_code}" https://scheduleing.replit.app/api/appointments
# Expected: 401

curl -s -o /dev/null -w "%{http_code}" https://scheduleing.replit.app/api/clients
# Expected: 401

curl -s -o /dev/null -w "%{http_code}" https://scheduleing.replit.app/api/providers
# Expected: 401

curl -s -o /dev/null -w "%{http_code}" -X POST https://scheduleing.replit.app/api/backup/restore/test
# Expected: 401

curl -s -o /dev/null -w "%{http_code}" -X POST https://scheduleing.replit.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"password123"}'
# Expected: 403
```

Then log in via the browser and confirm:
- Dashboard loads appointments
- Creating/editing appointments works
- Provider photos still display
- Analytics page works
- Cancel an appointment → email link with `?token=...` → deposit confirm page works

### Phase 3 — Carry to Vercel migration

When moving to Vercel, keep the same `requireAuth` middleware pattern. Never rely on frontend `ProtectedRoute` as the only security layer.

### Replit secrets to add

| Secret | Value | Purpose |
|--------|-------|---------|
| `ALLOW_REGISTRATION` | `false` | Block open self-registration |
| `DEPOSIT_CONFIRM_SECRET` | (random 32+ char string) | Sign deposit-return email tokens |

---

## Replit Agent Prompt

Copy everything below this line and paste it into Replit Agent.

---

```
URGENT SECURITY FIX — Lock down the open API on this Express + React app.

## Context
This app is live at https://scheduleing.replit.app/. The Express API in server/routes.ts has almost no authentication. Anyone on the internet can call GET /api/appointments, GET /api/clients, POST /api/backup/restore, etc. without logging in. The React frontend uses ProtectedRoute but that is client-side only and does NOT protect the API.

isAuthenticated middleware exists in server/middleware/auth.ts but is only used on POST /api/conversation/analyze.

## Rules
- Do NOT change any business/financial calculation logic (revenueService, storage revenue fields, etc.)
- Do NOT change the database schema
- Do NOT break the deposit-return email flow — staff click a link in cancellation emails to confirm refunds
- List every file you create or modify when done
- After implementing, tell me which Replit secrets to add

## Tasks (implement all 7)

### Task 1: Global API auth middleware
Create server/middleware/requireAuth.ts with a requireAuthUnlessPublic middleware that:
- Checks req.session.userId — return 401 if missing
- Skips auth for these public paths only:
  - POST /api/auth/login
  - POST /api/auth/logout
  - GET /api/auth/me
  - POST /api/auth/register (gated in Task 3)
  - GET /api/public/appointments/:id/deposit-status (Task 2)
  - PATCH /api/public/appointments/:id/confirm-deposit-return (Task 2)

Mount it in server/routes.ts immediately after setupSession(app):
  app.use('/api', requireAuthUnlessPublic);

### Task 2: Secure deposit-return flow with signed tokens
Create server/middleware/depositToken.ts:
- generateDepositConfirmToken(appointmentId: number): string
- validateDepositConfirmToken(appointmentId: number, token: string): boolean
- Use HMAC-SHA256 with secret from process.env.DEPOSIT_CONFIRM_SECRET || process.env.SESSION_SECRET
- Token format: base64url(JSON({ id, exp })) + '.' + HMAC signature
- Expiry: 30 days

Add two new PUBLIC routes in server/routes.ts (before the global auth middleware, or in the public allowlist):

GET /api/public/appointments/:id/deposit-status?token=...
- Validate token, return 401 if invalid
- Return ONLY: { id, clientName, depositAmount, depositReturnAmount, depositReturned }

PATCH /api/public/appointments/:id/confirm-deposit-return?token=...
- Validate token, return 401 if invalid
- Call storage.confirmDepositReturn(id), return updated appointment (minimal fields)

Update server/services/emailService.ts (~line 232):
- Import generateDepositConfirmToken
- Change confirm URL from:
    ${baseUrl}/confirm-deposit-return/${appointment.id}
  To:
    ${baseUrl}/confirm-deposit-return/${appointment.id}?token=${generateDepositConfirmToken(appointment.id)}

Update client/src/pages/confirm-deposit-return.tsx:
- Parse token from URL query string (use URLSearchParams)
- Call GET /api/public/appointments/:id/deposit-status?token=... instead of GET /api/appointments/:id
- Call PATCH /api/public/appointments/:id/confirm-deposit-return?token=... instead of old endpoint
- Show clear error if token is missing or invalid

### Task 3: Disable open registration
In registerHandler (server/middleware/auth.ts), at the top:
  if (process.env.ALLOW_REGISTRATION !== 'true') {
    return res.status(403).json({ message: 'Registration is disabled' });
  }

### Task 4: Auth-gate dangerous endpoints
These are now protected by Task 1 global middleware. Additionally:
- POST /api/test/email — return 404 when NODE_ENV === 'production'
- POST /api/test/calendar — return 404 when NODE_ENV === 'production'

### Task 5: Protect uploaded files
In server/index.ts:
- REMOVE: app.use('/uploads', express.static('uploads'));

In server/routes.ts, add:
  app.get('/api/uploads/*', isAuthenticated, (req, res) => {
    const relativePath = req.params[0];
    if (!relativePath || relativePath.includes('..')) {
      return res.status(400).json({ message: 'Invalid path' });
    }
    const filePath = path.resolve('uploads', relativePath);
    if (!filePath.startsWith(path.resolve('uploads'))) {
      return res.status(400).json({ message: 'Invalid path' });
    }
    res.sendFile(filePath, (err) => {
      if (err) res.status(404).json({ message: 'File not found' });
    });
  });

Search the codebase for any frontend references to /uploads/ paths and update them to /api/uploads/ so photos and documents still load for logged-in users.

### Task 6: Harden session cookies
In server/middleware/session.ts, change:
  secure: false
To:
  secure: process.env.NODE_ENV === 'production'

### Task 7: Rate limit auth endpoints
Run: npm install express-rate-limit

In server/routes.ts, add rate limiting to login and register:
  import rateLimit from 'express-rate-limit';
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { message: 'Too many attempts' } });
  app.post('/api/auth/login', authLimiter, loginHandler);
  app.post('/api/auth/register', authLimiter, registerHandler);

Note: if auth routes are registered before the global middleware, keep that order. The rate limiter goes on the individual route handlers.

## Replit secrets to add after deploy
- ALLOW_REGISTRATION = false
- DEPOSIT_CONFIRM_SECRET = (generate a random 32+ character string)

## Verification (run after deploy)
Without logging in, these must return 401 or 403:
  curl https://scheduleing.replit.app/api/appointments
  curl https://scheduleing.replit.app/api/clients
  curl -X POST https://scheduleing.replit.app/api/backup/restore/test
  curl -X POST https://scheduleing.replit.app/api/auth/register -H "Content-Type: application/json" -d '{"username":"x","email":"x@y.com","password":"password123"}'

After logging in via browser, confirm dashboard, appointments, provider photos, and analytics all still work.
Cancel a test appointment and verify the email link with ?token=... still opens the deposit confirm page.
```

---

## Files Changed Summary

| File | Action |
|------|--------|
| `server/middleware/requireAuth.ts` | CREATE — global auth gate |
| `server/middleware/depositToken.ts` | CREATE — HMAC token for email links |
| `server/middleware/auth.ts` | MODIFY — disable registration |
| `server/middleware/session.ts` | MODIFY — secure cookies in production |
| `server/routes.ts` | MODIFY — mount auth, add public deposit endpoints, protect uploads |
| `server/index.ts` | MODIFY — remove public /uploads static |
| `server/services/emailService.ts` | MODIFY — token in confirm URL |
| `client/src/pages/confirm-deposit-return.tsx` | MODIFY — use token + public endpoints |
| `package.json` | MODIFY — add express-rate-limit |

---

## Recommended follow-up (not in this hotfix)

- Rotate `SESSION_SECRET` and all API keys if they were ever committed to git
- Add `.env` to `.gitignore` (currently untracked but not ignored)
- Consider role-based access when you have multiple user types
- Apply same auth pattern when migrating to Vercel