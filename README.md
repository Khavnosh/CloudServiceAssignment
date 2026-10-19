# =============================================================
# Inventory Management System — REST API
# Cloud Services Project (Week 1–7)
# =============================================================

A simple inventory management application with product CRUD,
stock check-in/check-out, and employee administration.
Containerized with Docker and Docker Compose.

## Architecture

```
                          ┌─────────────────────────────────────────┐
                          │              Docker Host                 │
  Public Internet User    │  ┌───────────────────────────────────┐  │
        ──────────────►   │  │  Network: external (bridge)        │  │
                          │  │  ┌─────────────────────────────┐  │  │
                          │  │  │  front-end (Nginx + Vue.js) │  │  │
                          │  │  └──────────┬──────────────────┘  │  │
                          │  └─────────────┼─────────────────────┘  │
                          │                │  Network: internal      │
                          │  ┌─────────────▼─────────────────────┐  │
                          │  │  back-end  (Node.js REST API)     │  │
                          │  │           :3000                    │  │
                          │  └─────────────┬─────────────────────┘  │
                          │  ┌─────────────▼─────────────────────┐  │
                          │  │  db  (PostgreSQL 16)  :5432       │  │
                          │  └─────────────┬─────────────────────┘  │
                          │                │                         │
                          │         [ Named Volume: pgdata ]         │
                          └─────────────────────────────────────────┘
```

| Service    | Technology          | Port  | Network             | Volume      |
|------------|---------------------|-------|---------------------|-------------|
| `frontend` | Vue.js 3 + Nginx    | 8080  | external + internal | nginx-logs  |
| `backend`  | Node.js 20 + Express| 3000  | internal            | —           |
| `db`       | PostgreSQL 16       | 5432  | internal            | pgdata      |

**Networks**
- `external` — reachable by the host / public users (only `frontend` publishes a port).
- `internal` — `internal: true`, isolated from the outside. `backend` and `db` live here; `frontend` bridges both networks and reverse-proxies `/api/*` to `backend`.

**Volumes**
- `pgdata` — PostgreSQL data files survive container removal (`docker compose down` without `-v`).
- `nginx-logs` — Nginx access / error logs.

## Features

| Feature                    | Description                                                |
|----------------------------|------------------------------------------------------------|
| Authentication             | Login with JWT, role-based access (admin / employee)       |
| Products CRUD              | Create, read, update, delete products (admin for CUD)      |
| Stock Check-In / Check-Out | Transactional stock movements with history log             |
| Employee Management        | Admin can add / edit / remove employee accounts            |
| Input Validation           | Client-side + server-side validation for all forms         |
| Health Checks              | `/api/health` (backend) + Docker `healthcheck` on all services |
| Logging                    | Winston (app) + Morgan (HTTP) + Docker stdout logs         |
| Rate Limiting              | Brute-force protection on login endpoint                   |

## Project Structure

```
CloudServiceAssignment/
├── docker-compose.yml          # Orchestration: services, networks, volumes
├── .env.example                # Environment template (copy to .env)
├── .gitignore
├── README.md
├── docs/
│   └── TESTING.md              # Test evidence & scenarios
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── db/
│   │   └── init.sql            # Schema (auto-run on first boot)
│   └── src/
│       ├── index.js            # Express app entry
│       ├── config/db.js        # PostgreSQL pool
│       ├── middleware/         # auth, validation, error handler
│       ├── controllers/        # business logic
│       ├── routes/             # API route definitions
│       └── utils/logger.js     # Winston logger
└── frontend/
    ├── Dockerfile              # Multi-stage: Vite build → Nginx
    ├── nginx.conf              # SPA + reverse proxy config
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.js
        ├── App.vue
        ├── api/client.js       # Axios instance with JWT interceptor
        ├── stores/auth.js      # Pinia auth store
        ├── router/index.js     # Vue Router with guards
        ├── components/
        └── views/              # Login, Dashboard, Products, Stock, Employees, Profile
```

## Quick Start

### Prerequisites
- Docker Desktop (or Docker Engine + Compose v2)
- Git

### 1. Clone & configure

```bash
git clone <your-repo-url>
cd CloudServiceAssignment

# Copy the environment template
cp .env.example .env
```

Edit `.env` and set at minimum:
```
POSTGRES_PASSWORD=your_strong_password
JWT_SECRET=your_long_random_secret
ADMIN_PASSWORD=YourAdminPassword123
```

