#!/usr/bin/env bash
set -e

# Ensure we are in giftshop-bd directory
if [ -d "giftshop-bd" ]; then
  cd giftshop-bd
fi

echo "=========================================================="
echo " Starting Phase 2: Backend Foundation & Authentication"
echo "=========================================================="

# 1. Update server/package.json to add jsonwebtoken and cookie-parser
cat << 'EOF' > server/package.json
{
  "name": "giftshop-bd-server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.10.2",
    "bcryptjs": "^2.4.3",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.18.3",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cookie-parser": "^1.4.7",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.11.24",
    "tsx": "^4.7.1",
    "typescript": "^5.3.3"
  }
}
EOF

# 2. Server tsconfig
cat << 'EOF' > server/tsconfig.json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
EOF

# 3. Environment validation
cat << 'EOF' > server/src/config/env.ts
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
  APP_URL: z.string().url().default('http://localhost:5000'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters long'),
  ADMIN_DEFAULT_EMAIL: z.string().email(),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  LOCAL_STORAGE_PATH: z.string().default('./storage/uploads'),
  MAX_FILE_SIZE_BYTES: z.string().transform((v) => parseInt(v, 10)).default('20971520'),
  WHATSAPP_SUPPORT_NUMBER: z.string().default('8801700000000')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
EOF

# 4. Prisma singleton
cat << 'EOF' > server/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
EOF

# 5. Error utility classes
cat << 'EOF' > server/src/utils/errors.ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Invalid request data', details?: unknown) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Requested resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation error', details?: unknown) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}
EOF

# 6. Centralized Error Handler Middleware
cat << 'EOF' > server/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Handled Operational Errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
    return;
  }

  // 2. Direct Zod Schema Validation Errors
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request payload failed schema validation',
        details: err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message
        }))
      }
    });
    return;
  }

  // 3. Unhandled Internal Server Errors
  console.error('[Unhandled Error]', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred'
    }
  });
}
EOF

# 7. Zod Request Validator Middleware
cat << 'EOF' > server/src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../utils/errors.js';

interface RequestValidationSchema {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export function validate(schema: RequestValidationSchema) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = (await schema.query.parseAsync(req.query)) as Request['query'];
      }
      if (schema.params) {
        req.params = (await schema.params.parseAsync(req.params)) as Request['params'];
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message
        }));
        next(new ValidationError('Invalid request input data', formatted));
      } else {
        next(error);
      }
    }
  };
}
EOF

# 8. Rate Limiter Middleware
cat << 'EOF' > server/src/middleware/rateLimiter.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';

interface RateLimitRecord {
  attempts: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function createRateLimiter(options: {
  windowMs: number;
  maxAttempts: number;
  message?: string;
}) {
  const { windowMs, maxAttempts, message = 'Too many requests. Please try again later.' } = options;

  return (req: Request, _res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const clientRecord = rateLimitStore.get(ip);

    if (!clientRecord || now > clientRecord.resetAt) {
      rateLimitStore.set(ip, {
        attempts: 1,
        resetAt: now + windowMs
      });
      return next();
    }

    if (clientRecord.attempts >= maxAttempts) {
      const waitSeconds = Math.ceil((clientRecord.resetAt - now) / 1000);
      return next(
        new AppError(
          `${message} Wait ${waitSeconds} seconds.`,
          429,
          'TOO_MANY_REQUESTS'
        )
      );
    }

    clientRecord.attempts += 1;
    next();
  };
}
EOF

# 9. Auth Middleware & Token Types
cat << 'EOF' > server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

export interface AdminTokenPayload {
  adminId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        email: string;
        name: string;
        role: string;
      };
    }
  }
}

export async function requireAdminAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;

    // Check cookies first, fallback to Authorization header
    if (req.cookies && req.cookies.admin_token) {
      token = req.cookies.admin_token;
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required. No session found.');
    }

    let payload: AdminTokenPayload;
    try {
      payload = jwt.verify(token, env.SESSION_SECRET) as AdminTokenPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired authentication session.');
    }

    // Verify admin exists and is active in database
    const admin = await prisma.adminUser.findUnique({
      where: { id: payload.adminId },
      select: { id: true, email: true, name: true, role: true, isActive: true }
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedError('Admin account not found or deactivated.');
    }

    req.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdminRole(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.admin) {
      return next(new UnauthorizedError());
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return next(new ForbiddenError('You do not have permission to access this resource.'));
    }

    next();
  };
}
EOF

# 10. Auth Validation Schemas
cat << 'EOF' > server/src/modules/auth/auth.schemas.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Please provide a valid email address')
    .max(100, 'Email must not exceed 100 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
});

export type LoginInput = z.infer<typeof loginSchema>;
EOF

# 11. Auth Service
cat << 'EOF' > server/src/modules/auth/auth.service.ts
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

    if (!admin || !admin.isActive) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const isValidPassword = await bcrypt.compare(input.password, admin.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // Update lastLogin timestamp
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate signed JWT
    const token = jwt.sign(
      {
        adminId: admin.id,
        email: admin.email,
        role: admin.role
      },
      env.SESSION_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    };
  }
}
EOF

# 12. Auth Controller
cat << 'EOF' > server/src/modules/auth/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { env } from '../../config/env.js';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);

      // Attach HTTP-only secure cookie
      res.cookie('admin_token', result.token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        data: {
          admin: result.admin,
          token: result.token
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async me(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      data: {
        admin: req.admin
      }
    });
  }

  static async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie('admin_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production'
    });

    res.status(200).json({
      success: true,
      message: 'Successfully logged out'
    });
  }
}
EOF

