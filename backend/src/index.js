import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import logger from './utils/logger.js';
import { healthCheck } from './config/db.js';
import { seedAdmin } from './controllers/authController.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import stockRoutes from './routes/stock.js';
import employeeRoutes from './routes/employees.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Security & parsing ----------
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ---------- HTTP request logging (stdout → Docker logs) ----------
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  })
);

// ---------- Rate limiting ----------
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});
app.use('/api/auth/login', authLimiter);

// ---------- Routes ----------
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/employees', employeeRoutes);

// Root info
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'Inventory Management API',
    version: '1.0.0',
    docs: '/api/health',
  });
});

// ---------- Error handling ----------
app.use(notFound);
app.use(errorHandler);

// ---------- Bootstrap ----------
async function waitForDatabase(retries = 30) {
  for (let i = 1; i <= retries; i++) {
    const ok = await healthCheck();
    if (ok) {
      logger.info('Database connection established');
      return true;
    }
    logger.warn(`Database not ready, retry ${i}/${retries}...`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Could not connect to database after multiple retries');
}

async function start() {
  try {
    await waitForDatabase();
    await seedAdmin();

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`API server listening on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

start();
