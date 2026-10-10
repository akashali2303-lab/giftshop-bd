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
    cb(new BadRequestError(`Unsupported file format (${file.mimetype}). Only JPG, PNG, and PDF files are allowed.`));
  }
};

export const uploadArtwork = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES
  },
  fileFilter
}).single('artwork');
