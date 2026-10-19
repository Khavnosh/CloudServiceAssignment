import logger from '../utils/logger.js';

export function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  logger.error('Unhandled error', {
    method: req.method,
    path: req.path,
    message: err.message,
    stack: err.stack,
  });

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'A record with that value already exists.',
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record does not exist.',
    });
  }

  // PostgreSQL check constraint violation
  if (err.code === '23514') {
    const constraint = err.constraint || '';
    let message = 'Data violates a database constraint.';
    if (constraint === 'chk_expirable_date') {
      message = 'Expirable products require an expiration date.';
    } else if (constraint.includes('price')) {
      message = 'Price must be at least 0.';
    } else if (constraint.includes('stock')) {
      message = 'Stock must be at least 0.';
    }
    return res.status(400).json({ success: false, message });
  }

  const status = err.status || 500;
  return res.status(status).json({
    success: false,
    message: status === 500 ? 'Internal server error' : err.message,
  });
}
