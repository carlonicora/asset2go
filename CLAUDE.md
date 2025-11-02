# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Asset2Go is an equipment loan tracker platform built as a monorepo using pnpm workspaces and Turborepo. It consists of three main packages:
- **API** (`apps/api`): NestJS backend with Neo4j graph database, Redis caching/queuing, and WebSocket support
- **Web** (`apps/web`): Next.js 15 frontend with App Router, Tailwind CSS v4, and shadcn/ui
- **Shared** (`packages/shared`): Shared TypeScript types, utilities, and Zod schemas

## Commands

### Development
```bash
pnpm dev              # Start all services (API, Web, Worker)
pnpm dev:api          # Start API only (http://localhost:3000)
pnpm dev:web          # Start web only (http://localhost:3191)
pnpm dev:worker       # Start background worker only
```

### Building
```bash
pnpm build            # Build all packages
pnpm build:api        # Build API only
pnpm build:web        # Build web only
```

### Testing
```bash
# Unit tests
pnpm test             # Run all tests
pnpm test:watch       # Run tests in watch mode
pnpm test:cov         # Run with coverage

# E2E tests
pnpm test:e2e         # Run E2E tests (uses .env.e2e)

# API-specific (run from apps/api)
cd apps/api
pnpm test:e2e         # API E2E tests with testcontainers
pnpm test:e2e:debug   # Verbose E2E test output
```

### Code Quality
```bash
pnpm lint             # Lint all packages
pnpm format           # Format all code with Prettier
pnpm typecheck        # Type check all packages
```

### Dependency Management
```bash
pnpm outdated         # Check for outdated packages across workspaces
pnpm audit            # Run security audit (moderate+ severity)
pnpm deps:check       # List installed dependencies per workspace
```

### Docker
```bash
# Production build (default)
docker compose up --build

# Development with hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Coolify deployment
docker compose -f docker-compose.yml -f docker-compose.coolify.override.yml up -d
```

## Architecture

### API (NestJS Backend)

#### Module Structure
The API follows a layered architecture with three distinct module categories:

1. **Core Modules** (`src/core/`): Infrastructure and cross-cutting concerns
   - `appmode`: Dual-mode application (API server vs background worker)
   - `neo4j`: Neo4j graph database integration and entity factory
   - `jsonapi`: JSON:API specification implementation with serializers
   - `cache`: Redis caching with interceptors
   - `queue`: BullMQ job processing
   - `websocket`: Socket.io WebSocket gateway
   - `logging`: Pino logger with Loki integration
   - `tracing`: OpenTelemetry distributed tracing
   - `email`: SendGrid and Handlebars email templates
   - `security`: Authentication guards and rate limiting
   - `redis`: Redis client wrapper
   - `cors`: CORS configuration

2. **Foundations Modules** (`src/foundations/`): Core business entities
   - `auth`: JWT authentication and authorization
   - `user`: User management
   - `company`: Multi-tenancy company management
   - `role`: Role-based access control (RBAC)
   - `notification`: In-app notifications
   - `push`: Push notification service
   - `audit`: Audit trail logging
   - `feature`: Feature flag system
   - `module`: Dynamic module system
   - `s3`: S3-compatible storage (AWS/Azure)

3. **Features Modules** (`src/features/`): Domain-specific features
   - `employee`: Employee management
   - `equipment`: Equipment tracking
   - `loan`: Equipment loan management
   - `supplier`: Supplier management
   - `analytic`: Analytics and reporting

#### Key Patterns

**Dual-Mode Application**: The API runs in two modes controlled by `--mode` flag:
- `--mode=api`: HTTP server with controllers (default)
- `--mode=worker`: Background job processor with cron jobs

**Entity Pattern**: Each feature module follows a consistent structure:
```
module-name/
├── controllers/       # REST endpoints
├── services/         # Business logic
├── repositories/     # Neo4j data access
├── entities/         # Domain models (registered with modelRegistry)
├── serialisers/      # JSON:API serialization
└── dtos/            # Data transfer objects
```

**Model Registration**: All entity models must be registered in module's `onModuleInit()`:
```typescript
onModuleInit() {
  modelRegistry.register(EntityModel);
}
```

**JSON:API Compliance**: All API responses use JSON:API specification with `JsonApiSerialiserFactory`.

**Neo4j Repositories**: Database access uses Neo4j driver with Cypher queries. Repositories extend base patterns and use `EntityFactory` for object mapping.

