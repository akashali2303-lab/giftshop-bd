import { Router } from 'express';
import { AdminOrderController } from './adminOrder.controller.js';
import { requireAdminAuth } from '../../../middleware/auth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/dashboard/stats', AdminOrderController.getStats);
router.get('/orders', AdminOrderController.listOrders);
router.get('/orders/:id', AdminOrderController.getOrder);
router.patch('/orders/:id/fulfillment', AdminOrderController.updateFulfillment);
router.patch('/orders/:id/payment', AdminOrderController.verifyPayment);

export default router;
