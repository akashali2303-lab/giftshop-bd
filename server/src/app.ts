import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import healthRoutes from './modules/health/health.routes.js';
import uploadRoutes from './modules/uploads/uploads.routes.js';
import categoryRoutes from './modules/categories/category.routes.js';
import productRoutes from './modules/products/product.routes.js';
import orderRoutes from './modules/orders/order.routes.js';
import adminOrderRoutes from './modules/admin/orders/adminOrder.routes.js';
import { NotFoundError } from './utils/errors.js';

const app: Express = express();

app.use(helmet());

// Cross-Origin Resource Sharing configuration supporting Vercel previews & production
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      // Allow localhost, configured CLIENT_URL, ADMIN_URL, and any *.vercel.app domain
      if (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.endsWith('.vercel.app') ||
        origin === env.CLIENT_URL ||
        origin === env.ADMIN_URL
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Allow all for public printing shop API
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

// Public API Endpoints
app.use('/api/health', healthRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/uploads', uploadRoutes);

// Protected Admin Endpoints
app.use('/api/admin/auth', authRoutes);
app.use('/api/admin', adminOrderRoutes);

app.use((req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
});

app.use(errorHandler);

export default app;
