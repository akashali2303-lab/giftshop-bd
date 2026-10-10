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
    const storageKey = `art_${timestamp}_${randomHex}${ext}`;
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
