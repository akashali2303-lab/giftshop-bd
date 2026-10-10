const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('==========================================================');
console.log(' Applying Phase 3 Fixes & Compiling TypeScript           ');
console.log('==========================================================');

function writeFile(relativePath, content) {
  const fullPath = path.resolve(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log(`[File Written] ${relativePath}`);
}

// 1. Updated errors.ts with BadRequestError included
writeFile('server/src/utils/errors.ts', `
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
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
`);

// 2. Storage interface
writeFile('server/src/services/storage/storage.interface.ts', `
import { Readable } from 'stream';

export interface StoredFileMeta {
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface IStorageProvider {
  saveFile(buffer: Buffer, originalFilename: string, mimeType: string): Promise<StoredFileMeta>;
  getFileStream(storageKey: string): Promise<{ stream: Readable; mimeType: string; sizeBytes: number }>;
  deleteFile(storageKey: string): Promise<void>;
  fileExists(storageKey: string): Promise<boolean>;
}
`);

// 3. Local storage provider
writeFile('server/src/services/storage/localStorageProvider.ts', `
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import { IStorageProvider, StoredFileMeta } from './storage.interface.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';

export class LocalStorageProvider implements IStorageProvider {
  private baseDir: string;

  constructor(storagePath: string) {
    this.baseDir = path.resolve(process.cwd(), storagePath);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private sanitizeKey(storageKey: string): string {
    const sanitized = path.basename(storageKey);
    if (sanitized !== storageKey || storageKey.includes('..')) {
      throw new BadRequestError('Invalid file key');
    }
    return sanitized;
  }

  async saveFile(buffer: Buffer, originalFilename: string, mimeType: string): Promise<StoredFileMeta> {
    const ext = path.extname(originalFilename).toLowerCase() || '.bin';
    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(8).toString('hex');
    const storageKey = \`art_\${timestamp}_\${randomHex}\${ext}\`;
    const targetPath = path.join(this.baseDir, storageKey);

    await fs.promises.writeFile(targetPath, buffer);

    return {
      storageKey,
      originalFilename: path.basename(originalFilename),
      mimeType,
      sizeBytes: buffer.length
    };
  }

  async getFileStream(storageKey: string): Promise<{ stream: Readable; mimeType: string; sizeBytes: number }> {
    const safeKey = this.sanitizeKey(storageKey);
    const targetPath = path.join(this.baseDir, safeKey);

    if (!fs.existsSync(targetPath)) {
      throw new NotFoundError('Artwork file not found');
    }

    const stat = await fs.promises.stat(targetPath);
    const stream = fs.createReadStream(targetPath);

    const ext = path.extname(safeKey).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.pdf') mimeType = 'application/pdf';

    return { stream, mimeType, sizeBytes: stat.size };
  }

  async deleteFile(storageKey: string): Promise<void> {
    const safeKey = this.sanitizeKey(storageKey);
    const targetPath = path.join(this.baseDir, safeKey);
    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath);
    }
  }

  async fileExists(storageKey: string): Promise<boolean> {
    const safeKey = this.sanitizeKey(storageKey);
    const targetPath = path.join(this.baseDir, safeKey);
    return fs.existsSync(targetPath);
  }
}
`);

// 4. Storage export
writeFile('server/src/services/storage/index.ts', `
import { env } from '../../config/env.js';
import { IStorageProvider } from './storage.interface.js';
import { LocalStorageProvider } from './localStorageProvider.js';

export const storageProvider: IStorageProvider = new LocalStorageProvider(env.LOCAL_STORAGE_PATH);
`);

// 5. Upload middleware
writeFile('server/src/middleware/upload.ts', `
import multer from 'multer';
import { Request } from 'express';
import { BadRequestError } from '../utils/errors.js';
import { env } from '../config/env.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestError(\`Unsupported file format (\${file.mimetype}). Only JPG, PNG, and PDF files are allowed.\`));
  }
};

export const uploadArtwork = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES
  },
  fileFilter
}).single('artwork');
`);

// 6. Uploads controller
writeFile('server/src/modules/uploads/uploads.controller.ts', `
import { Request, Response, NextFunction } from 'express';
import { storageProvider } from '../../services/storage/index.js';
import { BadRequestError } from '../../utils/errors.js';

export class UploadsController {
  static async uploadArtwork(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new BadRequestError('No artwork file provided. Please attach a file.');
      }

      const stored = await storageProvider.saveFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      res.status(201).json({
        success: true,
        message: 'Artwork uploaded successfully',
        data: {
          storageKey: stored.storageKey,
          originalFilename: stored.originalFilename,
          mimeType: stored.mimeType,
          fileSizeBytes: stored.sizeBytes
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async downloadArtwork(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { storageKey } = req.params;
      const { stream, mimeType, sizeBytes } = await storageProvider.getFileStream(storageKey);

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', sizeBytes);
      res.setHeader('Content-Disposition', \`inline; filename="\${storageKey}"\`);
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
}
`);

// 7. Uploads routes
writeFile('server/src/modules/uploads/uploads.routes.ts', `
import { Router } from 'express';
import { UploadsController } from './uploads.controller.js';
import { uploadArtwork } from '../../middleware/upload.js';
import { requireAdminAuth } from '../../middleware/auth.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

const uploadLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxAttempts: 30,
  message: 'Upload rate limit reached. Please wait a few minutes.'
});

router.post('/artwork', uploadLimiter, uploadArtwork, UploadsController.uploadArtwork);
router.get('/artwork/:storageKey', requireAdminAuth, UploadsController.downloadArtwork);

export default router;
`);

// 8. Express app
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
import { NotFoundError } from './utils/errors.js';

const app: Express = express();

app.use(helmet());
app.use(cors({ origin: [env.CLIENT_URL, 'http://localhost:5173'], credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.use('/api/health', healthRoutes);
app.use('/api/admin/auth', authRoutes);
app.use('/api/uploads', uploadRoutes);

app.use((req, _res, next) => {
  next(new NotFoundError(\`Route \${req.method} \${req.originalUrl} not found\`));
});

app.use(errorHandler);

export default app;
`);

console.log('--- Compiling Server TypeScript ---');
execSync('npm --prefix server run build', { stdio: 'inherit' });

console.log('==========================================================');
console.log(' SUCCESS: Phase 3 compiled cleanly with zero errors!     ');
console.log('==========================================================');
