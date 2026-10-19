# Contribution Notes

## Team: [Your Group Name / Number]

| Member | Student ID | Role | Contributions |
|--------|-----------|------|---------------|
| [Name 1] | [NIM] | Backend / Docker | REST API (Express), PostgreSQL schema, Docker Compose, health checks, logging, JWT auth |
| [Name 2] | [NIM] | Frontend / UI | Vue.js components, routing, Pinia state, form validation, UI/UX design |
| [Name 3] | [NIM] | DevOps / Docs | Dockerfiles, Nginx reverse proxy, .env config, README, architecture diagram |
| [Name 4] | [NIM] | Testing / Presentation | Test scenarios, demo script, Canva slides, presentation delivery |

> **Note:** Replace the names, student IDs, and adjust the contributions to match the actual work done by each member.

---

## Work Breakdown Detail

### Backend & Database (Member 1)
- Designed PostgreSQL schema (`employees`, `products`, `stock_movements`)
- Implemented Express REST API with controllers and routes
- JWT authentication and role-based authorization middleware
- Input validation middleware
- Transactional stock check-in/check-out (row-level locking)
- Winston + Morgan logging
- Health check endpoint

### Frontend (Member 2)
- Vue.js 3 SPA with Vite
- Login page with client-side validation
- Dashboard with stats and low-stock alerts
- Products page with search, CRUD modals
- Stock Control page with check-in/check-out modals
- Employee management page (admin only)
- Profile page
- Axios interceptors for JWT and auto-logout

### Docker & DevOps (Member 3)
- Multi-stage Dockerfiles for frontend and backend
- Nginx configuration with reverse proxy and SPA routing
- Docker Compose: services, healthchecks, depends_on
- Named volumes (`pgdata`, `nginx-logs`)
- Dual network setup (`external` + `internal`)
- `.env.example` template
- README with full documentation

### Testing & Presentation (Member 4)
- Test scenarios covering CRUD, validation, error handling, persistence
- Service failure demonstration (stop/start db)
- Canva presentation slides
- Architecture diagram (draw.io)
- Presentation delivery and Q&A preparation

---

## How to Verify Contribution

Each member should be able to explain:
1. The architecture diagram (services, networks, volumes)
2. How their component works
3. At least one API endpoint or UI feature end-to-end
4. The Week 1–7 concept mapping relevant to their work
