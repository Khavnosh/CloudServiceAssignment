import { Router } from 'express';
import { checkIn, checkOut, history } from '../controllers/stockController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, OPTIONAL_EXPIRY_DATE_RULES } from '../middleware/validate.js';

const router = Router();

router.use(requireAuth);

router.post(
  '/check-in',
  validateBody({
    product_id: { required: true, type: 'integer', min: 1 },
    quantity: { required: true, type: 'integer', min: 1, max: 1000000000 },
    expirable_date: OPTIONAL_EXPIRY_DATE_RULES,
    notes: { required: false, type: 'string', max: 500 },
  }),
  checkIn
);

router.post(
  '/check-out',
  validateBody({
    product_id: { required: true, type: 'integer', min: 1 },
    quantity: { required: true, type: 'integer', min: 1, max: 1000000000 },
    notes: { required: false, type: 'string', max: 500 },
  }),
  checkOut
);

router.get('/history', history);

export default router;
