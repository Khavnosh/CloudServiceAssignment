# Presentation Outline (10 min + 5 min Q&A)
## Cloud Services — Inventory Management System

Use this as the structure for your **Canva** slides. Keep slides visual; speak the details.

---

## Slide 1 — Title
- **Inventory Management System**
- Cloud Services Project — Week 1–7
- Group [X]: [Member names]
- [Course / Lecturer / Date]

---

## Slide 2 — Problem & Goal
**Problem:** Manual inventory tracking is error-prone and hard to scale.

**Goal:** A containerized web app to manage products, stock movements, and employees — demonstrating Cloud Services concepts.

---

## Slide 3 — Architecture Overview
*(Insert your draw.io architecture diagram)*

Key points to say:
- 3 services: Frontend (Vue.js + Nginx), Backend (Node.js), Database (PostgreSQL)
- User → Nginx (port 8080) → reverse proxy `/api` → Backend (3000) → PostgreSQL (5432)
- Named volumes for persistence

---

## Slide 4 — Docker Compose Design
| Service | Image / Build | Port | Network | Volume |
|---------|--------------|------|---------|--------|
| frontend | Nginx + Vue build | 8080→80 | external + internal | nginx-logs |
| backend | Node.js 20 | (internal 3000) | internal | — |
| db | postgres:16-alpine | (internal 5432) | internal | pgdata |

**Networks:**
- `external` — public access (only frontend publishes a port)
- `internal` — `internal: true`, backend & db isolated from outside

---

## Slide 5 — Tech Stack
- **Frontend:** Vue.js 3, Pinia, Vue Router, Axios, Vite
- **Backend:** Node.js 20, Express, JWT, bcrypt, Winston, Morgan
- **Database:** PostgreSQL 16
- **Containerization:** Docker, Docker Compose, multi-stage builds
- **Reverse Proxy:** Nginx

---

## Slide 6 — Application Flow
*(Insert your flow diagram)*

Highlights:
- Login → Dashboard
- Products: list, search, CRUD (admin)
- Stock Control: check-in / check-out with validation
- Employees: admin-only management
- Profile & Logout

---

## Slide 7 — Features & Validation
| Feature | Details |
|---------|---------|
| Auth | JWT, roles (admin/employee) |
| Product CRUD | Name, price, stock, expiry |
| Stock movements | Check-in/out, history, transactional |
| Validation | Client + server side, all forms |
| Health checks | `/api/health` + Docker HEALTHCHECK |
| Logging | Winston + Morgan + Docker logs |

---

## Slide 8 — Demo Plan (live)
1. `docker compose up --build -d` → all healthy
2. Login as admin
3. Add a product → show it in the list
4. Check-in stock → show updated stock
5. **Check-out with invalid quantity** → show "Stock Insufficient" warning
6. **Stop db** → show health endpoint degraded → restart → healthy again
7. `docker compose down` → `up` → show data persisted

---

## Slide 9 — Week 1–7 Concept Mapping
| Week | Concept | Where it appears |
|------|---------|------------------|
| 1 | Cloud basics | Service-oriented container architecture |
| 2 | Docker | Dockerfiles, multi-stage builds |
| 3 | Compose | docker-compose.yml orchestration |
| 4 | Networking | external/internal networks, reverse proxy |
| 5 | Storage | Named volumes, data persistence |
| 6 | Security | .env secrets, JWT, non-root, rate-limit |
| 7 | Monitoring | Health checks, structured logging |

---

## Slide 10 — Testing Summary
*(Insert screenshots from docs/TESTING.md)*
- Health check ✅
- Invalid input handling ✅
- Stock insufficient warning ✅
- Data persistence after restart ✅
- Service failure + recovery ✅
- Network isolation ✅

---

## Slide 11 — Challenges & Solutions
| Challenge | Solution |
|-----------|----------|
| Database not ready on first boot | `depends_on` + healthcheck + retry loop |
| Secrets in code | `.env` + `.env.example`, `.gitignore` |
| Frontend calling backend across containers | Nginx reverse proxy on shared network |
| Race conditions on stock updates | PostgreSQL transactions + `FOR UPDATE` |

---

## Slide 12 — Contribution
*(Table from CONTRIBUTING.md — one line per member)*

---

## Slide 13 — Thank You / Q&A
- GitHub repo link (QR code recommended)
- Canva presentation link
- "Questions?"

---

## GitHub link to include in the presentation
```
https://github.com/<your-username>/<repo-name>
```
> Share this link in Slide 1 and Slide 13. Also share the Canva link.
