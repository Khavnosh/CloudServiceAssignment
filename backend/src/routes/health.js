import { Router } from 'express';
import { healthCheck } from '../config/db.js';

const router = Router();

/** GET /api/health — liveness + readiness */
router.get('/', async (req, res) => {
  const dbOk = await healthCheck();
  const status = dbOk ? 'healthy' : 'degraded';
  const httpCode = dbOk ? 200 : 503;

  return res.status(httpCode).json({
    success: dbOk,
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      api: { status: 'up', version: '1.0.0' },
      database: { status: dbOk ? 'up' : 'down' },
    },
  });
});

export default router;
