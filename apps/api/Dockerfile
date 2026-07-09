# Built from the monorepo root as the build context (see railway.json's
# dockerfilePath) so pnpm can resolve the "workspace:*" dependency on
# @decyfogate/shared-types. `pnpm deploy` at the end prunes the result down
# to just this service's production files/deps, so the final image doesn't
# carry the rest of the monorepo (web, mobile, dev-only tooling).
FROM node:20-bookworm-slim AS base
# Prisma's engine binaries are matched against the OpenSSL version it can
# detect on the image; node:20-bookworm-slim doesn't ship OpenSSL, which
# otherwise makes Prisma guess wrong and try to fetch the correct engine
# over the network at container start (a bad time to discover a missing
# dependency). Installed identically in both the build and runtime stages
# so the engine generated during build matches what's actually running.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@decyfogate/api
RUN pnpm --filter=@decyfogate/api deploy --prod /prod/api
# `pnpm deploy` reinstalls a fresh, pruned node_modules for just this
# package -- re-run `prisma generate` explicitly against it rather than
# relying on @prisma/client's postinstall hook to have fired correctly.
RUN cd /prod/api && node_modules/.bin/prisma generate

FROM node:20-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /prod/api ./
COPY apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
ENV NODE_ENV=production
EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
