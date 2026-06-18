#!/bin/bash
set -e

# Install all dependencies including devDependencies (drizzle-kit lives there).
# The post-merge environment runs with NODE_ENV=production, which would otherwise
# skip devDependencies and leave drizzle-kit unavailable for the schema push.
npm install --include=dev

if [ -x node_modules/.bin/drizzle-kit ]; then
  npm run db:push -- --force
else
  # drizzle-kit should be installable via the shell-quote override in package.json.
  # If it is missing, fail loudly rather than silently skipping the schema push,
  # so schema drift is never hidden.
  echo "ERROR: drizzle-kit is not installed; cannot run db:push. The schema may be out of date." >&2
  exit 1
fi
