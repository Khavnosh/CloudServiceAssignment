import pool, { query } from '../config/db.js';
import logger from '../utils/logger.js';

/**
 * POST /api/stock/check-in   { product_id, quantity, expirable_date?, notes? }
 * POST /api/stock/check-out  { product_id, quantity, notes? }
 * GET  /api/stock/history?product_id=&limit=
 */

export async function checkIn(req, res, next) {
  const client = await pool.connect();
  try {
    const { product_id, quantity, expirable_date, notes } = req.body;
    const qty = Number(quantity);

    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive integer.' });
    }

    await client.query('BEGIN');

    const prodRes = await client.query(
      'SELECT id, product_name FROM products WHERE id = $1 FOR UPDATE',
      [product_id]
    );
    const product = prodRes.rows[0];
    if (!product) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const updateRes = await client.query(
      `UPDATE products SET
         stock = stock + $1,
         last_stocked = NOW(),
         expirable_date = COALESCE($2, expirable_date)
       WHERE id = $3
       RETURNING id, product_name, price, stock, is_expirable, expirable_date, last_stocked`,
      [qty, expirable_date ?? null, product_id]
    );

    await client.query(
      `INSERT INTO stock_movements (product_id, employee_id, movement_type, quantity, notes)
       VALUES ($1, $2, 'check_in', $3, $4)`,
      [product_id, req.user.id, qty, notes || null]
    );

    await client.query('COMMIT');
    logger.info('Stock check-in', { product_id, quantity: qty, by: req.user.username });

    return res.status(200).json({
      success: true,
      message: `Checked in ${qty} unit(s) of "${product.product_name}".`,
      data: updateRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return next(err);
  } finally {
    client.release();
  }
}

export async function checkOut(req, res, next) {
  const client = await pool.connect();
  try {
    const { product_id, quantity, notes } = req.body;
    const qty = Number(quantity);

    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive integer.' });
    }

    await client.query('BEGIN');

    const prodRes = await client.query(
      'SELECT id, product_name, stock FROM products WHERE id = $1 FOR UPDATE',
      [product_id]
    );
    const product = prodRes.rows[0];
    if (!product) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    if (product.stock < qty) {
      await client.query('ROLLBACK');
      logger.warn('Stock insufficient for check-out', {
        product_id,
        requested: qty,
        available: product.stock,
      });
      return res.status(400).json({
        success: false,
        message: `Stock insufficient. Available: ${product.stock}, requested: ${qty}.`,
        data: { available: product.stock, requested: qty },
      });
    }

    const updateRes = await client.query(
      `UPDATE products SET stock = stock - $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, product_name, price, stock, is_expirable, expirable_date, last_stocked`,
      [qty, product_id]
    );

    await client.query(
      `INSERT INTO stock_movements (product_id, employee_id, movement_type, quantity, notes)
       VALUES ($1, $2, 'check_out', $3, $4)`,
      [product_id, req.user.id, qty, notes || null]
    );

    await client.query('COMMIT');
    logger.info('Stock check-out', { product_id, quantity: qty, by: req.user.username });

    return res.status(200).json({
      success: true,
      message: `Checked out ${qty} unit(s) of "${product.product_name}".`,
      data: updateRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return next(err);
  } finally {
    client.release();
  }
}

export async function history(req, res, next) {
  try {
    const { product_id } = req.query;
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);

    let where = '';
    const params = [];
    if (product_id) {
      params.push(product_id);
      where = 'WHERE m.product_id = $1';
    }

    const result = await query(
      `SELECT m.id, m.movement_type, m.quantity, m.notes, m.created_at,
              m.product_id, p.product_name,
              e.username AS performed_by
       FROM stock_movements m
       JOIN products p ON p.id = m.product_id
       LEFT JOIN employees e ON e.id = m.employee_id
       ${where}
       ORDER BY m.created_at DESC
       LIMIT $${params.length + 1}`,
      [...params, limit]
    );

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return next(err);
  }
}
