#!/bin/sh
# Applies any pending migrations before every boot -- safe to run on a
# database that's already up to date (prisma migrate deploy is a no-op in
# that case), and is how a Railway/Render deploy picks up schema changes
# without a separate manual step.
set -e
./node_modules/.bin/prisma migrate deploy
exec node dist/index.js
