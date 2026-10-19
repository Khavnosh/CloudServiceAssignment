/**
 * Lightweight input validation helpers.
 * Returns a middleware that validates req.body against a schema of checks.
 *
 * Schema format:
 *   {
 *     fieldName: {
 *       required: true,
 *       type: 'string' | 'number' | 'integer' | 'boolean' | 'email' | 'date',
 *       min, max, pattern, patternMessage, enum,
 *       notPast: true,      // date must be today or later (expiry)
 *       mustBePast: true,   // date must be strictly before today (birth)
 *       minAge: 15,         // date must be at least N years ago
 *     }
 *   }
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const USERNAME_RE = /^[a-zA-Z0-9._-]+$/;
const PHONE_RE = /^[0-9+\-() ]+$/;

/** Parse YYYY-MM-DD as a UTC calendar date (avoids TZ off-by-one). */
function parseDateOnly(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return dt;
}

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function isValidDate(value) {
  return parseDateOnly(value) !== null;
}

export function validateBody(schema) {
  return (req, res, next) => {
    const errors = [];
    const body = req.body || {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = body[field];

      if (value === undefined || value === null || value === '') {
        if (rules.required) {
          errors.push({ field, message: `${field} is required` });
        }
        continue;
      }

      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push({ field, message: `${field} must be a string` });
        continue;
      }
      if (rules.type === 'number' && typeof value !== 'number' && !Number.isFinite(Number(value))) {
        errors.push({ field, message: `${field} must be a number` });
        continue;
      }
      if (rules.type === 'integer' && !Number.isInteger(Number(value))) {
        errors.push({ field, message: `${field} must be an integer` });
        continue;
      }
      if (rules.type === 'boolean' && typeof value !== 'boolean') {
        errors.push({ field, message: `${field} must be a boolean` });
        continue;
      }
      if (rules.type === 'email' && !EMAIL_RE.test(String(value))) {
        errors.push({ field, message: `${field} must be a valid email address` });
        continue;
      }
      if (rules.type === 'date') {
        if (!isValidDate(value)) {
          errors.push({ field, message: `${field} must be a valid date (YYYY-MM-DD)` });
          continue;
        }
        const dt = parseDateOnly(value);
        const today = todayUtc();

        if (rules.notPast && dt < today) {
          errors.push({ field, message: `${field} must be today or a future date` });
          continue;
        }
        if (rules.mustBePast && dt >= today) {
          errors.push({ field, message: `${field} must be a date in the past` });
          continue;
        }
        if (rules.minAge !== undefined) {
          const maxBirth = new Date(today);
          maxBirth.setUTCFullYear(maxBirth.getUTCFullYear() - rules.minAge);
          if (dt > maxBirth) {
            errors.push({
              field,
              message: `${field} must be at least ${rules.minAge} years ago`,
            });
            continue;
          }
        }
        if (rules.minDate) {
          const minDt = parseDateOnly(rules.minDate);
          if (minDt && dt < minDt) {
            errors.push({ field, message: `${field} must be on or after ${rules.minDate}` });
            continue;
          }
        }
      }

      // Whitespace-only strings are invalid for text fields
      if ((rules.type === 'string' || rules.type === 'email') && String(value).trim() === '') {
        errors.push({ field, message: `${field} must not be blank` });
        continue;
      }

      if (rules.min !== undefined) {
        const n = typeof value === 'string' ? value.trim().length : Number(value);
        if (n < rules.min) {
          errors.push({ field, message: `${field} must be at least ${rules.min}` });
        }
      }
      if (rules.max !== undefined) {
        const n = typeof value === 'string' ? value.trim().length : Number(value);
        if (n > rules.max) {
          errors.push({ field, message: `${field} must be at most ${rules.max}` });
        }
      }
      if (rules.pattern && !rules.pattern.test(String(value))) {
        errors.push({ field, message: rules.patternMessage || `${field} format is invalid` });
      }
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({ field, message: `${field} must be one of: ${rules.enum.join(', ')}` });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }
    return next();
  };
}

export const PASSWORD_RULES = {
  required: true,
  type: 'string',
  min: 8,
  max: 128,
  pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
  patternMessage: 'Password must contain at least one letter and one number',
};

/** Password rule for optional updates (only checked when present). */
export const OPTIONAL_PASSWORD_RULES = {
  required: false,
  type: 'string',
  min: 8,
  max: 128,
  pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
  patternMessage: 'Password must contain at least one letter and one number',
};

export const USERNAME_RULES = {
  required: true,
  type: 'string',
  min: 3,
  max: 50,
  pattern: USERNAME_RE,
  patternMessage: 'Username may only contain letters, numbers, dots, underscores, and hyphens',
};

export const OPTIONAL_USERNAME_RULES = {
  ...USERNAME_RULES,
  required: false,
};

export const PHONE_RULES = {
  required: true,
  type: 'string',
  min: 5,
  max: 30,
  pattern: PHONE_RE,
  patternMessage: 'Phone number may only contain digits, spaces, +, -, and parentheses',
};

export const OPTIONAL_PHONE_RULES = {
  ...PHONE_RULES,
  required: false,
};

/** Expiry date: valid YYYY-MM-DD, today or later. */
export const EXPIRY_DATE_RULES = {
  required: true,
  type: 'date',
  notPast: true,
};

export const OPTIONAL_EXPIRY_DATE_RULES = {
  required: false,
  type: 'date',
  notPast: true,
};

/** Birth date: valid YYYY-MM-DD, in the past, at least 15 years ago. */
export const BIRTH_DATE_RULES = {
  required: true,
  type: 'date',
  mustBePast: true,
  minAge: 15,
};

export const OPTIONAL_BIRTH_DATE_RULES = {
  required: false,
  type: 'date',
  mustBePast: true,
  minAge: 15,
};

export { isValidDate, parseDateOnly };
