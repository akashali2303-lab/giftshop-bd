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
