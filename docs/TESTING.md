# Testing Guide & Evidence

## 1. Environment Setup

```bash
cp .env.example .env
# Edit .env values as needed
docker compose up --build -d
docker compose ps   # all services should show "healthy"
```

---

## 2. Health Check Test

```bash
curl http://localhost:8080/api/health
```

**Expected:**
```json
{
  "success": true,
  "status": "healthy",
  "services": {
    "api": { "status": "up", "version": "1.0.0" },
    "database": { "status": "up" }
  }
}
```

**Also verify Docker healthchecks:**
```bash
docker compose ps
# NAME                  STATUS
# inventory-frontend    Up X minutes (healthy)
# inventory-backend     Up X minutes (healthy)
# inventory-db          Up X minutes (healthy)
```

---

## 3. Authentication Tests

### 3.1 Valid Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<ADMIN_PASSWORD>"}'
```
**Expected:** `200` with `token` and `user` object.

### 3.2 Invalid Login — Wrong Password
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrongpassword"}'
```
**Expected:** `401` `{"success":false,"message":"Invalid username or password."}`

### 3.3 Invalid Login — Missing Fields
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":""}'
```
**Expected:** `400` `{"success":false,"message":"Validation failed","errors":[...]}`

### 3.4 Access Without Token
```bash
curl http://localhost:8080/api/products
```
**Expected:** `401` `{"success":false,"message":"Authentication required. Please login."}`

### 3.5 Non-Admin Accessing Admin Route
Login as an `employee` role user, then:
```bash
curl http://localhost:8080/api/employees \
  -H "Authorization: Bearer <employee_token>"
```
**Expected:** `403` `{"success":false,"message":"You do not have permission to perform this action."}`

---

## 4. Product CRUD Tests

> Replace `<TOKEN>` with JWT from login.

### 4.1 Create Product
```bash
curl -X POST http://localhost:8080/api/products \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"product_name":"Laptop Asus","price":15000000,"stock":25,"is_expirable":false}'
```
**Expected:** `201` with product object including `id`.

### 4.2 Invalid Product — Negative Price
```bash
curl -X POST http://localhost:8080/api/products \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"product_name":"Bad Product","price":-100,"stock":5}'
```
**Expected:** `400` `Validation failed` — `price must be at least 0`.

### 4.3 Invalid Product — Expirable Without Date
```bash
curl -X POST http://localhost:8080/api/products \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"product_name":"Milk","price":15000,"stock":10,"is_expirable":true}'
```
**Expected:** `400` `Validation failed` — `expirable_date is required when is_expirable is true`.

### 4.3b Invalid Product — Past Expiry Date
```bash
curl -X POST http://localhost:8080/api/products \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"product_name":"Milk","price":15000,"stock":10,"is_expirable":true,"expirable_date":"2020-02-01"}'
```
**Expected:** `400` `Validation failed` — `expirable_date must be today or a future date`.

### 4.3c Invalid Product — Impossible Calendar Date
```bash
curl -X POST http://localhost:8080/api/products \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"product_name":"Milk","price":15000,"stock":10,"is_expirable":true,"expirable_date":"2026-02-30"}'
```
**Expected:** `400` `Validation failed` — `expirable_date must be a valid date (YYYY-MM-DD)`.

### 4.4 List & Search Products
```bash
curl "http://localhost:8080/api/products?q=Laptop" \
  -H "Authorization: Bearer <TOKEN>"
```
**Expected:** `200` with matching products and `meta.total`.

### 4.5 Update Product
```bash
curl -X PUT http://localhost:8080/api/products/1 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"price":14500000,"stock":30}'
```
**Expected:** `200` with updated product.

### 4.6 Delete Product
```bash
curl -X DELETE http://localhost:8080/api/products/1 \
  -H "Authorization: Bearer <TOKEN>"
