# Asset2Go

A modern monorepo-based equipment loan tracket platform built with NestJS and Next.js. It supports muti-tenancy customers.

## 🏗 Architecture

This project is structured as a monorepo using pnpm workspaces and Turborepo for efficient dependency management and build orchestration.

### Project Structure

```
asset2go/
├── apps/
│   ├── api/               # NestJS backend application
│   │   ├── src/          # Source code
│   │   ├── test/         # Test files
│   │   └── templates/    # Email templates
│   └── web/              # Next.js 15 frontend application
│       ├── src/          # Source code
│       ├── public/       # Static assets
│       └── tests/        # E2E tests
├── packages/
│   └── shared/           # Shared types, utilities, and schemas
│       ├── src/types/    # TypeScript type definitions
│       ├── src/utils/    # Utility functions
│       └── src/schemas/  # Zod validation schemas
├── docker-compose.yml    # Docker orchestration
├── turbo.json           # Turborepo configuration
├── pnpm-workspace.yaml  # pnpm workspace configuration
└── package.json         # Root package configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10.18.0+
- Docker & Docker Compose (optional, for containerized development)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd asset2go
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Copy the example environment file to the root:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and fill in your configuration values.

### Development

**Start everything with a single command:**

```bash
pnpm dev
```

This will start:

- API server on http://localhost:3000
- Web application on http://localhost:3191
- Worker process for background jobs

**Individual services:**

```bash
pnpm dev:api      # Start only API server
pnpm dev:web      # Start only web application
pnpm dev:worker   # Start only worker process
```

### Using Docker

**Production-like stack (default compose):**

```bash
docker compose up --build
```

The default compose file now builds the `production` stages of every service so each container runs with the dependencies baked into its image. The stack exposes:

- API server on http://asset2go.test:3500
- Background worker sharing the API image
- Web application on http://asset2go.test:3501

**Development stack inside Docker:**

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

The dev override switches the images to their `development` targets, mounts the source directories for hot reload, and reconfigures the worker to run the nodemon-based dev command. Always include `--build` when switching between prod and dev modes so Docker rebuilds the correct stage.

**Deploying with Coolify:**

Coolify can use the same base compose file. Configure its build/start commands to include the Coolify override so each service attaches to the platform network:

```bash
# Custom build command
docker compose -f docker-compose.yml -f docker-compose.coolify.override.yml build

# Custom start command
docker compose -f docker-compose.yml -f docker-compose.coolify.override.yml up -d
```

Locally you can ignore the override; it only adds the external `coolify` network that Coolify provides.

## 📦 Workspace Packages

### @asset2go/api

NestJS backend with:

- REST API with JSON:API specification
- WebSocket support via Socket.io
- Background job processing with BullMQ

### @asset2go/web

Next.js 15 frontend with:

- App Router
- Tailwind CSS v4
- shadcn/ui components
- React Hook Form + Zod validation
- Real-time updates via Socket.io

### @asset2go/shared

Shared package containing:

## 🛠 Available Scripts

### Root Level Commands

```bash
# Development
pnpm dev              # Start all services
pnpm dev:api          # Start API only
pnpm dev:web          # Start web only
pnpm dev:worker       # Start worker only

# Building
pnpm build            # Build all packages
pnpm build:api        # Build API only
pnpm build:web        # Build web only

# Testing
pnpm test             # Run all tests
pnpm test:watch       # Run tests in watch mode
pnpm test:e2e         # Run E2E tests
pnpm test:cov         # Run tests with coverage

# Code Quality
pnpm lint             # Lint all packages
pnpm format           # Format all code with Prettier
pnpm typecheck        # Type check all packages

# Utilities
pnpm clean            # Clean build artifacts
pnpm clean:all        # Clean everything including node_modules
```

## 🔧 Configuration

### TypeScript

The monorepo uses a shared base TypeScript configuration:

- `tsconfig.base.json` - Shared configuration
- Each package extends this with its own `tsconfig.json`

### Turborepo

Turborepo is configured to:

- Cache build outputs for faster subsequent builds
- Run tasks in parallel when possible
- Understand task dependencies

### pnpm Workspaces

Workspace packages are defined in `pnpm-workspace.yaml`:

- `api/` - Backend application
- `web/` - Frontend application
- `packages/*` - Shared packages

## 🏗 Building for Production

### Using Node.js

```bash
# Build all packages
pnpm build

# Start production servers
pnpm start:prod
```

### Using Docker

Build production images:

```bash
# Build API image (production stage)
docker build -f apps/api/Dockerfile --target production -t asset2go-api .

# Build Web image (production stage)
docker build -f apps/web/Dockerfile --target production -t asset2go-web .
```

Run production containers:

```bash
docker run -p 3500:3500 asset2go-api
docker run -p 3501:3501 asset2go-web
```

## 🧪 Testing

### Unit Tests

```bash
pnpm test
```

### E2E Tests

```bash
pnpm test:e2e
```

### Test Coverage

```bash
pnpm test:cov
```

## 📚 Technology Stack

### Backend (API)

- **Framework**: NestJS 11
- **Database**: Neo4j (graph database)
- **Cache/Queue**: Redis + BullMQ
- **Authentication**: Passport JWT
- **Real-time**: Socket.io

### Frontend (Web)

- **Framework**: Next.js 15
- **UI**: Tailwind CSS v4 + shadcn/ui
- **State**: Jotai
- **Forms**: React Hook Form + Zod
- **Testing**: Jest + Playwright

### Shared

- **Language**: TypeScript 5.9
- **Package Manager**: pnpm
- **Build Tool**: Turborepo
- **Code Quality**: ESLint + Prettier

## 🔒 Environment Variables

This monorepo uses a **centralized `.env` file** located at the root of the repository. All environment variables for both the API and Web applications are configured in this single file.

### Location

- **Main configuration**: `.env` (root of monorepo)
- **Example/template**: `.env.example` (root of monorepo)
- **E2E testing**: `.env.e2e` (root of monorepo)

### How It Works

- **API**: Loads environment variables from root `.env` via `dotenv.config()` in `apps/api/src/main.ts`
- **Web**: Loads environment variables from root `.env` via `dotenv-cli -c` (cascades up from app directory)
- **Tests**: E2E tests use `.env.e2e` for isolated test environment

### Key Variables

**API Server:**
- `API_URL` - API server URL
- `API_PORT` - API server port
- `PORT` - APP server port
- `NEO4J_URI` - Neo4j connection URI
- `NEO4J_USER` - Neo4j username
- `NEO4J_PASSWORD` - Neo4j password
- `NEO4J_DATABASE` - Neo4j database name
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port
- `JWT_SECRET` - JWT signing secret

**Web Application:**
- `APP_URL` - Web application URL
- `NEXT_PUBLIC_API_URL` - API server URL (client-side)
- `NEXT_PUBLIC_ADDRESS` - Web application address (client-side)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - VAPID public key for push notifications
- `IMAGE_SOURCES` - Comma-separated list of allowed image sources

**Shared:**
- `NODE_ENV` - Environment (development/production)

See `.env.example` for a complete list of all available configuration options.

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `pnpm test`
4. Run linting: `pnpm lint`
5. Commit with conventional commits
6. Create a pull request

## 📄 License

GPL-3.0-or-later

## 🆘 Support

For issues and questions, please contact the development team.

---

Built with ❤️ using modern web technologies