# 13. Auth Routes
cat << 'EOF' > server/src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { loginSchema } from './auth.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAdminAuth } from '../../middleware/auth.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

// Strict login rate limiter: 5 attempts per 15 minutes per IP
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 5,
  message: 'Too many login attempts.'
});

router.post('/login', loginLimiter, validate({ body: loginSchema }), AuthController.login);
router.get('/me', requireAdminAuth, AuthController.me);
router.post('/logout', requireAdminAuth, AuthController.logout);

export default router;
EOF

# 14. Health Routes with Database Check
cat << 'EOF' > server/src/modules/health/health.routes.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  let dbStatus = 'connected';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbStatus = 'disconnected';
  }

  const isHealthy = dbStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus
    }
  });
});

export default router;
EOF

# 15. Express Application Assembly
cat << 'EOF' > server/src/app.ts
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

// Security Headers
app.use(helmet());

// CORS config
app.use(
  cors({
    origin: [env.CLIENT_URL, 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);

// Body Parsing & Cookie Support
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Root Health Endpoint
app.use('/api/health', healthRoutes);

// Admin Authentication Endpoints
app.use('/api/admin/auth', authRoutes);

// Catch-all 404 handler for undefined API routes
app.use((req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
});

// Centralized Error Handling
app.use(errorHandler);

export default app;
EOF

# 16. Server Entry Point
cat << 'EOF' > server/src/index.ts
import app from './app.js';
import { env } from './config/env.js';

const PORT = env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[GiftShop BD API] Server operational at http://localhost:${PORT}`);
    console.log(`[GiftShop BD API] Environment: ${env.NODE_ENV}`);
  });
}

export default app;
EOF

echo "--- Installing Server Dependencies (jsonwebtoken, cookie-parser) ---"
npm --prefix server install

echo "--- Building Server TypeScript to verify zero type errors ---"
npm --prefix server run build

echo "=========================================================="
echo " Phase 2 Architecture Ready. Running Automated Test Suite."
echo "=========================================================="

node --input-type=module -e "
import app from './server/dist/app.js';
import http from 'http';

const server = http.createServer(app);
server.listen(5099, async () => {
  const base = 'http://localhost:5099/api';
  console.log('[Test Suite] Server initialized on port 5099');

  async function req(url, options = {}) {
    const res = await fetch(base + url, options);
    const body = await res.json();
    return { status: res.status, headers: res.headers, body };
  }

  try {
    // Test 1: Health with DB Ping
    console.log('-> Testing GET /health');
    const h = await req('/health');
    if (h.status !== 200 || h.body.status !== 'healthy') throw new Error('Health check failed: ' + JSON.stringify(h.body));
    console.log('   [PASS] Health check reported healthy with database connected.');

    // Test 2: Invalid Login Attempt
    console.log('-> Testing POST /admin/auth/login (Invalid Password)');
    const badLogin = await req('/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@giftshop.com.bd', password: 'WrongPassword999!' })
    });
    if (badLogin.status !== 401 || badLogin.body.error.code !== 'UNAUTHORIZED') {
      throw new Error('Invalid login check failed: ' + JSON.stringify(badLogin.body));
    }
    console.log('   [PASS] Rejected invalid credentials with 401 UNAUTHORIZED.');

    // Test 3: Valid Login Attempt
    console.log('-> Testing POST /admin/auth/login (Valid Credentials)');
    const goodLogin = await req('/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@giftshop.com.bd', password: 'AdminPass123!' })
    });
    if (goodLogin.status !== 200 || !goodLogin.body.data.token) {
      throw new Error('Valid login failed: ' + JSON.stringify(goodLogin.body));
    }
    const token = goodLogin.body.data.token;
    console.log('   [PASS] Authentication succeeded. JWT token issued.');

    // Test 4: Protected GET /admin/auth/me with Bearer token
    console.log('-> Testing GET /admin/auth/me with Valid Token');
    const meRes = await req('/admin/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (meRes.status !== 200 || meRes.body.data.admin.email !== 'admin@giftshop.com.bd') {
      throw new Error('Me check failed: ' + JSON.stringify(meRes.body));
    }
    console.log('   [PASS] Protected route access granted. Admin role: ' + meRes.body.data.admin.role);

    // Test 5: Protected GET /admin/auth/me without token
    console.log('-> Testing GET /admin/auth/me without Token');
    const noToken = await req('/admin/auth/me');
    if (noToken.status !== 401) {
      throw new Error('Unauthenticated access was not blocked!');
    }
    console.log('   [PASS] Blocked request without token (401).');

    // Test 6: POST /admin/auth/logout
    console.log('-> Testing POST /admin/auth/logout');
    const logoutRes = await req('/admin/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (logoutRes.status !== 200) {
      throw new Error('Logout failed: ' + JSON.stringify(logoutRes.body));
    }
    console.log('   [PASS] Logout endpoint responded with 200.');

    console.log('==========================================================');
    console.log(' ALL PHASE 2 TESTS PASSED SUCCESSFULLY!');
    console.log('==========================================================');
  } catch (err) {
    console.error('Test Suite Failed:', err.message);
    process.exit(1);
  } finally {
    server.close();
  }
});
"

echo "Phase 2 Setup and Verification Complete!"
