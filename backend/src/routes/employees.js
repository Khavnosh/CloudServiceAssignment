import { Router } from 'express';
import {
  listEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee,
} from '../controllers/employeeController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  validateBody,
  PASSWORD_RULES,
  OPTIONAL_PASSWORD_RULES,
  USERNAME_RULES,
  OPTIONAL_USERNAME_RULES,
  PHONE_RULES,
  OPTIONAL_PHONE_RULES,
  BIRTH_DATE_RULES,
  OPTIONAL_BIRTH_DATE_RULES,
} from '../middleware/validate.js';

const router = Router();

const createSchema = {
  first_name: { required: true, type: 'string', min: 1, max: 100 },
  last_name: { required: true, type: 'string', min: 1, max: 100 },
  birth_date: BIRTH_DATE_RULES,
  home_address: { required: true, type: 'string', min: 1, max: 500 },
  phone_number: PHONE_RULES,
  email: { required: true, type: 'email', max: 255 },
  username: USERNAME_RULES,
  password: PASSWORD_RULES,
  role: { required: false, type: 'string', enum: ['admin', 'employee'] },
  status: { required: false, type: 'string', enum: ['active', 'inactive'] },
};

const updateSchema = {
  first_name: { required: false, type: 'string', min: 1, max: 100 },
  last_name: { required: false, type: 'string', min: 1, max: 100 },
  birth_date: OPTIONAL_BIRTH_DATE_RULES,
  home_address: { required: false, type: 'string', min: 1, max: 500 },
  phone_number: OPTIONAL_PHONE_RULES,
  email: { required: false, type: 'email', max: 255 },
  username: OPTIONAL_USERNAME_RULES,
  password: OPTIONAL_PASSWORD_RULES,
  role: { required: false, type: 'string', enum: ['admin', 'employee'] },
  status: { required: false, type: 'string', enum: ['active', 'inactive'] },
};

// All employee routes require admin
router.use(requireAuth, requireRole('admin'));

router.get('/', listEmployees);
router.get('/:id', getEmployee);
router.post('/', validateBody(createSchema), createEmployee);
router.put('/:id', validateBody(updateSchema), updateEmployee);
router.delete('/:id', deleteEmployee);

export default router;
