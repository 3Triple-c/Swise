# StockWise — Inventory SaaS

A production-grade inventory management SaaS built with NestJS, React, and PostgreSQL.

---

## Project Structure

```
stockwise/
├── backend/    # NestJS API
└── frontend/   # React + Vite
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (use [Neon](https://neon.tech) for free cloud Postgres)
- Redis (use [Upstash](https://upstash.com) — free tier)

---

### 1. Backend setup

```bash
cd backend

# Install dependencies (already done if you ran the scaffold)
npm install

# Copy env file and fill in your values
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run migrations (creates all tables)
npx prisma migrate dev --name init

# Start dev server
npm run start:dev
```

API will be live at: `http://localhost:3000/api/v1`

---

### 2. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

App will be live at: `http://localhost:5173`

---

## Environment Variables (backend/.env)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string from Neon |
| `JWT_ACCESS_SECRET` | Random string for signing access tokens |
| `JWT_REFRESH_SECRET` | Random string for signing refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL (default: `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL (default: `7d`) |
| `PORT` | API port (default: `3000`) |
| `FRONTEND_URL` | CORS origin (default: `http://localhost:5173`) |

---

## API Endpoints (Phase 1)

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Register org + owner |
| POST | `/api/v1/auth/login` | Public | Login |
| POST | `/api/v1/auth/refresh` | Public | Refresh access token |
| POST | `/api/v1/auth/logout` | JWT | Logout |
| GET  | `/api/v1/auth/me` | JWT | Get current user |
| POST | `/api/v1/auth/invite` | JWT (OWNER/MANAGER) | Invite team member |
| POST | `/api/v1/auth/accept-invite` | Public | Accept invitation |

---

## RBAC Roles

| Role | Permissions |
|---|---|
| `OWNER` | Full access — billing, settings, all data |
| `MANAGER` | Products, inventory, purchases, sales, suppliers, reports |
| `STAFF` | Record sales, view products and inventory |

Roles are hierarchical: OWNER > MANAGER > STAFF.
Use the `@Roles(Role.MANAGER)` decorator on any controller method.

---

## Architecture Decisions

**Why multi-tenant from day 1?**
Every table has `org_id`. Adding it later is painful. Start right.

**Why `stock_movements` instead of just updating `quantity`?**
Immutable audit trail. You can always reconstruct current stock by summing movements. You can never reconstruct history from a plain integer column.

**Why refresh token rotation?**
Every time a refresh token is used, it's deleted and a new one issued. Stolen refresh tokens are single-use only.

---

## Phase Roadmap

- [x] Phase 1 — Auth, multi-tenancy, RBAC, DB schema
- [ ] Phase 2 — Products, categories, inventory tracking
- [ ] Phase 3 — Purchases, sales, suppliers, CSV import/export
- [ ] Phase 4 — Dashboard, analytics, charts
- [ ] Phase 5 — Forecasting, auto-reorder, multi-location, barcode scanner
- [ ] Phase 6 — SaaS billing (Paystack/Stripe), email notifications, team management
