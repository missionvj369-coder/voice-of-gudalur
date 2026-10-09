# syntax=docker/dockerfile:1
# ============================================================================
# Voice of Gudalur — production image
#
# Multi-stage:
#   stage 1 (build)  — full dev deps, Vite production build → dist/
#   stage 2 (runtime)— production deps ONLY + dist/ + server sources.
#
# The backend runs via `tsx` (TypeScript executed directly) — there is no
# compiled server build in this repo, so tsx is a production dependency.
#
# SECURITY: no secrets are baked in. `.env*` is excluded via .dockerignore;
# every credential (DATABASE_URL, SESSION_SECRET, STORJ_*, GOOGLE_*,
# TELEGRAM_*) is injected at deploy time by Coolify as environment variables.
# ============================================================================

# ── Stage 1: build the frontend ─────────────────────────────────────────────
FROM node:22-slim AS build
WORKDIR /app

# devDependencies are required for the Vite build.
COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .

# Frontend only. The snapshot exporter (npm run snapshots) needs DB access,
# which the build stage must never have — snapshots are generated at runtime
# by the snapshot refresh job (see docs/COOLIFY_STAGING_DEPLOYMENT.md).
RUN npm run build:web

# ── Stage 2: production runtime ─────────────────────────────────────────────
FROM node:22-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    PRISMA_HIDE_UPDATE_MESSAGE=1

# Production dependencies only (tsx included — the server runs TS directly).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Static SPA build + server sources (tsx runs TS directly) + snapshot script.
#
# Ownership is set AT COPY TIME via --chown. A separate `RUN chown -R node:node
# /app` would rewrite every file, forcing overlayfs to copy the whole tree up
# into an EXTRA layer: measured effect was a 2.14 GB image instead of ~1.1 GB
# (node_modules alone is 684 MB) plus a multi-minute build stall.
#
# dist/ must be owned by `node` (not just readable) because the scheduled
# snapshot refresh job rewrites dist/data/*.json inside the running container.
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server.ts ./
COPY --chown=node:node server ./server
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node tsconfig.json ./

# Non-root runtime. node_modules stays root-owned (installed by npm ci) and is
# only ever read at runtime, never written.
USER node

EXPOSE 3000

# Container healthcheck — node:22-slim has no curl; use the built-in fetch.
# /api/health is process-level only (no DB dependency) by design.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# NODE_ENV=production → server.ts startServer() serves ./dist automatically.
# SIGTERM → graceful shutdown: stop accepting connections, drain in-flight
# requests (SHUTDOWN_TIMEOUT_SECONDS, default 20), close the DB pool, exit 0.
CMD ["node", "--import", "tsx", "server.ts"]
