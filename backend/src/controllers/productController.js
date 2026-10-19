import { query } from '../config/db.js';
import logger from '../utils/logger.js';

const PRODUCT_COLUMNS = `
  id, product_name, price, stock, is_expirable, expirable_date,
  last_stocked, created_at, updated_at
`;

/** GET /api/products?q=&page=&limit= */
export async function listProducts(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    let where = '';
    const params = [];
    if (q) {
      params.push(`%${q}%`);
      where = 'WHERE product_name ILIKE $1 OR id::text = $2';
      params.push(q);
    }

    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM products ${where}`,
      params
    );
    const total = countRes.rows[0].total;

    const listParams = [...params, limit, offset];
    const listRes = await query(
      `SELECT ${PRODUCT_COLUMNS} FROM products ${where}
       ORDER BY product_name ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      listParams
    );

    return res.json({
      success: true,
      data: listRes.rows,
      meta: { total, page, limit },
    });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/products/:id */
export async function getProduct(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = $1`, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/products  (admin) */
export async function createProduct(req, res, next) {
  try {
    const { product_name, price, stock = 0, is_expirable = false, expirable_date = null } = req.body;

    if (is_expirable && !expirable_date) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'expirable_date', message: 'expirable_date is required when is_expirable is true' }],
      });
    }

    const result = await query(
      `INSERT INTO products (product_name, price, stock, is_expirable, expirable_date, last_stocked)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING ${PRODUCT_COLUMNS}`,
      [product_name, price, stock, is_expirable, is_expirable ? expirable_date : null]
    );

    logger.info('Product created', { id: result.rows[0].id, name: product_name, by: req.user.username });
    return res.status(201).json({ success: true, message: 'Product created.', data: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

/** PUT /api/products/:id  (admin) */
export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const { product_name, price, stock, is_expirable, expirable_date } = req.body;

    if (is_expirable === true && !expirable_date) {
      const existingCheck = await query('SELECT expirable_date FROM products WHERE id = $1', [id]);
      if (existingCheck.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Product not found.' });
      }
      if (!existingCheck.rows[0].expirable_date) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: [{ field: 'expirable_date', message: 'expirable_date is required when is_expirable is true' }],
        });
      }
    }

    const existing = await query('SELECT id, is_expirable FROM products WHERE id = $1', [id]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const result = await query(
      `UPDATE products SET
         product_name   = COALESCE($1, product_name),
         price          = COALESCE($2, price),
         stock          = COALESCE($3, stock),
         is_expirable   = COALESCE($4, is_expirable),
         expirable_date = CASE
                            WHEN $4 = TRUE  THEN COALESCE($5, expirable_date)
                            WHEN $4 = FALSE THEN NULL
                            ELSE expirable_date
                          END
       WHERE id = $6
       RETURNING ${PRODUCT_COLUMNS}`,
      [product_name ?? null, price ?? null, stock ?? null, is_expirable ?? null, expirable_date ?? null, id]
    );

    logger.info('Product updated', { id, by: req.user.username });
    return res.json({ success: true, message: 'Product updated.', data: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/products/:id  (admin) */
export async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    logger.info('Product deleted', { id, by: req.user.username });
    return res.json({ success: true, message: 'Product deleted.' });
  } catch (err) {
    return next(err);
  }
}
