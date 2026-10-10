const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('==========================================================');
console.log(' Preparing Vercel & Render Production Configuration       ');
console.log('==========================================================');

function writeFile(relativePath, content) {
  const fullPath = path.resolve(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log(`[File Written] ${relativePath}`);
}

// 1. client/vercel.json (SPA routing)
writeFile('client/vercel.json', `
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
`);

// 2. admin/vercel.json (SPA routing)
writeFile('admin/vercel.json', `
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
`);

// 3. Update client/src/services/api.ts to use VITE_API_BASE_URL
writeFile('client/src/services/api.ts', `
import { Category, Product } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(\`\${API_BASE}/api/categories\`);
  const json = await res.json();
  return json.success ? json.data : [];
}

export async function fetchProducts(params: { category?: string; search?: string } = {}): Promise<Product[]> {
  const query = new URLSearchParams();
  if (params.category) query.append('category', params.category);
  if (params.search) query.append('search', params.search);

  const res = await fetch(\`\${API_BASE}/api/products?\` + query.toString());
  const json = await res.json();
  return json.success && json.data.items ? json.data.items : [];
}

export async function uploadArtworkFile(file: File): Promise<{ storageKey: string; originalFilename: string }> {
  const formData = new FormData();
  formData.append('artwork', file);

  const res = await fetch(\`\${API_BASE}/api/uploads/artwork\`, {
    method: 'POST',
    body: formData
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Failed to upload artwork');
  }

  return json.data;
}
`);

// 4. Update client/src/components/CheckoutModal.tsx to use API_BASE
let checkoutModal = fs.readFileSync('client/src/components/CheckoutModal.tsx', 'utf8');
if (!checkoutModal.includes('API_BASE')) {
  checkoutModal = `const API_BASE = import.meta.env.VITE_API_BASE_URL || '';\n` + checkoutModal;
  checkoutModal = checkoutModal.replace("fetch('/api/orders/checkout'", "fetch(`${API_BASE}/api/orders/checkout'");
  fs.writeFileSync('client/src/components/CheckoutModal.tsx', checkoutModal, 'utf8');
  console.log('[Updated] client/src/components/CheckoutModal.tsx with API_BASE');
}

// 5. Update client/src/components/OrderTrackModal.tsx to use API_BASE
let trackModal = fs.readFileSync('client/src/components/OrderTrackModal.tsx', 'utf8');
if (!trackModal.includes('API_BASE')) {
  trackModal = `const API_BASE = import.meta.env.VITE_API_BASE_URL || '';\n` + trackModal;
  trackModal = trackModal.replace("fetch(`/api/orders/track/", "fetch(`${API_BASE}/api/orders/track/");
  fs.writeFileSync('client/src/components/OrderTrackModal.tsx', trackModal, 'utf8');
  console.log('[Updated] client/src/components/OrderTrackModal.tsx with API_BASE');
}

// 6. Update admin/src/App.tsx to use API_BASE
let adminApp = fs.readFileSync('admin/src/App.tsx', 'utf8');
if (!adminApp.includes('API_BASE')) {
  adminApp = `const API_BASE = import.meta.env.VITE_API_BASE_URL || '';\n` + adminApp;
  adminApp = adminApp.replace("fetch('/api/admin/auth/login'", "fetch(`${API_BASE}/api/admin/auth/login'");
  adminApp = adminApp.replace("fetch('/api/admin/dashboard/stats'", "fetch(`${API_BASE}/api/admin/dashboard/stats'");
  adminApp = adminApp.replace("fetch('/api/admin/orders?'", "fetch(`${API_BASE}/api/admin/orders?'");
  fs.writeFileSync('admin/src/App.tsx', adminApp, 'utf8');
  console.log('[Updated] admin/src/App.tsx with API_BASE');
}

// 7. Update admin/src/components/AdminOrderDetailModal.tsx to use API_BASE
let adminModal = fs.readFileSync('admin/src/components/AdminOrderDetailModal.tsx', 'utf8');
if (!adminModal.includes('API_BASE')) {
  adminModal = `const API_BASE = import.meta.env.VITE_API_BASE_URL || '';\n` + adminModal;
  adminModal = adminModal.replace("fetch(`/api/admin/orders/${order.id}/fulfillment`", "fetch(`${API_BASE}/api/admin/orders/${order.id}/fulfillment`");
  adminModal = adminModal.replace("fetch(`/api/admin/orders/${order.id}/payment`", "fetch(`${API_BASE}/api/admin/orders/${order.id}/payment`");
  adminModal = adminModal.replace("window.open(`/api/uploads/artwork/${storageKey}`", "window.open(`${API_BASE}/api/uploads/artwork/${storageKey}`");
  fs.writeFileSync('admin/src/components/AdminOrderDetailModal.tsx', adminModal, 'utf8');
  console.log('[Updated] admin/src/components/AdminOrderDetailModal.tsx with API_BASE');
}

// 8. Update server/src/config/env.ts to allow optional ADMIN_URL
writeFile('server/src/config/env.ts', `
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((v) => parseInt(v, 10)).default('5000'),
  APP_URL: z.string().default('http://localhost:5000'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  ADMIN_URL: z.string().optional().default('http://localhost:5174'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  ADMIN_DEFAULT_EMAIL: z.string().email(),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  LOCAL_STORAGE_PATH: z.string().default('./storage/uploads'),
  MAX_FILE_SIZE_BYTES: z.string().transform((v) => parseInt(v, 10)).default('20971520'),
  WHATSAPP_SUPPORT_NUMBER: z.string().default('8801700000000')
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}
export const env = parsed.data;
`);

// 9. Update server/src/app.ts to permit Vercel and dynamic origins in CORS
writeFile('server/src/app.ts', `
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
  next(new NotFoundError(\`Route \${req.method} \${req.originalUrl} not found\`));
});

app.use(errorHandler);

export default app;
`);

// 10. Render Blueprint (render.yaml)
writeFile('render.yaml', `
services:
  - type: web
    name: giftshop-bd-api
    runtime: node
    plan: free
    buildCommand: npm install && npx prisma generate && npx prisma db push && npm run db:seed && npm --prefix server run build
    startCommand: node server/dist/index.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        value: file:./dev.db
      - key: SESSION_SECRET
        generateValue: true
      - key: ADMIN_DEFAULT_EMAIL
        value: admin@giftshop.com.bd
      - key: ADMIN_DEFAULT_PASSWORD
        value: AdminPass123!
      - key: LOCAL_STORAGE_PATH
        value: ./storage/uploads
`);

console.log('--- Verifying Production Builds for All Three Applications ---');
execSync('npm --prefix server run build', { stdio: 'inherit' });
execSync('npm --prefix client run build', { stdio: 'inherit' });
execSync('npm --prefix admin run build', { stdio: 'inherit' });

console.log('==========================================================');
console.log(' SUCCESS: Ready for Git Push, Vercel & Render Deployment! ');
console.log('==========================================================');
