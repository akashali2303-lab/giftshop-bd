import { Router } from 'express';
import { ProductController } from './product.controller.js';
import { createProductSchema, updateProductSchema, productQuerySchema } from './product.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAdminAuth } from '../../middleware/auth.js';

const router = Router();

// Public routes
router.get('/', validate({ query: productQuerySchema }), ProductController.listPublic);
router.get('/detail/:slug', ProductController.getBySlug);

// Admin routes
router.get('/admin/all', requireAdminAuth, validate({ query: productQuerySchema }), ProductController.listAdmin);
router.get('/admin/:id', requireAdminAuth, ProductController.getById);
router.post('/admin', requireAdminAuth, validate({ body: createProductSchema }), ProductController.create);
router.put('/admin/:id', requireAdminAuth, validate({ body: updateProductSchema }), ProductController.update);
router.delete('/admin/:id', requireAdminAuth, ProductController.delete);

export default router;
