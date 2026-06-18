#!/bin/bash
set -e

npm install

if [ -x node_modules/.bin/drizzle-kit ]; then
  npm run db:push -- --force
else
  echo "drizzle-kit not installed (devDependency unavailable in this environment); skipping db:push."
fi
