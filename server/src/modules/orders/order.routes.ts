import { Router } from 'express';
import { OrderController } from './order.controller.js';
import { checkoutSchema } from './order.schemas.js';
import { validate } from '../../middleware/validate.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

// Checkout limiter: max 15 checkout attempts per 15 minutes per IP
const checkoutLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 15,
  message: 'Too many order requests. Please wait a few minutes.'
});

router.post('/checkout', checkoutLimiter, validate({ body: checkoutSchema }), OrderController.checkout);
router.get('/track/:orderNumber', OrderController.track);

export default router;
