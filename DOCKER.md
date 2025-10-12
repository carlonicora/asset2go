# Docker Setup Guide

Complete guide for running Asset2Go with Docker Compose, including both development and production configurations.

## Table of Contents

- [Overview](#overview)
- [Service Architecture](#service-architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Mode](#development-mode)
- [Production Mode](#production-mode)
- [Deployment Strategies](#deployment-strategies)
- [Horizontal Scaling Guide](#horizontal-scaling-guide)
- [Architecture](#architecture)
- [Critical Configuration](#critical-configuration)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Advanced Topics](#advanced-topics)

## Overview

The Asset2Go monorepo uses Docker Compose to run three application services:

- **API** (NestJS) - Backend API server on port 3400
- **Worker** (NestJS) - Background job processor
- **Web** (Next.js) - Frontend application on port 3401

**Infrastructure Services:** Neo4j, Redis, and MinIO are expected to run **externally** and are configured via environment variables in `.env`. They are NOT included in the docker-compose.yml by default.

## Service Architecture

Asset2Go is designed as a microservices architecture with three independent services that can be deployed together or separately based on your scaling needs.

### Service Responsibilities

#### API Service (NestJS)
**What it does:**
- REST API endpoints for all business logic
- User authentication and authorization (JWT)
- Real-time database queries (Neo4j)
- Request validation and rate limiting
- CORS handling
- Caching frequently accessed data (Redis)

**When to scale:**
- High number of concurrent users
- Slow API response times (>200ms)
- CPU usage consistently >80%
- Many requests per second (>500 req/sec)

**Resource profile:** CPU-intensive, stateless (easy to scale horizontally)

#### Worker Service (NestJS)
**What it does:**
- Background job processing (BullMQ via Redis)
- Email sending (notifications, reports)
- Data processing and transformations
- Scheduled tasks (cron jobs)
- Heavy computations that shouldn't block API responses
- Bulk operations (imports, exports)

**When to scale:**
- Redis queue backlog growing
- Jobs taking longer to start
- Email delivery delays
- Background tasks timing out

**Resource profile:** Mixed workload, stateless, processes jobs from shared Redis queue

#### Web Service (Next.js)
**What it does:**
- Server-Side Rendering (SSR) for dynamic pages
- Static Site Generation (SSG) for cached pages
- Frontend React application
- Serving static assets (images, JS, CSS)
- API proxy for browser requests

**When to scale:**
- High website traffic
- Slow page load times
- Server timeouts during traffic spikes
- Geographic distribution needs

**Resource profile:** Memory-intensive (SSR), stateless (can be cached with CDN)

### Why Separate Services?

**Independent Scaling**
- Scale only the service experiencing load
- API can handle 1000s of requests while Workers process heavy jobs
- Web can scale for traffic without affecting API capacity

**Resource Optimization**
- API needs more CPU for request processing
- Workers need steady CPU for long-running jobs
- Web needs memory for SSR but can be cached with CDN
- Deploy services on appropriately-sized servers

**Fault Isolation**
- Worker crash doesn't affect API availability
- API issues don't block background job processing
- Web server problems don't impact API-to-API communication

**Geographic Distribution**
- Deploy Web servers closer to users (multiple regions)
- Keep API + Workers near database (low latency)
- Reduce costs by not replicating heavy backend services

**Cost Efficiency**
- Run fewer Workers during low-activity hours
- Scale API during business hours
- Keep Web instances minimal with CDN for static content

### Shared Infrastructure

All three services share access to:
- **Neo4j** (Database) - All services read/write data
- **Redis** (Cache & Queue) - API caches data, Workers consume job queue
- **MinIO/S3** (Storage) - All services store/retrieve files

This shared infrastructure must be:
- Highly available (avoid single point of failure)
- Network-accessible from all service instances
- Properly secured (firewalls, authentication)

## Prerequisites

1. **Docker Desktop** or **Docker Engine + Docker Compose**
2. **External Infrastructure** running:
   - Neo4j (Graph Database)
   - Redis (Cache & Queue)
   - MinIO or S3 (Object Storage)
3. **Configured .env file** with all connection strings

## Quick Start

### 1. Configure Environment

Create/edit your `.env` file in the project root with these **REQUIRED** variables:

```bash
# Build Configuration (REQUIRED)
DOCKER_BUILD_TARGET=development  # 'development' or 'production'
NODE_ENV=development             # 'development' or 'production'

# API Configuration (REQUIRED)
API_PORT=3400
API_URL=http://localhost:3400/

# Web Configuration (REQUIRED)
PORT=3401
APP_URL=http://localhost:3401/
NEXT_PUBLIC_API_URL=http://localhost:3400/
NEXT_PUBLIC_ADDRESS=http://localhost:3401

# Database (REQUIRED)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=asset2go

# Cache & Queue (REQUIRED)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Object Storage (REQUIRED)
S3_ENDPOINT=http://localhost:9000/
S3_BUCKET=asset2go
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_REGION=us-east-1

# Authentication (REQUIRED)
JWT_SECRET=your-jwt-secret-min-32-chars

# VAPID for Web Push (REQUIRED)
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key
```

**Note:** See the [Environment Variables](#environment-variables) section below for complete reference including optional variables.

### 2. Build and Start

#### Option A: All Services (Monolithic - Recommended for Development)

Run all three services together on a single machine:

```bash
# Build base images (no source mounts required)
docker compose build

# Start all services with development overrides (adds source + shared mounts)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or start in background
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

**Use this when:**
- Local development
- Testing full stack
- Small deployments (<1000 users)
- Single server production

#### Option B: Individual Services (Distributed - Recommended for Production)

Run specific services for horizontal scaling and distributed deployment. Use only the base `docker-compose.yml` so the container keeps the compiled packages from the image:

```bash
# API only
docker compose up api

# Worker only
docker compose up worker

# Web only
docker compose up web

# API + Worker (common for backend server)
docker compose up api worker

# Multiple instances (scale workers)
docker compose up --scale worker=3
```

**Use this when:**
- Scaling specific services based on load
- Multi-server deployment
- Independent service updates
- Resource optimization

**Examples:**
```bash
# Server 1: Backend (API + 3 Workers)
docker compose up api --scale worker=3 -d

# Server 2: Frontend only
docker compose up web -d

# Server 3: Additional API for load balancing
docker compose up api -d
```

> ℹ️ **Coolify deploys:** The compose file expects the external network `coolify` (Traefik proxy) to exist. On Coolify-managed hosts that network is created automatically; if you run elsewhere, create it once with `docker network create coolify`.

### 3. Verify

- API: http://localhost:3400
- Web: http://localhost:3401
- Workers: Check logs with `docker compose logs worker`

## Development Mode

Development mode enables hot-reload for rapid development with live code changes. Combine the base compose file with `docker-compose.dev.yml` to add the necessary source and shared bind mounts.

### Configuration

In your `.env`:

```bash
DOCKER_BUILD_TARGET=development
NODE_ENV=development
```

### Features

- **Hot Reload**: Source code is mounted from host, changes reflect immediately
- **Development Server**: Runs `pnpm dev` with Turbopack
- **Verbose Logging**: Detailed error messages and stack traces
- **Source Maps**: Enabled for debugging

### Volume Mounts

The following directories are mounted for hot-reload:

These mounts are defined in `docker-compose.dev.yml`:

```yaml
# Web Service
./apps/web/src       -> /app/apps/web/src
./apps/web/public    -> /app/apps/web/public
./packages/shared    -> /app/packages/shared

# API Service
./apps/api/src       -> /app/apps/api/src
./packages/shared    -> /app/packages/shared
```

### Commands

```bash
# Build development images
docker compose build

# Start in development mode (adds dev overrides)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# View logs
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f web
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f api

# Stop services
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

### Code Changes

When running in development mode:
- ✅ Code changes in `src/` directories are picked up automatically
- ✅ No rebuild needed for most changes
- ⚠️ Changes to `package.json`, `Dockerfile`, or dependencies require rebuild:
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.dev.yml down
  docker compose build
  docker compose -f docker-compose.yml -f docker-compose.dev.yml up
  ```

## Production Mode

Production mode creates optimized builds with minimal runtime footprint.

### Configuration

In your `.env`:

```bash
DOCKER_BUILD_TARGET=production
NODE_ENV=production
```

### Features

- **Optimized Build**: Pre-built, minified production bundles
- **No Source Code**: Only compiled output included
- **Smaller Images**: No development dependencies
- **Production Runtime**: Runs `pnpm start` for Next.js, optimized NestJS build for API

### Build Process

The production build:
1. Installs all dependencies
2. Builds shared packages
3. Builds Next.js application with environment variables
4. Builds NestJS API with optimizations
5. Creates final image with only production dependencies and built output

### Commands

```bash
# Build production images (base compose only)
docker compose build

# Start in production mode (do NOT include docker-compose.dev.yml)
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Important Notes

⚠️ **Volume Mounts**: The `.next` volume mount MUST remain commented out in production mode, otherwise it will overwrite the built files with an empty directory.

⚠️ **Shared Package**: Do not mount `./packages/shared` in production. The base compose file keeps the compiled output baked into the image so `@asset2go/shared` resolves correctly at runtime.

⚠️ **Environment Variables**: Next.js requires build-time environment variables. If you change `NEXT_PUBLIC_*` variables, you must rebuild:
```bash
docker compose build --no-cache web
```

## Deployment Strategies

Choose your deployment strategy based on your traffic, budget, and scalability needs.

### Scenario 1: Development (Single Machine)

**Setup:** All services on local development machine

**Services:** API + Worker + Web (all running)

**Use case:**
- Local development and testing
- Feature development
- Debugging full stack

**Commands:**
```bash
docker compose up
```

**Pros:**
- Simple setup
- Easy debugging
- Fast iteration

**Cons:**
- Resource intensive on single machine
- Not representative of production architecture

---

### Scenario 2: Small Production (Single Server, <1000 Users)

**Setup:** All services on one production server

**Services:** API + Worker + Web

**Architecture:**
```
                    ┌──────────────────────┐
                    │   Single Server      │
                    │                      │
                    │  ┌────────────────┐  │
Users ──────────────┼─►│  Web (3401)    │  │
                    │  └────────┬───────┘  │
                    │           │          │
                    │  ┌────────▼───────┐  │
                    │  │  API (3400)    │  │
                    │  └────────┬───────┘  │
                    │           │          │
                    │  ┌────────▼───────┐  │
                    │  │  Worker x1     │  │
                    │  └────────┬───────┘  │
                    └───────────┼──────────┘
                                │
                    ┌───────────▼──────────┐
                    │ Neo4j + Redis + MinIO│
                    │  (External/Local)    │
                    └──────────────────────┘
```

**Commands:**
```bash
docker compose up -d
```

**Pros:**
- Simple deployment
- Low infrastructure cost
- Easy to manage

**Cons:**
- Limited scalability
- Single point of failure
- Resource contention between services

**Recommended server:** 4 CPU, 8GB RAM

---

### Scenario 3: Medium Production (Multiple Servers, 1k-10k Users)

**Setup:** Backend and frontend on separate servers

**Services:**
- **Server 1:** API + Worker (2-3 worker instances)
- **Server 2:** Web (with CDN)

**Architecture:**
```
                    ┌──────────────────┐
                    │   Load Balancer  │
                    │    or Nginx      │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼────────┐     │     ┌───────▼────────┐
     │   Server 1      │     │     │   Server 2     │
     │   (Backend)     │     │     │  (Frontend)    │
     │                 │     │     │                │
     │ ┌─────────────┐ │     │     │ ┌────────────┐ │
     │ │ API (3400)  │◄┼─────┼─────┼─│ Web (3401) │ │
     │ └──────┬──────┘ │     │     │ └────────────┘ │
     │        │        │     │     └────────────────┘
     │ ┌──────▼──────┐ │     │
     │ │ Worker x3   │ │     │
     │ └──────┬──────┘ │     │
     └────────┼────────┘     │
              │              │
     ┌────────▼──────────────▼──────────┐
     │ Neo4j + Redis + MinIO            │
     │ (Managed/External Services)      │
     └──────────────────────────────────┘
```

**Server 1 Commands:**
```bash
# Backend server
docker compose up api --scale worker=3 -d
```

**Server 2 Commands:**
```bash
# Frontend server (configure API_INTERNAL_URL to point to Server 1)
docker compose up web -d
```

**Pros:**
- Better resource allocation
- Independent scaling
- Web can use CDN
- Backend stays near database

**Cons:**
- More complex networking
- Multiple servers to manage
- Higher infrastructure cost

**Recommended:**
- Server 1: 4 CPU, 8GB RAM (Backend)
- Server 2: 2 CPU, 4GB RAM (Frontend + CDN)

---

### Scenario 4: Large Production (High Availability, 10k+ Users)

**Setup:** Multiple instances of each service with load balancing

**Services:**
- **API Cluster:** 3+ API instances behind load balancer
- **Worker Pool:** 5+ workers for parallel processing
- **Web Cluster:** 2+ web instances with CDN
- **Infrastructure:** Managed Neo4j cluster, Redis cluster, S3

**Architecture:**
```
                        ┌──────────────────┐
                        │  CDN (Cloudflare)│
                        └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐
                        │  Load Balancer   │
                        │  (HAProxy/Nginx) │
                        └────────┬─────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 │               │               │
         ┌───────▼──────┐  ┌────▼──────┐  ┌────▼──────┐
         │   Web-1      │  │  Web-2    │  │  Web-3    │
         │  (3401)      │  │  (3401)   │  │  (3401)   │
         └───────┬──────┘  └────┬──────┘  └────┬──────┘
                 │               │               │
                 └───────────────┼───────────────┘
                                 │
                        ┌────────▼─────────┐
                        │  API Load Bal.   │
                        └────────┬─────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 │               │               │
         ┌───────▼──────┐  ┌────▼──────┐  ┌────▼──────┐
         │   API-1      │  │  API-2    │  │  API-3    │
         │  (3400)      │  │  (3400)   │  │  (3400)   │
         └───────┬──────┘  └────┬──────┘  └────┬──────┘
                 │               │               │
                 └───────────────┼───────────────┘
                                 │
         ┌───────────────────────┼───────────────┐
         │                       │               │
    ┌────▼─────┐  ┌──────────▼──────┐  ┌───────▼──────┐
    │Worker x5 │  │Worker Pool x5   │  │Worker Pool x5│
    │ (Srv 1)  │  │    (Srv 2)      │  │   (Srv 3)    │
    └────┬─────┘  └──────────┬──────┘  └───────┬──────┘
         │                   │                  │
         └───────────────────┼──────────────────┘
                             │
         ┌───────────────────▼───────────────────┐
         │  Managed Infrastructure               │
         │  ┌──────────┐  ┌───────┐  ┌────────┐ │
         │  │Neo4j     │  │ Redis │  │   S3   │ │
         │  │ Cluster  │  │Cluster│  │ Bucket │ │
         │  └──────────┘  └───────┘  └────────┘ │
         └────────────────────────────────────────┘
```

**Setup Commands:**
```bash
# Web servers (Server 1-3)
docker compose up web -d

# API servers (Server 4-6)
docker compose up api -d

# Worker servers (Server 7-9)
docker compose up --scale worker=5 -d
```

**Pros:**
- High availability (no single point of failure)
- Horizontal scalability
- Geographic distribution possible
- Fault tolerance

**Cons:**
- Complex setup and management
- Higher costs
- Requires load balancer configuration
- More monitoring needed

**Recommended:**
- Web servers: 2 CPU, 4GB RAM each
- API servers: 4 CPU, 8GB RAM each
- Worker servers: 2 CPU, 4GB RAM each
- Use managed database services

---

### Deployment Decision Matrix

| Users      | Requests/sec | Jobs/day | Recommended Setup           | Estimated Cost  |
|------------|--------------|----------|-----------------------------|-----------------|
| <1,000     | <100         | <1,000   | Scenario 1: Single Server   | $50-100/month   |
| 1k-10k     | 100-500      | 1k-10k   | Scenario 2: 2 Servers       | $200-400/month  |
| 10k-50k    | 500-2000     | 10k-100k | Scenario 3: Clustered       | $800-1500/month |
| 50k+       | 2000+        | 100k+    | Scenario 4: Full HA         | $2000+/month    |

## Horizontal Scaling Guide

### Understanding Service Load Patterns

Each service has different scaling characteristics:

#### API Service Scaling

**Bottleneck Indicators:**
- Response time >200ms
- CPU usage >80%
- High request queue
- Connection timeouts

**Scaling Strategy:**
```bash
# Add more API instances behind load balancer
# Server 1
docker compose up api -d

# Server 2
docker compose up api -d

# Server 3
docker compose up api -d

# Configure load balancer to distribute across all three
```

**How it works:**
- Each API instance is stateless
- All connect to same Neo4j/Redis/MinIO
- Load balancer distributes requests (round-robin, least-connections, etc.)
- Share same JWT_SECRET for authentication
- No session stickiness needed

**When to scale:**
- CPU consistently >80%
- Response times degrading
- >500 requests per second per instance

---

#### Worker Service Scaling

**Bottleneck Indicators:**
- Redis queue length growing (>100 jobs)
- Job wait time increasing
- Jobs timing out
- Background tasks delayed

**Scaling Strategy:**
```bash
# Scale workers on same server
docker compose up --scale worker=5 -d

# Or distribute across multiple servers
# Server 1
docker compose up worker -d

# Server 2
docker compose up worker -d

# All workers automatically share the Redis queue
```

**How it works:**
- BullMQ (via Redis) automatically distributes jobs
- Workers pull jobs from shared queue
- No coordination needed between workers
- Can run different numbers of workers per server
- Jobs processed in parallel

**When to scale:**
- Queue length >50 jobs consistently
- Job processing time >5 minutes average
- Email/notification delays
- Scheduled tasks missing deadlines

---

#### Web Service Scaling

**Bottleneck Indicators:**
- Slow page loads (>2 seconds)
- High memory usage (>80%)
- Server errors during traffic spikes
- Geographic latency issues

**Scaling Strategy:**
```bash
# Add web instances behind load balancer
# Server 1 (US East)
docker compose up web -d

# Server 2 (US West)
docker compose up web -d

# Server 3 (EU)
docker compose up web -d

# Use CDN (Cloudflare/CloudFront) in front
```

**How it works:**
- Each web instance is stateless
- All call same API endpoint
- CDN caches static assets
- Load balancer with optional sticky sessions
- Geographic distribution reduces latency

**When to scale:**
- Memory usage >80%
- Page load time >1 second
- >100 concurrent users per instance
- Geographic distribution needed

---

### Capacity Planning Table

| Service | Per Instance Capacity | When to Add Instance | Resource per Instance |
|---------|----------------------|---------------------|----------------------|
| API     | ~500 req/sec         | CPU >80% or latency >200ms | 2 CPU, 4GB RAM |
| Worker  | ~10-50 jobs/min      | Queue >100 or delay >5min  | 1 CPU, 2GB RAM |
| Web     | ~100-200 concurrent users | Memory >80% or load time >1s | 2 CPU, 4GB RAM |

### Multi-Server Configuration Examples

#### Backend Server (API + Workers)

```bash
# Server 1: backend.example.com
# .env configuration
DOCKER_BUILD_TARGET=production
NODE_ENV=production

# Point to actual infrastructure
NEO4J_URI=bolt://neo4j-cluster.internal:7687
REDIS_HOST=redis-cluster.internal
S3_ENDPOINT=https://s3.amazonaws.com

# API configuration
API_PORT=3400
API_URL=https://api.example.com/

# Start backend services
docker compose up api --scale worker=3 -d
```

#### Frontend Server (Web Only)

```bash
# Server 2: web.example.com
# .env configuration
DOCKER_BUILD_TARGET=production
NODE_ENV=production

# Point to backend API
NEXT_PUBLIC_API_URL=https://api.example.com/
API_INTERNAL_URL=https://api.example.com/  # External since on different server

# Same infrastructure (for session storage, file uploads)
NEO4J_URI=bolt://neo4j-cluster.internal:7687
REDIS_HOST=redis-cluster.internal
S3_ENDPOINT=https://s3.amazonaws.com

# Web configuration
PORT=3401
APP_URL=https://app.example.com/
NEXT_PUBLIC_ADDRESS=https://app.example.com

# Start web service
docker compose up web -d
```

#### Load Balancer Configuration

**Nginx Load Balancer for API:**
```nginx
upstream api_backend {
    least_conn;  # Send to server with fewest connections
    server api-server-1.internal:3400;
    server api-server-2.internal:3400;
    server api-server-3.internal:3400;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/ssl/api.example.com.crt;
    ssl_certificate_key /etc/ssl/api.example.com.key;

    location / {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
```

**Nginx Load Balancer for Web:**
```nginx
upstream web_backend {
    # ip_hash for sticky sessions (optional - depends on your SSR needs)
    server web-server-1.internal:3401;
    server web-server-2.internal:3401;
}

server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_certificate /etc/ssl/app.example.com.crt;
    ssl_certificate_key /etc/ssl/app.example.com.key;

    location / {
        proxy_pass http://web_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Monitoring and Auto-Scaling

**Key Metrics to Monitor:**

**API:**
- Request rate (req/sec)
- Response time (p50, p95, p99)
- Error rate (5xx responses)
- CPU and memory usage

**Worker:**
- Queue length (Redis)
- Job processing time
- Failed job count
- Active workers

**Web:**
- Page load time
- Memory usage
- Concurrent connections
- Cache hit rate

**Auto-scaling Triggers:**
- Scale up API when: CPU >75% for 5 minutes
- Scale up Workers when: Queue length >50 for 10 minutes
- Scale up Web when: Memory >75% for 5 minutes
- Scale down: When metrics drop below 40% for 15 minutes

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Compose Services                       │
│                                                                  │
│  ┌──────────┐         ┌──────────┐         ┌──────────┐        │
│  │   API    │◄────────│  Worker  │         │   Web    │        │
│  │ (NestJS) │         │ (NestJS) │         │ (Next.js)│        │
│  │ Port 3400│         │          │         │ Port 3401│        │
│  └────┬─────┘         └────┬─────┘         └────┬─────┘        │
│       │                    │                     │              │
│       │    Docker Network: asset2go-network   │              │
│       │                    │                     │              │
└───────┼────────────────────┼─────────────────────┼──────────────┘
        │                    │                     │
        └────────────────────┴─────────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
   ┌────▼────┐         ┌──────▼───┐        ┌────▼────┐
   │  Neo4j  │         │  Redis   │        │  MinIO  │
   │Database │         │Cache/Queue│       │ Storage │
   │External │         │ External │        │External │
   └─────────┘         └──────────┘        └─────────┘
```

### Request Flow

**Browser Request (Client-Side):**
```
Browser → http://localhost:3401 → Web Container → http://localhost:3400 → API Container
```

**Server-Side Rendering (SSR):**
```
Web Container → http://api:3400 (internal Docker network) → API Container
```

## Critical Configuration

### Docker Networking for Next.js SSR

**THE PROBLEM:**
When Next.js performs server-side rendering inside a Docker container, `localhost` refers to the web container itself, NOT the API container.

**THE SOLUTION:**
The configuration uses different URLs for client-side vs server-side requests:

```bash
# In .env
NEXT_PUBLIC_API_URL=http://localhost:3400/   # Used by browser
API_INTERNAL_URL=http://api:3400/            # Used by SSR (defaults to this)
```

**How It Works:**
- `apps/web/src/config/env.ts` checks if code is running server-side (`typeof window === 'undefined'`)
- If server-side: Uses `API_INTERNAL_URL` (Docker service name `api`)
- If client-side: Uses `NEXT_PUBLIC_API_URL` (localhost for browser)

### ⚠️ CRITICAL: API_INTERNAL_URL for Multi-Server Deployments

**When services run on the SAME server (single docker-compose):**
```bash
API_INTERNAL_URL=http://api:3400/  # Docker service name works
```
The web container can reach the API container via Docker's internal network using the service name.

**When services run on DIFFERENT servers (distributed):**
```bash
# WRONG - This will NOT work:
API_INTERNAL_URL=http://api:3400/  # Docker service name doesn't exist across servers

# CORRECT - Use external URL:
API_INTERNAL_URL=https://api.example.com/  # Actual API server URL
# OR
API_INTERNAL_URL=http://10.0.1.50:3400/    # Internal IP address
```

**Why This Matters:**
- SSR requests from Web service MUST be able to reach the API
- If Web is on Server A and API is on Server B, they're on different Docker networks
- Docker service names (`api`) only work within the same Docker network
- You MUST use the external URL or internal IP address

**Testing Multi-Server API_INTERNAL_URL:**
```bash
# From your web server, test if Web container can reach API
docker compose exec web wget -O- --timeout=5 $API_INTERNAL_URL

# Should return API response, not timeout or connection refused
# If it fails, your API_INTERNAL_URL is wrong
```

**Common Mistakes:**
- ❌ Using `http://localhost:3400/` - wrong, localhost is the web container
- ❌ Using `http://api:3400/` when services are on different servers
- ✅ Using `https://api.example.com/` - correct for distributed
- ✅ Using `http://10.0.1.50:3400/` - correct for same network, different servers

**If you get 500 errors or timeouts on page load:**
1. Verify `API_INTERNAL_URL` is correctly configured for your deployment
2. Check web container can reach API: `docker compose exec web wget -O- $API_INTERNAL_URL`
3. For multi-server: Ensure firewall rules allow web server to reach API server
4. Check both containers have network connectivity to shared infrastructure (Neo4j, Redis, MinIO)

### Build Targets

The `DOCKER_BUILD_TARGET` variable controls which Dockerfile stage is built:

**Development Target (`DOCKER_BUILD_TARGET=development`):**
- Uses the `development` stage in Dockerfile
- Runs development server with hot-reload
- Includes all devDependencies
- Mounts source code as volumes

**Production Target (`DOCKER_BUILD_TARGET=production`):**
- Uses `builder` and `production` stages in Dockerfile
- Creates optimized production build
- Only includes production dependencies
- No source code volumes (uses built files from image)

### Volume Mounting Strategy

**For Development:**
```yaml
volumes:
  - ./apps/web/src:/app/apps/web/src      # ✅ Hot reload
  - ./apps/web/public:/app/apps/web/public
  - ./packages/shared:/app/packages/shared
  - web-node-modules:/app/node_modules     # ✅ Preserve deps
  # .next volume is COMMENTED OUT - OK for dev (rebuilt on change)
```

**For Production:**
```yaml
volumes:
  - ./apps/web/src:/app/apps/web/src      # ✅ Still mounted (ignored by production build)
  - ./apps/web/public:/app/apps/web/public
  - ./packages/shared:/app/packages/shared
  - web-node-modules:/app/node_modules     # ✅ Needed for node_modules
  # .next volume MUST BE COMMENTED OUT - Critical for production!
```

⚠️ **Critical:** The `.next` directory volume mount MUST remain commented out. If uncommented in production mode, it creates an empty volume that overwrites the built `.next` directory, causing the error:
```
Could not find a production build in the '.next' directory
```

## Environment Variables

### Complete Reference

All variables with their REQUIRED/OPTIONAL status:

```bash
# =============================================================================
# BUILD CONFIGURATION (REQUIRED)
# =============================================================================
DOCKER_BUILD_TARGET=development  # REQUIRED: 'development' or 'production'
NODE_ENV=development             # REQUIRED: 'development' or 'production'

# =============================================================================
# API CONFIGURATION (REQUIRED)
# =============================================================================
API_PORT=3400                    # REQUIRED: Port for API server
API_URL=http://localhost:3400/   # REQUIRED: External API URL

# =============================================================================
# WEB CONFIGURATION (REQUIRED)
# =============================================================================
PORT=3401                                   # REQUIRED: Port for web server
APP_URL=http://localhost:3401/              # REQUIRED: External web URL
NEXT_PUBLIC_API_URL=http://localhost:3400/  # REQUIRED: API URL for browser
NEXT_PUBLIC_ADDRESS=http://localhost:3401   # REQUIRED: Web address for browser

# =============================================================================
# DOCKER INTERNAL NETWORKING (CRITICAL FOR MULTI-SERVER)
# =============================================================================
# SINGLE SERVER: Use Docker service name (default)
API_INTERNAL_URL=http://api:3400/  # Works when all services on same docker-compose

# MULTI-SERVER: MUST use external URL or IP
# API_INTERNAL_URL=https://api.example.com/       # Use actual domain
# API_INTERNAL_URL=http://10.0.1.50:3400/         # Or internal IP
#
# ⚠️  CRITICAL: If Web and API are on different servers, you MUST set this
#     to the actual API server URL, NOT the Docker service name!

# =============================================================================
# DATABASE (REQUIRED)
# =============================================================================
NEO4J_URI=bolt://localhost:7687  # REQUIRED: Neo4j connection URI
NEO4J_USER=neo4j                 # REQUIRED: Neo4j username
NEO4J_PASSWORD=your-password     # REQUIRED: Neo4j password
NEO4J_DATABASE=asset2go        # REQUIRED: Neo4j database name

# =============================================================================
# CACHE & QUEUE (REQUIRED)
# =============================================================================
REDIS_HOST=localhost             # REQUIRED: Redis host
REDIS_PORT=6379                  # REQUIRED: Redis port
REDIS_PASSWORD=your-password     # REQUIRED: Redis password
REDIS_USERNAME=default           # OPTIONAL: Redis username (default: "default")
QUEUE=asset2go                 # REQUIRED: Queue name for BullMQ

# =============================================================================
# OBJECT STORAGE (REQUIRED)
# =============================================================================
S3_TYPE=minio                    # OPTIONAL: 'minio' or 's3' (default: minio)
S3_ENDPOINT=http://localhost:9000/  # REQUIRED: S3/MinIO endpoint
S3_BUCKET=asset2go             # REQUIRED: Bucket name
S3_ACCESS_KEY_ID=your-access-key # REQUIRED: Access key
S3_SECRET_ACCESS_KEY=your-secret # REQUIRED: Secret key
S3_REGION=us-east-1              # REQUIRED: Region

# =============================================================================
# AUTHENTICATION (REQUIRED)
# =============================================================================
JWT_SECRET=your-jwt-secret       # REQUIRED: JWT secret (min 32 characters)
JWT_EXPIRES_IN=7d                # OPTIONAL: JWT expiration (default: 7d)

# =============================================================================
# WEB PUSH - VAPID (REQUIRED)
# =============================================================================
VAPID_PUBLIC_KEY=your-public-key          # REQUIRED: VAPID public key
VAPID_PRIVATE_KEY=your-private-key        # REQUIRED: VAPID private key
VAPID_EMAIL=your-email@example.com        # OPTIONAL: Contact email for VAPID
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key  # REQUIRED: Public key for browser

# =============================================================================
# CORS CONFIGURATION (OPTIONAL)
# =============================================================================
CORS_ORIGINS=http://localhost:3401  # OPTIONAL: Allowed CORS origins

# =============================================================================
# EMAIL CONFIGURATION (OPTIONAL)
# =============================================================================
EMAIL_PROVIDER=smtp              # OPTIONAL: Email provider
EMAIL_API_KEY=your-api-key       # OPTIONAL: API key for email provider
EMAIL_FROM=noreply@example.com   # OPTIONAL: From email address
EMAIL_HOST=smtp.example.com      # OPTIONAL: SMTP host
EMAIL_PORT=587                   # OPTIONAL: SMTP port
EMAIL_SECURE=false               # OPTIONAL: Use TLS/SSL
EMAIL_USERNAME=your-username     # OPTIONAL: SMTP username
EMAIL_PASSWORD=your-password     # OPTIONAL: SMTP password

# =============================================================================
# CACHING (OPTIONAL)
# =============================================================================
CACHE_ENABLED=true               # OPTIONAL: Enable/disable caching (default: true)
CACHE_DEFAULT_TTL=3600           # OPTIONAL: Default cache TTL in seconds

# =============================================================================
# RATE LIMITING (OPTIONAL)
# =============================================================================
RATE_LIMIT_ENABLED=true          # OPTIONAL: Enable rate limiting (default: true)
RATE_LIMIT_TTL=60                # OPTIONAL: Rate limit window in seconds
RATE_LIMIT_REQUESTS=100          # OPTIONAL: Max requests per window
```

### Environment Variable Hierarchy

Docker Compose resolves variables in this order:
1. Environment variables set in shell
2. `.env` file in project root
3. Default values in docker-compose.yml (e.g., `${API_PORT:-3400}`)

### Verifying Environment Variables

```bash
# Check resolved docker-compose configuration
docker compose config

# Check variables inside running container
docker compose exec web printenv | grep API
docker compose exec api printenv | grep NEO4J
```

## Troubleshooting

### Issue: 500 Error on Page Load (Timeout)

**Symptoms:**
- Page loads after 30+ second timeout
- Browser shows: `Error: 500:`
- No logs in API container

**Cause:** Web container can't reach API via Docker network

**Solution:**
1. Verify `API_INTERNAL_URL` environment variable:
   ```bash
   docker compose exec web printenv | grep API_INTERNAL_URL
   # Should show: API_INTERNAL_URL=http://api:3400/
   ```

2. Test connectivity:
   ```bash
   docker compose exec web wget -O- http://api:3400
   # Should return API response, not timeout
   ```

3. Check both services are on same network:
   ```bash
   docker compose ps
   # Both should show "asset2go-network"
   ```

4. If still failing, restart with network reset:
   ```bash
   docker compose down
   docker compose up
   ```

### Issue: Production Build Not Found

**Symptoms:**
```
Could not find a production build in the '.next' directory
```

**Cause:** The `.next` volume mount is overwriting the built files

**Solution:**
Check `docker-compose.yml` and ensure this line is commented out:
```yaml
# - web-next:/app/apps/web/.next  # MUST be commented in production!
```

Then rebuild:
```bash
docker compose down
docker compose build
docker compose up
```

### Issue: Code Changes Not Reflected

**Symptoms:** You edit code but changes don't appear in the running container

**Cause:** Running production build or volumes not mounted

**Solution:**
1. Verify development mode:
   ```bash
   grep DOCKER_BUILD_TARGET .env
   # Should show: DOCKER_BUILD_TARGET=development
   ```

2. Rebuild with development target:
   ```bash
   docker compose down
   docker compose build
   docker compose up
   ```

3. Check volumes are mounted:
   ```bash
   docker compose config | grep -A 5 volumes
   ```

### Issue: Build Fails with "Cannot find module"

**Cause:** Dependencies not installed or cached incorrectly

**Solution:**
```bash
# Clear build cache and rebuild
docker compose build --no-cache

# If still failing, remove volumes
docker compose down -v
docker compose build
docker compose up
```

### Issue: API Container Exits Immediately

**Symptoms:** `docker compose ps` shows API as "Exited (1)"

**Solution:**
```bash
# Check logs for error
docker compose logs api

# Common issues:
# 1. Can't connect to Neo4j/Redis - verify connection strings
# 2. Missing environment variables - check .env file
# 3. Build error - rebuild with --no-cache
```

### Issue: Port Already in Use

**Symptoms:**
```
Error starting userland proxy: listen tcp 0.0.0.0:3400: bind: address already in use
```

**Solution:**
```bash
# Find process using port (macOS/Linux)
lsof -i :3400

# Find process using port (Windows)
netstat -ano | findstr :3400

# Either kill the process or change port in .env:
PORT=3402  # for web
API_PORT=3402  # for api
```

### Issue: Out of Disk Space

**Solution:**
```bash
# Check Docker disk usage
docker system df

# Remove unused images and containers
docker system prune -a

# Remove volumes (WARNING: deletes data)
docker system prune -a --volumes
```

### Issue: NEXT_PUBLIC_* Variable Changes Not Applied

**Cause:** Next.js bakes `NEXT_PUBLIC_*` variables into the build at build time

**Solution:**
After changing any `NEXT_PUBLIC_*` variable:
```bash
# Must rebuild web container
docker compose build --no-cache web
docker compose up web
```

## Advanced Topics

### Running Individual Services

```bash
# Start only API (and its dependencies)
docker compose up api

# Start only Web (and its dependencies)
docker compose up web

# Start only Worker
docker compose up worker
```

### Viewing Logs

```bash
# Follow all logs
docker compose logs -f

# Follow specific service
docker compose logs -f web

# Show last 100 lines
docker compose logs --tail=100 api

# Filter logs
docker compose logs web | grep Error
```

### Executing Commands in Containers

```bash
# Open shell in container
docker compose exec web sh
docker compose exec api sh

# Run single command
docker compose exec api npm run migrate
docker compose exec web ls -la /app/apps/web/.next

# Check environment
docker compose exec web printenv
```

### Scaling Workers

```bash
# Run 3 worker instances
docker compose up --scale worker=3
```

### Inspecting Networks

```bash
# List networks
docker network ls

# Inspect asset2go network
docker network inspect asset2go_asset2go-network

# Test connectivity between services
docker compose exec web ping api
docker compose exec web wget -O- http://api:3400
```

### Cleaning Up

```bash
# Stop services
docker compose down

# Stop and remove volumes
docker compose down -v

# Remove all Asset2Go containers and images
docker compose down --rmi all --volumes

# Clean up Docker system
docker system prune -a
```

### Resource Monitoring

```bash
# Live resource usage
docker stats

# Container processes
docker compose top

# Disk usage
docker system df
```

## Switching Between Dev and Production

To switch modes, update `.env` and rebuild:

```bash
# Switch to Development
# Edit .env: DOCKER_BUILD_TARGET=development
docker compose down
docker compose build
docker compose up

# Switch to Production
# Edit .env: DOCKER_BUILD_TARGET=production
docker compose down
docker compose build
docker compose up
```

**Note:** Always rebuild when changing `DOCKER_BUILD_TARGET` as it uses different Dockerfile stages.

## Best Practices

### Development

1. **Use development mode** (`DOCKER_BUILD_TARGET=development`) for active development
2. **Keep volumes mounted** for hot-reload (default configuration)
3. **Don't commit `.env`** - use `.env.example` as template
4. **Check logs regularly** when something doesn't work
5. **Rebuild after dependency changes** (package.json modifications)

### Production

1. **Always use production mode** (`DOCKER_BUILD_TARGET=production`)
2. **Never commit secrets** - use environment variable management tools
3. **Keep `.next` volume commented out** in docker-compose.yml
4. **Use specific image tags** instead of `latest`
5. **Enable health checks** and monitoring
6. **Rebuild after ANY environment variable change** affecting build

### Both Modes

1. **Run external infrastructure** (Neo4j, Redis, MinIO) before starting services
2. **Verify network connectivity** if services can't communicate
3. **Monitor disk space** - Docker images can consume significant space
4. **Use `.dockerignore`** to exclude unnecessary files from build context
5. **Clean up regularly** with `docker system prune`

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [NestJS Docker Documentation](https://docs.nestjs.com/recipes/docker)
- [Multi-stage Docker Builds](https://docs.docker.com/build/building/multi-stage/)

---

**Questions or Issues?**
Check the main [README.md](./README.md) or open an issue on the repository.