#### Running Single Tests
```bash
cd apps/api
pnpm test -- path/to/test.spec.ts          # Single test file
pnpm test -- -t "test name pattern"        # Specific test by name
```

### Web (Next.js Frontend)

#### Directory Structure
```
src/
├── app/[locale]/          # Next.js App Router with i18n
│   ├── (auth)/           # Auth route group (login, register)
│   ├── (main)/           # Main app route group
│   └── (admin)/          # Admin route group
├── components/ui/         # shadcn/ui components
├── features/             # Feature-specific components
│   ├── foundations/      # Core feature components
│   ├── features/         # Domain feature components
│   └── common/           # Shared feature utilities
├── jsonApi/              # JSON:API client implementation
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
├── contexts/             # React context providers
├── stores/               # Jotai state stores
├── i18n/                 # Internationalization (next-intl)
└── middleware.ts         # Next.js middleware
```

#### Key Patterns

**Internationalization**: Uses `next-intl` with locale route segments `[locale]`. Middleware handles locale detection.

**JSON:API Client**: Frontend implements JSON:API client in `src/jsonApi/` matching backend serialization.

**Form Handling**: React Hook Form + Zod validation for all forms.

**State Management**: Jotai for global state, React Context for feature-specific state.

**Real-time Updates**: Socket.io client in hooks for WebSocket connections.

#### Running Single Tests
```bash
cd apps/web
pnpm test -- ComponentName.test.tsx        # Single test file
pnpm test:e2e -- tests/feature.spec.ts     # Single E2E test
```

### Shared Package

Location: `packages/shared/`
Built with: `tsup`

Contains:
- TypeScript type definitions shared between API and Web
- Utility functions
- Zod validation schemas
- Enums and constants

**Important**: Changes to shared package require rebuilding (`pnpm build`) before they're available to API/Web in development.

## Environment Configuration

**Centralized Configuration**: All environment variables are in the root `.env` file (not in individual app directories).

- Main config: `.env` (gitignored)
- Template: `.env.example` (committed)
- E2E tests: `.env.e2e` (committed)

**Environment Loading**:
- API: Loads via `dotenv.config()` in `apps/api/src/main.ts`
- Web: Loads via `dotenv-cli` wrapper in package.json scripts
- Tests: E2E tests use `.env.e2e` for isolation

**Key Variables**:
- `API_URL` / `API_PORT`: API server configuration
- `NEXT_PUBLIC_API_URL`: API URL for client-side (must have NEXT_PUBLIC_ prefix)
- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `NEO4J_DATABASE`: Neo4j connection
- `REDIS_HOST`, `REDIS_PORT`: Redis connection
- `JWT_SECRET`: JWT signing secret
- `NODE_ENV`: Environment mode

## Dependency Management

### Package Manager

This monorepo uses **pnpm** (v10.20.0+) with workspaces for efficient dependency management.

**Engine Requirements** (all packages):
- Node.js: `>=22.0.0`
- pnpm: `>=10.0.0`

### Workspace Structure

```
root/                           # Monorepo root
├── apps/api/                  # NestJS backend
├── apps/web/                  # Next.js frontend
└── packages/shared/           # Shared utilities & types
```

### Dependency Hoisting Strategy

**Common dev dependencies are hoisted to root** to ensure consistency and reduce duplication:
- TypeScript tooling (`typescript`, `@types/node`)
- Linting & formatting (`eslint`, `prettier`, `@typescript-eslint/*`)
- Semantic release packages (`@semantic-release/*`)

**Workspace-specific dependencies remain local**:
- API: NestJS, Neo4j, BullMQ, etc.
- Web: Next.js, React, Radix UI, etc.
- Shared: Build tools (tsup)

### Version Pinning & Overrides

**pnpm overrides** in root `package.json` enforce version consistency:

```json
"pnpm": {
  "overrides": {
    "zod": "4.1.12",              // Zod v4 for validation schemas
    "@hookform/resolvers": "5.2.2" // Form resolver compatibility
  }
}
```

**Why these overrides:**
- `zod`: Ensures all workspaces use Zod v4 (latest stable, released July 2025)
- `@types/react` / `@types/react-dom`: Enforces React 19.2.2 types for consistency across web workspace

### Helpful Scripts

```bash
# Dependency maintenance
pnpm outdated           # Check for outdated packages across all workspaces
pnpm audit              # Security audit (moderate+ severity)
pnpm deps:check         # List installed dependencies per workspace

# Installation
pnpm install            # Install all dependencies (respects overrides)
```

