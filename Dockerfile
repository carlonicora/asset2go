# =============================================================================
# Unified Dockerfile for Asset2Go Monorepo
# =============================================================================
# This Dockerfile builds all services (API, Worker, Web) from a single file,
# eliminating duplicate builds of the shared package by reusing build stages.
#
# Build targets:
#   - api-development:  API with hot-reload for development
#   - api-production:   Optimized API production build
#   - web-development:  Web with hot-reload for development
#   - web-production:   Optimized Web production build
#
# Usage:
#   docker build --target api-production -t api:prod .
#   docker build --target web-production -t web:prod .
#   docker build --target api-development -t api:dev .
#   docker build --target web-development -t web:dev .
#
# Benefits:
#   - Shared package (@asset2go/shared) built ONCE and reused
#   - Faster builds when building multiple services
#   - Better layer caching across services
#   - Consistent base dependencies
# =============================================================================

# =============================================================================
# BASE STAGE - Common foundation for all services
# =============================================================================
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.18.2 --activate

# Install build dependencies for native modules (required for sharp + webp)
RUN apk add --no-cache python3 py3-pip make g++ cairo-dev jpeg-dev pango-dev giflib-dev libwebp-dev

WORKDIR /app

# =============================================================================
# WORKSPACE DEPENDENCIES - Install all dependencies once
# =============================================================================
FROM base AS workspace-deps

# Copy workspace manifests (minimal set for faster caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.json ./
COPY packages/shared ./packages/shared/
COPY apps/api ./apps/api/
COPY apps/web ./apps/web/

# Install all dependencies once (including dev deps for build targets)
RUN pnpm install --frozen-lockfile

# =============================================================================
# SHARED PACKAGE BUILD - Built ONCE and reused by all services
# =============================================================================
FROM workspace-deps AS shared-builder

WORKDIR /app/packages/shared
RUN pnpm build

# Return to workspace root for subsequent stages
WORKDIR /app

# =============================================================================
# API DEVELOPMENT TARGET
# =============================================================================
FROM shared-builder AS api-development

# Expose port (set via build arg; defaults to 3400 for local compose)
ARG API_PORT=3400
EXPOSE ${API_PORT}

# Development command (hot reload) - stay in /app to access tsconfig.json
CMD ["pnpm", "--filter", "asset2go-api", "run", "dev"]

# =============================================================================
# API BUILDER (production)
# =============================================================================
FROM shared-builder AS api-builder

WORKDIR /app
RUN pnpm --filter asset2go-api build

# =============================================================================
# API PRODUCTION TARGET
# =============================================================================
FROM node:22-alpine AS api-production

# Install runtime dependencies only (no build tools)
RUN apk add --no-cache cairo jpeg pango giflib libwebp

RUN corepack enable && corepack prepare pnpm@10.18.2 --activate

WORKDIR /app
ENV NODE_ENV=production

# Copy built files from api-builder
COPY --from=api-builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=api-builder /app/packages/shared ./packages/shared
COPY --from=api-builder /app/apps/api ./apps/api

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

WORKDIR /app/apps/api

# Expose port (set via build arg; defaults to 3400 for local compose)
ARG API_PORT=3400
EXPOSE ${API_PORT}

# Production command (can be overridden for worker mode)
CMD ["node", "dist/main", "--mode=api"]

# =============================================================================
# WEB DEVELOPMENT TARGET
# =============================================================================
FROM shared-builder AS web-development

# Expose port (set via build arg; defaults to 3401 for local compose)
ARG PORT=3401
EXPOSE ${PORT}

# Development command (hot reload with Turbopack) - stay in /app to access node_modules
CMD ["pnpm", "--filter", "asset2go-web", "run", "dev"]

# =============================================================================
# WEB BUILDER (production)
# =============================================================================
FROM shared-builder AS web-builder

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

# =============================================================================
# WEB PRODUCTION TARGET
# =============================================================================
FROM node:22-alpine AS web-production

# Install runtime dependencies for Next.js image optimization (sharp)
RUN apk add --no-cache cairo jpeg pango giflib libwebp

# Install pnpm for runtime scripts
RUN corepack enable && corepack prepare pnpm@10.18.2 --activate

WORKDIR /app
ENV NODE_ENV=production

# Copy built files from web-builder
COPY --from=web-builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=web-builder /app/packages/shared ./packages/shared
COPY --from=web-builder /app/apps/web ./apps/web

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

WORKDIR /app/apps/web

# Expose port (set via build arg; defaults to 3401 for local compose)
ARG PORT=3401
EXPOSE ${PORT}

# Production command
CMD ["pnpm", "--filter", "asset2go-web", "run", "start"]
