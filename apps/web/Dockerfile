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
# DEVELOPMENT TARGET
# =============================================================================
FROM base AS development

# Copy workspace configuration files (context is root)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/

# Copy Web package.json
COPY apps/web/package.json ./apps/web/

# Install ALL dependencies (including devDependencies)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY apps/web ./apps/web/
COPY packages/shared ./packages/shared/

# Expose port (set via build arg; defaults to 3401 for local compose)
ARG PORT=3401
EXPOSE ${PORT}

# Development command (hot reload with turbopack) - stay in /app to access node_modules
CMD ["pnpm", "--filter", "asset2go-web", "run", "dev"]

# =============================================================================
# BUILDER TARGET (for production)
# =============================================================================
FROM base AS builder

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build shared package
WORKDIR /app/packages/shared
RUN pnpm build

# Build web app (requires NEXT_PUBLIC_* env vars at build time)
WORKDIR /app/apps/web

# Accept build arguments for Next.js public env vars
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ADDRESS
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY

# Set them as environment variables for the build
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_ADDRESS=${NEXT_PUBLIC_ADDRESS}
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}

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

# Copy workspace configuration (includes dotenv-cli in root package.json)
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./

# Copy web app built files (maintain monorepo structure)
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/next.config.js ./apps/web/

# Copy production dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules

# Expose port (set via build arg; defaults to 3401 for local compose)
ARG PORT=3401
EXPOSE ${PORT}

# Set working directory to web app so Next.js finds .next directory
WORKDIR /app/apps/web

# Production command
CMD ["pnpm", "--filter", "asset2go-web", "run", "start"]