```
**Expected:** `200` `{"success":true,"message":"Product deleted."}`

---

## 5. Stock Control Tests

### 5.1 Check-In (Restock)
```bash
curl -X POST http://localhost:8080/api/stock/check-in \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"product_id":1,"quantity":50,"notes":"Supplier delivery"}'
```
**Expected:** `200` — stock increases by 50, movement logged.

### 5.2 Check-Out (Valid)
```bash
curl -X POST http://localhost:8080/api/stock/check-out \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"product_id":1,"quantity":10,"notes":"Sold to customer"}'
```
**Expected:** `200` — stock decreases by 10.

### 5.3 Check-Out — Stock Insufficient ⚠️
```bash
curl -X POST http://localhost:8080/api/stock/check-out \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"product_id":1,"quantity":99999}'
```
**Expected:** `400`
```json
{
  "success": false,
  "message": "Stock insufficient. Available: 40, requested: 99999.",
  "data": { "available": 40, "requested": 99999 }
}
```
**This is the key error-handling demo for the presentation.**

### 5.4 Check-Out — Invalid Quantity
```bash
curl -X POST http://localhost:8080/api/stock/check-out \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"product_id":1,"quantity":-5}'
```
**Expected:** `400` `Validation failed` — `quantity must be at least 1`.

### 5.5 Stock History
```bash
curl "http://localhost:8080/api/stock/history?product_id=1" \
  -H "Authorization: Bearer <TOKEN>"
```
**Expected:** `200` with array of movements, each with `movement_type`, `quantity`, `performed_by`.

---

## 6. Employee Management Tests (Admin only)

### 6.1 Create Employee
```bash
curl -X POST http://localhost:8080/api/employees \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name":"Budi",
    "last_name":"Santoso",
    "birth_date":"1995-05-15",
    "home_address":"Jl. Merdeka No. 1",
    "phone_number":"081234567890",
    "email":"budi@example.com",
    "username":"budi",
    "password":"BudiPass123",
    "role":"employee"
  }'
```
**Expected:** `201` with employee object (no password_hash).

### 6.2 Invalid Employee — Bad Email
```bash
curl -X POST http://localhost:8080/api/employees \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"X","last_name":"Y","birth_date":"1990-01-01",
       "home_address":"Addr","phone_number":"0811111111",
       "email":"not-an-email","username":"xy","password":"Password1"}'
```
**Expected:** `400` `email must be a valid email address`.

### 6.3 Invalid Employee — Weak Password
```bash
# password "abcdefgh" has no number
```
**Expected:** `400` `Password must contain at least one letter and one number`.

### 6.3b Invalid Employee — Birth Date in Future / Under 15
```bash
curl -X POST http://localhost:8080/api/employees \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"A","last_name":"B","birth_date":"2020-01-01",
       "home_address":"Addr","phone_number":"081234567890",
       "email":"ab@example.com","username":"abc","password":"Password1"}'
```
**Expected:** `400` `birth_date must be at least 15 years ago`.

### 6.3c Invalid Employee — Bad Phone / Username
```bash
# phone_number: "abc!!"  → 400 phone format
# username: "bad user!"  → 400 username format
```
**Expected:** `400` with format error for the offending field.

### 6.3d Invalid Employee — Birth Date Format
```bash
# birth_date: "not-a-date"
```
**Expected:** `400` `birth_date must be a valid date (YYYY-MM-DD)`.

### 6.4 Delete Employee
```bash
curl -X DELETE http://localhost:8080/api/employees/2 \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```
**Expected:** `200` — cannot delete your own account (admin id=1).

---

## 7. Persistence Test (Key Demo)

```bash
# 1. Create a product and check-in some stock via UI or API
# 2. Stop the containers
docker compose down

# 3. Start again
docker compose up -d

# 4. Verify the product and stock still exist
curl http://localhost:8080/api/products -H "Authorization: Bearer <TOKEN>"
```
**Expected:** Data is still present — persisted in `pgdata` named volume.

```bash
# Prove the volume exists
docker volume ls | grep pgdata
```

---

## 8. Service Failure Test (Key Demo)

```bash
# Stop the database
docker compose stop db

# Check health endpoint
curl http://localhost:8080/api/health
```
**Expected:** `503`
```json
{
  "success": false,
  "status": "degraded",
  "services": {
    "api": { "status": "up" },
    "database": { "status": "down" }
  }
}
```

```bash
# Restart the database
docker compose start db

# Health should recover
curl http://localhost:8080/api/health
```

---

## 9. Logging Verification

```bash
# View backend logs (Winston + Morgan HTTP logs)
docker compose logs backend --tail=20

# View nginx access logs
docker compose logs frontend --tail=20
```

**Expected:** Timestamped log entries for every request, including validation failures and auth attempts.

---

## 10. Docker Compose Network Isolation Test

```bash
# Backend should NOT be reachable from the host
curl http://localhost:3000/api/health
# Connection refused (port not published)

# Database should NOT be reachable from the host
# (unless you explicitly published 5432 — which we did not)

# Frontend IS reachable
curl http://localhost:8080/healthz
# → ok
```

**This proves the `internal: true` network isolates backend and db.**
