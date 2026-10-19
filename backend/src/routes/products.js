import { Router } from 'express';
import {
  listProducts, getProduct, createProduct, updateProduct, deleteProduct,
} from '../controllers/productController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  validateBody,
  OPTIONAL_EXPIRY_DATE_RULES,
} from '../middleware/validate.js';

const router = Router();

const productSchema = {
  product_name: { required: true, type: 'string', min: 1, max: 200 },
  price: { required: true, type: 'number', min: 0, max: 999999999.99 },
  stock: { required: false, type: 'integer', min: 0, max: 1000000000 },
  is_expirable: { required: false, type: 'boolean' },
  expirable_date: OPTIONAL_EXPIRY_DATE_RULES,
};

const updateSchema = {
  product_name: { required: false, type: 'string', min: 1, max: 200 },
  price: { required: false, type: 'number', min: 0, max: 999999999.99 },
  stock: { required: false, type: 'integer', min: 0, max: 1000000000 },
  is_expirable: { required: false, type: 'boolean' },
  expirable_date: OPTIONAL_EXPIRY_DATE_RULES,
};

router.use(requireAuth);

router.get('/', listProducts);
router.get('/:id', getProduct);
router.post('/', requireRole('admin'), validateBody(productSchema), createProduct);
router.put('/:id', requireRole('admin'), validateBody(updateSchema), updateProduct);
router.delete('/:id', requireRole('admin'), deleteProduct);

export default router;