### 2. Build & run

```bash
docker compose up --build -d
```

Wait ~30 seconds for all healthchecks to pass:
```bash
docker compose ps
```

### 3. Open the app

| URL                                          | Description                |
|----------------------------------------------|----------------------------|
| http://localhost:8080                        | Frontend (Vue.js SPA)      |
| http://localhost:8080/api/health             | Backend health (via proxy) |
| http://localhost:8080/api/health (direct DB) | DB status included         |

### 4. Login

| Field    | Default value         |
|----------|-----------------------|
| Username | `admin`               |
| Password | value of `ADMIN_PASSWORD` in `.env` |

### 5. Stop

```bash
# Stop containers (keep data)
docker compose down

# Stop and DELETE all data
docker compose down -v
```

## API Endpoints

| Method | Endpoint              | Auth     | Description                     |
|--------|-----------------------|----------|---------------------------------|
| GET    | `/api/health`         | —        | Service & DB health check       |
| POST   | `/api/auth/login`     | —        | Login, returns JWT              |
| GET    | `/api/auth/me`        | JWT      | Current user profile            |
| GET    | `/api/products`       | JWT      | List products (search/paging)   |
| GET    | `/api/products/:id`   | JWT      | Product detail                  |
| POST   | `/api/products`       | JWT+admin| Create product                  |
| PUT    | `/api/products/:id`   | JWT+admin| Update product                  |
| DELETE | `/api/products/:id`   | JWT+admin| Delete product                  |
| POST   | `/api/stock/check-in` | JWT      | Restock product                 |
| POST   | `/api/stock/check-out`| JWT      | Remove stock (validates qty)    |
| GET    | `/api/stock/history`  | JWT      | Stock movement history          |
| GET    | `/api/employees`      | JWT+admin| List employees                  |
| POST   | `/api/employees`      | JWT+admin| Create employee                 |
| PUT    | `/api/employees/:id`  | JWT+admin| Update employee                 |
| DELETE | `/api/employees/:id`  | JWT+admin| Delete employee                 |

## Validation Rules

| Field           | Rule                                                  |
|-----------------|-------------------------------------------------------|
| Username        | 3–50 chars, unique                                    |
| Password        | 8–128 chars, must contain letter + number             |
| Email           | Valid email format, unique                            |
| Product name    | 1–200 chars                                           |
| Price           | Number ≥ 0                                            |
| Stock / Qty     | Integer ≥ 0 (check-out: ≤ current stock)              |
| Expirable date  | Required when `is_expirable = true`                   |
| Phone number    | 5–30 chars                                            |

## Health Checks

```bash
# Via reverse proxy (Nginx → backend)
curl http://localhost:8080/api/health

# Docker health status
docker compose ps
```

Response example:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-01-19T10:30:00.000Z",
  "uptime": 120.5,
  "services": {
    "api": { "status": "up", "version": "1.0.0" },
    "database": { "status": "up" }
  }
}
```

## Logging

All logs go to stdout and are captured by Docker:
```bash
# Backend application logs (Winston + Morgan)
docker compose logs -f backend

# Nginx access/error logs
docker compose logs -f frontend

# Database logs
docker compose logs -f db
```

## Technology Mapping (Week 1–7)

| Week | Topic                    | Implementation in this project                          |
|------|--------------------------|---------------------------------------------------------|
| 1    | Cloud Computing Basics   | Containerized microservice-style architecture           |
| 2    | Virtualization & Docker  | Dockerfile, multi-stage builds, images, containers      |
| 3    | Docker Compose           | `docker-compose.yml` with services, networks, volumes   |
| 4    | Networking               | `external` + `internal` networks, port mapping, reverse proxy |
| 5    | Storage & Persistence    | Named volume `pgdata`, data survives `compose down`     |
| 6    | Security & Config        | `.env` secrets, non-root containers, JWT, helmet, rate-limit |
| 7    | Monitoring & Logging     | Health checks, Winston/Morgan logging, Docker logs      |

## Testing

See [docs/TESTING.md](docs/TESTING.md) for test scenarios and evidence.

## Contribution

See [CONTRIBUTING.md](CONTRIBUTING.md) for per-member contribution notes.

## License

Educational project — Cloud Services course.
