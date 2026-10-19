import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import logger from '../utils/logger.js';

const SAFE_COLUMNS = `
  id, first_name, last_name, birth_date, home_address, phone_number,
  email, username, status, role, created_at, updated_at
`;

/** GET /api/employees  (admin) */
export async function listEmployees(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    let where = '';
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      where = `WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR username ILIKE $1 OR email ILIKE $1`;
    }

    const result = await query(
      `SELECT ${SAFE_COLUMNS} FROM employees ${where} ORDER BY last_name, first_name`,
      params
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/employees/:id  (admin) */
export async function getEmployee(req, res, next) {
  try {
    const result = await query(`SELECT ${SAFE_COLUMNS} FROM employees WHERE id = $1`, [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/employees  (admin) */
export async function createEmployee(req, res, next) {
  try {
    const {
      first_name, last_name, birth_date, home_address,
      phone_number, email, username, password,
      role = 'employee', status = 'active',
    } = req.body;

    const hash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO employees
         (first_name, last_name, birth_date, home_address, phone_number, email, username, password_hash, status, role)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING ${SAFE_COLUMNS}`,
      [first_name, last_name, birth_date, home_address, phone_number, email, username, hash, status, role]
    );

    logger.info('Employee created', { id: result.rows[0].id, username, by: req.user.username });
    return res.status(201).json({ success: true, message: 'Employee created.', data: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

/** PUT /api/employees/:id  (admin) */
export async function updateEmployee(req, res, next) {
  try {
    const { id } = req.params;
    const {
      first_name, last_name, birth_date, home_address,
      phone_number, email, username, password,
      role, status,
    } = req.body;

    const existing = await query('SELECT id FROM employees WHERE id = $1', [id]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const result = await query(
      `UPDATE employees SET
         first_name    = COALESCE($1, first_name),
         last_name     = COALESCE($2, last_name),
         birth_date    = COALESCE($3, birth_date),
         home_address  = COALESCE($4, home_address),
         phone_number  = COALESCE($5, phone_number),
         email         = COALESCE($6, email),
         username      = COALESCE($7, username),
         password_hash = COALESCE($8, password_hash),
         status        = COALESCE($9, status),
         role          = COALESCE($10, role)
       WHERE id = $11
       RETURNING ${SAFE_COLUMNS}`,
      [
        first_name ?? null, last_name ?? null, birth_date ?? null,
        home_address ?? null, phone_number ?? null, email ?? null,
        username ?? null, passwordHash, status ?? null, role ?? null,
        id,
      ]
    );

    logger.info('Employee updated', { id, by: req.user.username });
    return res.json({ success: true, message: 'Employee updated.', data: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/employees/:id  (admin) */
export async function deleteEmployee(req, res, next) {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (Number(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const result = await query('DELETE FROM employees WHERE id = $1 RETURNING id, username', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    logger.info('Employee deleted', { id, username: result.rows[0].username, by: req.user.username });
    return res.json({ success: true, message: 'Employee deleted.' });
  } catch (err) {
    return next(err);
  }
}
