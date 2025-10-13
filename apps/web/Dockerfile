# =============================================================================
# Unified Dockerfile for Web (Development & Production)
# =============================================================================
# Build targets:
#   - development: Hot-reload development environment
#   - production: Optimized production build
#
# Usage:
#   Development:  docker build --target development -t web:dev .
#   Production:   docker build --target production -t web:prod .
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
COPY apps/web ./apps/web/

# Install all dependencies once (including dev deps for build targets)
RUN pnpm install --frozen-lockfile

# =============================================================================
# DEVELOPMENT TARGET
# =============================================================================
FROM workspace-deps AS development

# Expose port (set via build arg; defaults to 3401 for local compose)
ARG PORT=3401
EXPOSE ${PORT}

# Development command (hot reload with Turbopack) - stay in /app to access node_modules
CMD ["pnpm", "--filter", "asset2go-web", "run", "dev"]

# =============================================================================
# SHARED PACKAGE BUILD
# =============================================================================
FROM workspace-deps AS shared-builder

WORKDIR /app/packages/shared
RUN pnpm build

# =============================================================================
# WEB BUILDER (production)
# =============================================================================
FROM shared-builder AS builder

WORKDIR /app

# Accept build arguments for Next.js public env vars
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ADDRESS
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY

# Set them as environment variables for the build
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_ADDRESS=${NEXT_PUBLIC_ADDRESS}
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}

RUN pnpm --filter asset2go-web build

WORKDIR /app
ENV CI=true
RUN pnpm prune --prod --ignore-scripts

# =============================================================================
# PRODUCTION TARGET
# =============================================================================
FROM node:22-alpine AS production

# Install runtime dependencies only (no build tools)
RUN apk add --no-cache cairo jpeg pango giflib libwebp

# Install pnpm for runtime scripts
RUN corepack enable && corepack prepare pnpm@10.18.2 --activate

WORKDIR /app
ENV NODE_ENV=production

# Copy built files
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/web ./apps/web

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

WORKDIR /app/apps/web

# Expose port (set via build arg; defaults to 3401 for local compose)
ARG PORT=3401
EXPOSE ${PORT}

# Production command
CMD ["pnpm", "--filter", "asset2go-web", "run", "start"]
