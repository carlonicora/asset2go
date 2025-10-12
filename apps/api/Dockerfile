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
# DEVELOPMENT TARGET
# =============================================================================
FROM base AS development

# Copy workspace configuration files (context is root)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/

# Copy API package.json
COPY apps/api/package.json ./apps/api/

# Install ALL dependencies (including devDependencies)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY apps/api ./apps/api/
COPY packages/shared ./packages/shared/

# Expose port (set via build arg; defaults to 3400 for local compose)
ARG API_PORT=3400
EXPOSE ${API_PORT}

# Development command (hot reload) - stay in /app to access tsconfig.json
CMD ["pnpm", "--filter", "asset2go-api", "run", "dev"]

# =============================================================================
# BUILDER TARGET (for production)
# =============================================================================
FROM base AS builder

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared package
WORKDIR /app/packages/shared
RUN pnpm build

# Build API
WORKDIR /app/apps/api
RUN pnpm build

# =============================================================================
# PRODUCTION TARGET
# =============================================================================
FROM node:22-alpine AS production

# Install runtime dependencies only (no build tools)
RUN apk add --no-cache cairo jpeg pango giflib libwebp

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.18.2 --activate

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/templates ./apps/api/templates

# Install production dependencies only (ignore scripts to skip husky)
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Ensure native addons (sharp) are correctly rebuilt in this stage
RUN pnpm rebuild sharp

WORKDIR /app/apps/api

# Expose port (set via build arg; defaults to 3400 for local compose)
ARG API_PORT=3400
EXPOSE ${API_PORT}

# Production command (can be overridden for worker mode)
CMD ["node", "--max-old-space-size=6144", "dist/main", "--mode=api"]
