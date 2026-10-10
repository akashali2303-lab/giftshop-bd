const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const http = require('http');

console.log('==========================================================');
console.log(' Completing Phase 2: Writing Modules & Generating Clients ');
console.log('==========================================================');

// Helper to write files cleanly
function writeFile(relativePath, content) {
  const fullPath = path.resolve(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log(`[File Written] ${relativePath}`);
}

// 1. Auth Schemas
writeFile('server/src/modules/auth/auth.schemas.ts', `
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});
export type LoginInput = z.infer<typeof loginSchema>;
`);

// 2. Auth Service
writeFile('server/src/modules/auth/auth.service.ts', `
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../../utils/errors.js';
import { LoginInput } from './auth.schemas.js';

export class AuthService {
  static async login(input: LoginInput) {
    const admin = await prisma.adminUser.findUnique({
      where: { email: input.email.toLowerCase() }
    });

    if (!admin || !admin.isActive) throw new UnauthorizedError('Invalid email or password.');

    const isMatch = await bcrypt.compare(input.password, admin.passwordHash);
    if (!isMatch) throw new UnauthorizedError('Invalid email or password.');

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() }
    });

    const token = jwt.sign(
      { adminId: admin.id, email: admin.email, role: admin.role },
      env.SESSION_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role }
    };
  }
}
`);

// 3. Auth Controller
writeFile('server/src/modules/auth/auth.controller.ts', `
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { env } from '../../config/env.js';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);

      res.cookie('admin_token', result.token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async me(req: Request, res: Response): Promise<void> {
    res.status(200).json({ success: true, data: { admin: req.admin } });
  }

  static async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie('admin_token', { httpOnly: true, sameSite: 'lax' });
    res.status(200).json({ success: true, message: 'Successfully logged out' });
  }
}
`);

// 4. Auth Routes
writeFile('server/src/modules/auth/auth.routes.ts', `
import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { loginSchema } from './auth.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAdminAuth } from '../../middleware/auth.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 5,
  message: 'Too many login attempts. Please try again later.'
});

router.post('/login', loginLimiter, validate({ body: loginSchema }), AuthController.login);
router.get('/me', requireAdminAuth, AuthController.me);
router.post('/logout', requireAdminAuth, AuthController.logout);

export default router;
`);

// 5. Health Routes
writeFile('server/src/modules/health/health.routes.ts', `
import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  let dbStatus = 'connected';
  try {
    await prisma.$queryRaw\`SELECT 1\`;
  } catch {
    dbStatus = 'disconnected';
  }

  const isHealthy = dbStatus === 'connected';
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: { database: dbStatus }
  });
});

export default router;
`);

// 6. App Assembly
writeFile('server/src/app.ts', `
import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import healthRoutes from './modules/health/health.routes.js';
import { NotFoundError } from './utils/errors.js';

const app: Express = express();

app.use(helmet());
app.use(cors({ origin: [env.CLIENT_URL, 'http://localhost:5173'], credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.use('/api/health', healthRoutes);
app.use('/api/admin/auth', authRoutes);

app.use((req, _res, next) => {
  next(new NotFoundError(\`Route \${req.method} \${req.originalUrl} not found\`));
});

app.use(errorHandler);

export default app;
`);

// 7. Server Entry Point
writeFile('server/src/index.ts', `
import app from './app.js';
import { env } from './config/env.js';

const PORT = env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(\`[GiftShop BD API] Running on http://localhost:\${PORT}\`);
  });
}

export default app;
`);

// Run commands synchronously
console.log('--- Generating Prisma Client for Server ---');
execSync('npx prisma generate --schema=./prisma/schema.prisma', { stdio: 'inherit' });

// Ensure server/node_modules has the initialized client as well
if (fs.existsSync('server/node_modules')) {
  execSync('npx prisma generate --schema=../prisma/schema.prisma', { cwd: 'server', stdio: 'inherit' });
}

console.log('--- Compiling Server TypeScript ---');
execSync('npm --prefix server run build', { stdio: 'inherit' });

console.log('==========================================================');
console.log(' Executing Phase 2 Integration Tests                      ');
console.log('==========================================================');

async function runTests() {
  const { default: app } = await import('./server/dist/app.js');
  const server = http.createServer(app);

  server.listen(5099, async () => {
    const base = 'http://localhost:5099/api';

    async function req(url, options = {}) {
      const res = await fetch(base + url, options);
      const body = await res.json();
      return { status: res.status, body };
    }

    try {
      // Test 1: Health with DB
      const h = await req('/health');
      if (h.status !== 200 || h.body.status !== 'healthy') throw new Error('Health check failed: ' + JSON.stringify(h.body));
      console.log('  [PASS] GET /api/health -> Database connected & responsive');

      // Test 2: Invalid Login
      const bad = await req('/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@giftshop.com.bd', password: 'WrongPassword999!' })
      });
      if (bad.status !== 401) throw new Error('Bad login was not rejected');
      console.log('  [PASS] POST /api/admin/auth/login (bad password) -> 401 UNAUTHORIZED');

      // Test 3: Valid Login
      const good = await req('/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@giftshop.com.bd', password: 'AdminPass123!' })
      });
      if (good.status !== 200 || !good.body.data || !good.body.data.token) {
        throw new Error('Valid login failed: ' + JSON.stringify(good.body));
      }
      const token = good.body.data.token;
      console.log('  [PASS] POST /api/admin/auth/login (valid password) -> 200 OK + JWT issued');

      // Test 4: Protected route with JWT
      const me = await req('/admin/auth/me', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (me.status !== 200 || me.body.data.admin.role !== 'SUPER_ADMIN') {
        throw new Error('Protected route rejected valid token');
      }
      console.log('  [PASS] GET /api/admin/auth/me (with Bearer token) -> 200 OK (SUPER_ADMIN)');

      // Test 5: Protected route without JWT
      const noTok = await req('/admin/auth/me');
      if (noTok.status !== 401) throw new Error('Unprotected access was not blocked');
      console.log('  [PASS] GET /api/admin/auth/me (without token) -> 401 UNAUTHORIZED');

      console.log('==========================================================');
      console.log(' ALL PHASE 2 TESTS PASSED SUCCESSFULLY!                  ');
      console.log('==========================================================');
      server.close();
      process.exit(0);
    } catch (err) {
      console.error('Test Suite Failed:', err.message);
      server.close();
      process.exit(1);
    }
  });
}

runTests();
