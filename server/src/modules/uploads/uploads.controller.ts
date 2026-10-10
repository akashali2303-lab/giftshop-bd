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
      res.setHeader('Content-Disposition', `inline; filename="${storageKey}"`);
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
}
