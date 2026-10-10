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