### Version Strategy

- **Root & workspaces**: Use `^` (caret) ranges for flexibility (e.g., `"^5.9.3"`)
- **Overrides**: Use exact versions for critical packages (e.g., `"4.1.12"`)
- **React ecosystem**: Overrides enforce React 19.2.2 types in web package
- **Pino constraint**: API uses pino v9 (not v10) due to `nestjs-pino@4.4.1` peer dependency limitation

### Adding Dependencies

**Root dependencies** (only if used by multiple workspaces or monorepo tooling):
```bash
pnpm add -w <package>           # Add to root
pnpm add -wD <package>          # Add to root devDependencies
```

**Workspace dependencies**:
```bash
pnpm --filter=asset2go-api add <package>      # Add to API
pnpm --filter=asset2go-web add <package>      # Add to Web
pnpm --filter=@asset2go/shared add <package>  # Add to Shared
```

**After adding dependencies**:
1. If adding to `packages/shared`, run `pnpm build` in shared package
2. Run `pnpm install` at root to update lockfile
3. Verify no conflicts with `pnpm deps:check`

### Troubleshooting Dependencies

**Phantom modules (module not found but installed)**:
```bash
pnpm clean:all          # Nuclear option: clean everything
pnpm install            # Reinstall from scratch
```

**Version conflicts**:
```bash
pnpm why <package>      # Show why a package is installed
pnpm outdated -r        # Check for version mismatches
```

**Hoisting issues**:
- Check if package should be in root devDependencies
- Verify workspace has correct filter in root scripts
- Ensure `pnpm-workspace.yaml` is correctly configured (if exists)

## Docker Architecture

**Unified Dockerfile**: Single `Dockerfile` at root builds all services using multi-stage builds:
- Base stages: `base`, `workspace-deps`, `shared-builder`
- API targets: `api-development`, `api-production`
- Web targets: `web-development`, `web-production`

Benefits:
- Shared package built once and reused
- Better layer caching
- Consistent dependencies

**Compose Files**:
- `docker-compose.yml`: Production-like stack (default)
- `docker-compose.dev.yml`: Development override with hot-reload
- `docker-compose.coolify.override.yml`: Coolify deployment config

## Testing Strategy

**API Tests**:
- Unit tests: `*.spec.ts` files alongside source
- E2E tests: `test/*.e2e-spec.ts` using testcontainers (Neo4j + Redis)
- Test timeout: 30000ms (configurable in jest.config.js)

**Web Tests**:
- Unit tests: Jest + React Testing Library
- E2E tests: Playwright (`tests/*.spec.ts`)

**Shared Tests**: Minimal - mainly type checking

## Release & Versioning

Uses **semantic-release** with conventional commits:
- Configuration: `.releaserc`
- Automatic CHANGELOG generation
- Git tags and GitHub releases
- Husky pre-commit hooks enforce commit format

Commit format: `type(scope): message`
- Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`
- Breaking changes: Add `BREAKING CHANGE:` in commit body or `!` after type

## Code Patterns & Conventions

### API Conventions
- Controllers use Fastify decorators
- Services contain business logic, repositories handle data access
- All models registered in `modelRegistry`
- JSON:API serializers for all response DTOs
- Use `ClsService` from `nestjs-cls` for request-scoped context
- Logging via `AppLoggingService` (Pino)

### Web Conventions
- File-based routing with route groups `(groupName)`
- Server Components by default, Client Components marked with `'use client'`
- shadcn/ui components in `components/ui/`
- Feature components in `features/`
- API calls via JSON:API client abstractions

### Shared Package Conventions
- Export all types from `index.ts`
- Use Zod for runtime validation schemas
- Keep utilities pure and framework-agnostic

## Troubleshooting

**Module resolution issues**: Ensure `src/*` path aliases are configured in `tsconfig.json`.

**Neo4j connection errors**: Check `NEO4J_URI` format and ensure Neo4j is running.

**Redis connection errors**: Verify `REDIS_HOST` and `REDIS_PORT` in `.env`.

**Hot reload not working**:
- API: Ensure `nest start --watch` is running
- Web: Check Next.js is using `--turbopack` flag

**Shared package changes not reflected**: Run `pnpm build` in `packages/shared/` or at root level.

**Docker build failures**: Use `--build` flag when switching between dev/prod compose files.

**Test failures**:
- E2E tests require clean database state
- Check test timeout settings if tests are slow
- Ensure `.env.e2e` is properly configured
