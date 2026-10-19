import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import logger from '../utils/logger.js';

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    const result = await query(
      'SELECT id, username, password_hash, role, status, first_name, last_name, email FROM employees WHERE username = $1',
      [username]
    );

    const user = result.rows[0];

    if (!user || user.status !== 'active') {
      logger.warn('Login attempt failed: unknown or inactive user', { username });
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      logger.warn('Login attempt failed: wrong password', { username });
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const token = signToken(user);
    logger.info('Login successful', { username: user.username, role: user.role });

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function me(req, res, next) {
  try {
    const result = await query(
      `SELECT id, username, role, status, first_name, last_name, email, phone_number,
              home_address, birth_date, created_at
       FROM employees WHERE id = $1`,
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({ success: true, data: user });
  } catch (err) {
    return next(err);
  }
}

/**
 * Creates the initial admin account on first boot (called from index.js).
 */
export async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD;
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';

  if (!password) {
    logger.warn('ADMIN_PASSWORD not set — skipping admin seed');
    return;
  }

  const existing = await query('SELECT id FROM employees WHERE username = $1', [username]);
  if (existing.rowCount > 0) {
    logger.info('Admin user already exists, skipping seed', { username });
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  await query(
    `INSERT INTO employees
       (first_name, last_name, birth_date, home_address, phone_number, email, username, password_hash, status, role)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', 'admin')`,
    ['System', 'Administrator', '1990-01-01', 'Head Office', '0000000000', email, username, hash]
  );
  logger.info('Seeded default admin user', { username });
}
