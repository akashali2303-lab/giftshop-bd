import { Router } from 'express';
import { CategoryController } from './category.controller.js';
import { createCategorySchema, updateCategorySchema } from './category.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAdminAuth } from '../../middleware/auth.js';

const router = Router();

// Public routes
router.get('/', CategoryController.listPublic);
router.get('/:slug', CategoryController.getBySlug);

// Admin routes
router.get('/admin/all', requireAdminAuth, CategoryController.listAdmin);
router.post('/admin', requireAdminAuth, validate({ body: createCategorySchema }), CategoryController.create);
router.put('/admin/:id', requireAdminAuth, validate({ body: updateCategorySchema }), CategoryController.update);

export default router;
