import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

/**
 * Verifies JWT from Authorization: Bearer <token>
 * Attaches { id, username, role } to req.user
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    logger.warn('Auth failed: missing token', { path: req.path });
    return res.status(401).json({ success: false, message: 'Authentication required. Please login.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, username: payload.username, role: payload.role };
    return next();
  } catch (err) {
    logger.warn('Auth failed: invalid token', { path: req.path, error: err.message });
    return res.status(401).json({ success: false, message: 'Invalid or expired token. Please login again.' });
  }
}

/**
 * Restricts route to specific roles, e.g. requireRole('admin')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      logger.warn('Forbidden: insufficient role', {
        user: req.user.username,
        role: req.user.role,
        required: roles,
        path: req.path,
      });
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}
