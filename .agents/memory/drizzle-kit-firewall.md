---
name: drizzle-kit unavailable / db:push blocked
description: Why npm run db:push fails in this repl and how the post-merge script copes
---

# drizzle-kit cannot be installed in this environment

`npm run db:push` (which runs `drizzle-kit push`) fails because `drizzle-kit`
is not installed and cannot be installed: its transitive dependency
`shell-quote@1.8.2` is blocked by the Replit package security firewall
(Critical CVE, HTTP 403 from `package-firewall.replit.local`).

`drizzle-kit` is only in `devDependencies`, and `NODE_ENV=production` here, so a
plain `npm install` skips it. Forcing `npm install --include=dev` fails on the
firewall block.

**Why:** Platform security control — do not retry the install (per
package-management skill, a 403 from the package firewall is a hard block). We
also cannot edit `package.json` per project rules.

**How to apply:**
- Do not rely on `db:push` succeeding in post-merge or CI-style automation here.
- `scripts/post-merge.sh` runs `db:push -- --force` only when
  `node_modules/.bin/drizzle-kit` exists, otherwise it logs and skips so merges
  don't fail.
- Schema is NOT auto-applied: `server/index.ts` startup only ensures the
  `_drizzle_migrations` table exists via raw SQL; it does not push the full
  schema. Real schema changes need a working `db:push`, which is currently
  blocked — flag this to the user if a schema change is required.

# Neon endpoint can be disabled (separate issue)

The DATABASE_URL Neon endpoint can become disabled after inactivity
("The endpoint has been disabled. Enable it using the API and retry."). This is
infra-level, not code. It re-enables on its own / via Replit support; a plain
connection attempt does not always wake it.
