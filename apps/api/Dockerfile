# =============================================================================
# Unified Dockerfile for API (Development & Production)
# =============================================================================
# Build targets:
#   - development: Hot-reload development environment
#   - production: Optimized production build
#
# Usage:
#   Development:  docker build --target development -t api:dev .
#   Production:   docker build --target production -t api:prod .
# =============================================================================

FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.18.2 --activate

# Install build dependencies for native modules (required for sharp + webp)
RUN apk add --no-cache python3 py3-pip make g++ cairo-dev jpeg-dev pango-dev giflib-dev libwebp-dev

WORKDIR /app

# =============================================================================
# WORKSPACE DEPENDENCIES (shared by all targets)
# =============================================================================
FROM base AS workspace-deps

# Copy workspace manifests (minimal set for faster caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.json ./
COPY packages/shared ./packages/shared/
COPY apps/api ./apps/api/

# Install all dependencies once (including dev deps for build targets)
RUN pnpm install --frozen-lockfile

# =============================================================================
# DEVELOPMENT TARGET
# =============================================================================
FROM workspace-deps AS development

# Expose port (set via build arg; defaults to 3400 for local compose)
ARG API_PORT=3400
EXPOSE ${API_PORT}

# Development command (hot reload) - stay in /app to access tsconfig.json
CMD ["pnpm", "--filter", "asset2go-api", "run", "dev"]

# =============================================================================
# SHARED PACKAGE BUILD
# =============================================================================
FROM workspace-deps AS shared-builder

WORKDIR /app/packages/shared
RUN pnpm build

# =============================================================================
# API BUILDER (production)
# =============================================================================
FROM shared-builder AS builder

WORKDIR /app
RUN pnpm --filter asset2go-api build

# =============================================================================
# PRODUCTION TARGET
# =============================================================================
FROM node:22-alpine AS production

# Install runtime dependencies only (no build tools)
RUN apk add --no-cache cairo jpeg pango giflib libwebp

RUN corepack enable && corepack prepare pnpm@10.18.2 --activate

WORKDIR /app
ENV NODE_ENV=production

# Copy built files
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api ./apps/api

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

WORKDIR /app/apps/api

# Expose port (set via build arg; defaults to 3400 for local compose)
ARG API_PORT=3400
EXPOSE ${API_PORT}

# Production command (can be overridden for worker mode)
CMD ["node", "dist/main", "--mode=api"]
