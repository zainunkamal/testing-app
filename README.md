# DataBridge: PostgreSQL & Redis Integration & Testing Lab

A production-grade web application and testing tool built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, and **ioredis**. Designed for senior software architects, DevOps engineers, and full-stack developers to verify connections, measure network latency, and execute CRUD/Key-Value operations on PostgreSQL and Redis without ever exposing credentials to the client.

---

## 🚀 Key Features

### 1. Unified Dashboard (`/`)
- Real-time connection status monitoring for both PostgreSQL and Redis.
- Parallel connection test triggers with roundtrip latency in milliseconds.
- Safe connection metadata display (host, port, database/dbIndex) with credentials/passwords strictly redacted.
- Quick navigation cards to all testing modules.

### 2. PostgreSQL Suite
- **Connection Test (`/postgres/connection`)**:
  - Tests socket reachability, authentication, and pool latency with `SELECT 1 as result;`.
  - Detailed connection metadata with safe SSL encryption detection.
  - Actionable troubleshooting steps if the database is unreachable.
- **Dynamic Tables & Data CRUD (`/postgres/tables`)**:
  - Introspects public schema tables with estimated row counts.
  - Auto-detects columns, primary keys, identity/auto-increment columns, and data types via `information_schema`.
  - Dynamic table data viewer with server-side pagination, search across text columns, and custom column sorting.
  - Form modal for inserting new records and editing existing records with automatic type casting.
  - Destructive delete with modal confirmation to prevent accidental loss.
- **Telemetry & Server Information (`/postgres/info`)**:
  - PostgreSQL engine version string, active database, and current role.
  - Active client connections vs `max_connections` limit.
  - Physical database disk size (`pg_size_pretty`).
  - Database encoding, server timezone, and server uptime since postmaster start.
  - 10-second auto-refresh toggle.

### 3. Redis Suite
- **Connection Test (`/redis/connection`)**:
  - Tests Redis socket responsiveness and latency with `PING` (expecting `PONG`).
  - Safe host, port, db index, and TLS status display.
- **Key-Value Operations & Browser (`/redis/keys`)**:
  - Non-blocking cursor-based iteration using `SCAN` (safeguards against server lockups on large datasets).
  - Pipelined data type and TTL retrieval (`TYPE` and `TTL` in 1 network roundtrip).
  - Search by glob patterns (e.g. `*`, `user:*`, `test:*`).
  - Humanized TTL status badges (`PERSISTENT`, `1h 30m`, `EXPIRED`).
  - Modal viewer supporting `string`, auto-detected `JSON` with indentation, `hash`, `list`, `set`, and `zset`.
  - Create and update key-value pairs with customizable expiration presets (1 hour, 24 hours, persistent).
  - Safe key deletion with confirmation dialog.
- **Telemetry & Diagnostics (`/redis/info`)**:
  - Redis version, architecture mode (`standalone`/`cluster`), and host OS.
  - Connected clients and blocked clients.
  - Memory consumption (used memory vs peak memory human-readable).
  - Total keys in current database (`DBSIZE`) and keyspace breakdown across all db indexes.
  - Instantaneous operations per second and total commands processed.
  - Raw telemetry explorer with instant search across all Redis `INFO` statistics.

---

## 🔒 Security Architecture

1. **Strict Server-Side Isolation**:
   - Connection URLs (`DATABASE_URL`, `REDIS_URL`) are read exclusively by server components and API routes.
   - Zero `NEXT_PUBLIC_` environment variables used for database or cache credentials.
2. **Deep Password Redaction**:
   - URL sanitizer strips passwords from all metadata objects before sending JSON to the browser.
   - Server logger recursively scans and masks any sensitive keys (`password`, `secret`, `token`, `credential`, connection strings) with `***`.
3. **SQL Injection Defense**:
   - No raw SQL inputs accepted from the client.
   - Dynamic table and column identifiers are validated against an internal whitelist fetched from `information_schema`.
   - All filter values, primary keys, limits, and offsets are parameterized (`$1, $2, ...`).
4. **Redis Performance Protection**:
   - Never uses blocking `KEYS *` in production code; all key discoveries use cursor-based `SCAN` with `COUNT` limits.

---

## 🐳 Quick Start with Docker Compose

Run the entire stack (PostgreSQL 16, Redis 7, and Next.js) with a single command:

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 16** on port `5432` with pre-seeded sample tables (`users`, `products`, `customers`).
- **Redis 7** on port `6379` with data persistence.
- **Next.js App** on port `3000` connected to internal Docker container network.

Access the application in your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

To view container logs:
```bash
docker compose logs -f app
```

To stop all containers:
```bash
docker compose down
```

> 📚 **Panduan Lengkap Tugas / Praktikum Docker:**
> Untuk penjelasan mendalam mengenai Dockerfile multi-stage build, konsep Volume persisten, Virtual Network, perintah manual `docker run`, inspeksi `docker exec`, dan `docker stats`, silakan baca file: **[`README-DOCKER.md`](./README-DOCKER.md)**.
>
> 🧪 **Laporan Hasil Pengujian Aplikasi:**
> Untuk rincian hasil test fungsionalitas (PostgreSQL CRUD, Redis Caching, Telemetri, dan latency), silakan baca file: **[`README-TESTING.md`](./README-TESTING.md)**.

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js 20+
- npm or pnpm
- Running PostgreSQL and Redis instances (or use Docker for database/cache only)

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Update `.env` with your connection strings:
```env
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/postgres_lab
REDIS_URL=redis://localhost:6379/0
```

### 3. Install Dependencies & Generate Prisma Client
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start testing your databases.

---

## 📦 Project Structure

```
.
├── Dockerfile                  # Multi-stage production container build (deps, builder, runner)
├── docker-compose.yml          # Stack orchestration for Postgres, Redis, and Next.js
├── database/
│   └── init.sql                # Auto-executed seed script on first database boot
├── prisma/
│   └── schema.prisma           # Prisma models (User, Product, Customer)
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── api/                # Server-side API endpoints (/postgres/*, /redis/*)
│   │   ├── postgres/           # PostgreSQL UI pages (connection, tables, info)
│   │   ├── redis/              # Redis UI pages (connection, keys, info)
│   │   └── page.tsx            # Interactive unified dashboard
│   ├── components/             # Reusable UI & layout components
│   │   ├── layout/             # Sidebar, Header
│   │   ├── postgres/           # DynamicCrudModal
│   │   ├── redis/              # SetKeyModal, KeyValueViewerModal
│   │   └── ui/                 # Button, Card, Badge, Dialog
│   ├── lib/                    # Core utilities (logger, errors, url-sanitizer, prisma, redis)
│   ├── services/               # PostgresService & RedisService
│   └── types/                  # TypeScript interfaces for database & cache operations 
```

---

## 📄 License
MIT
