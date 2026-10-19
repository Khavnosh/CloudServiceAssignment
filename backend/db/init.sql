-- =============================================================
-- Inventory Management System - Initial Schema
-- Runs automatically on first PostgreSQL container start.
-- =============================================================

-- Enable UUID extension (optional, we use serial for simplicity)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- Employees / Users ----------
CREATE TABLE IF NOT EXISTS employees (
    id              SERIAL PRIMARY KEY,
    first_name      VARCHAR(100)        NOT NULL,
    last_name       VARCHAR(100)        NOT NULL,
    birth_date      DATE                NOT NULL,
    home_address    TEXT                NOT NULL,
    phone_number    VARCHAR(30)         NOT NULL,
    email           VARCHAR(255)        NOT NULL UNIQUE,
    username        VARCHAR(50)         NOT NULL UNIQUE,
    password_hash   TEXT                NOT NULL,
    status          VARCHAR(20)         NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive')),
    role            VARCHAR(20)         NOT NULL DEFAULT 'employee'
                    CHECK (role IN ('admin', 'employee')),
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ---------- Products ----------
CREATE TABLE IF NOT EXISTS products (
    id              SERIAL PRIMARY KEY,
    product_name    VARCHAR(200)        NOT NULL,
    price           NUMERIC(12,2)       NOT NULL CHECK (price >= 0),
    stock           INTEGER             NOT NULL DEFAULT 0 CHECK (stock >= 0),
    is_expirable    BOOLEAN             NOT NULL DEFAULT FALSE,
    expirable_date  DATE,
    last_stocked    TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    -- Expiration date is required when product is expirable
    CONSTRAINT chk_expirable_date
        CHECK (is_expirable = FALSE OR expirable_date IS NOT NULL)
);

-- ---------- Stock Movements (check-in / check-out history) ----------
CREATE TABLE IF NOT EXISTS stock_movements (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER             NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    employee_id     INTEGER             REFERENCES employees(id) ON DELETE SET NULL,
    movement_type   VARCHAR(20)         NOT NULL
                    CHECK (movement_type IN ('check_in', 'check_out')),
    quantity        INTEGER             NOT NULL CHECK (quantity > 0),
    notes           TEXT,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ---------- Indexes ----------
CREATE INDEX IF NOT EXISTS idx_products_name       ON products (product_name);
CREATE INDEX IF NOT EXISTS idx_movements_product   ON stock_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_employees_username  ON employees (username);

-- ---------- Updated-at trigger ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employees_updated ON employees;
CREATE TRIGGER trg_employees_updated
    BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated ON products;
CREATE TRIGGER trg_products_updated
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
