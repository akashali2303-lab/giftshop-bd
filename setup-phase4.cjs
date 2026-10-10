const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('==========================================================');
console.log(' Starting Phase 4: Product & Category Modules Setup      ');
console.log('==========================================================');

function writeFile(relativePath, content) {
  const fullPath = path.resolve(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log(`[File Written] ${relativePath}`);
}

// 1. Category Schemas
writeFile('server/src/modules/categories/category.schemas.ts', `
import { z } from 'zod';

export const createCategorySchema = z.object({
  nameEn: z.string().trim().min(2, 'English name is required'),
  nameBn: z.string().trim().min(2, 'Bengali name is required'),
  slug: z.string().trim().min(2).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().optional(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true)
});

export const updateCategorySchema = createCategorySchema.partial();
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
`);

// 2. Category Service
writeFile('server/src/modules/categories/category.service.ts', `
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { CreateCategoryInput, UpdateCategoryInput } from './category.schemas.js';

export class CategoryService {
  static async getActiveCategories() {
    return prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { products: { where: { isActive: true } } }
        }
      }
    });
  }

  static async getAllCategories() {
    return prisma.category.findMany({
      orderBy: { displayOrder: 'asc' }
    });
  }

  static async getBySlug(slug: string) {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!category) throw new NotFoundError('Category not found');
    return category;
  }

  static async create(input: CreateCategoryInput) {
    const existing = await prisma.category.findUnique({ where: { slug: input.slug } });
    if (existing) throw new BadRequestError('A category with this slug already exists');

    return prisma.category.create({ data: input });
  }

  static async update(id: string, input: UpdateCategoryInput) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundError('Category not found');

    if (input.slug && input.slug !== category.slug) {
      const existing = await prisma.category.findUnique({ where: { slug: input.slug } });
      if (existing) throw new BadRequestError('Slug is already in use by another category');
    }

    return prisma.category.update({ where: { id }, data: input });
  }
}
`);

// 3. Category Controller
writeFile('server/src/modules/categories/category.controller.ts', `
import { Request, Response, NextFunction } from 'express';
import { CategoryService } from './category.service.js';

export class CategoryController {
  static async listPublic(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await CategoryService.getActiveCategories();
      res.status(200).json({ success: true, data: categories });
    } catch (err) { next(err); }
  }

  static async listAdmin(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await CategoryService.getAllCategories();
      res.status(200).json({ success: true, data: categories });
    } catch (err) { next(err); }
  }

  static async getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await CategoryService.getBySlug(req.params.slug);
      res.status(200).json({ success: true, data: category });
    } catch (err) { next(err); }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const created = await CategoryService.create(req.body);
      res.status(201).json({ success: true, message: 'Category created', data: created });
    } catch (err) { next(err); }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await CategoryService.update(req.params.id, req.body);
      res.status(200).json({ success: true, message: 'Category updated', data: updated });
    } catch (err) { next(err); }
  }
}
`);

// 4. Category Routes
writeFile('server/src/modules/categories/category.routes.ts', `
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
`);

// 5. Product Schemas
writeFile('server/src/modules/products/product.schemas.ts', `
import { z } from 'zod';

export const createProductSchema = z.object({
  categoryId: z.string().uuid('Valid category ID is required'),
  nameEn: z.string().trim().min(2, 'English name is required'),
  nameBn: z.string().trim().min(2, 'Bengali name is required'),
  slug: z.string().trim().min(2).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  descriptionEn: z.string().optional(),
  descriptionBn: z.string().optional(),
  basePricePaisa: z.number().int().min(0, 'Price in paisa must be a non-negative integer'),
  featuredImage: z.string().min(1, 'Featured image is required'),
  galleryImages: z.string().optional(),
  requiresCustomText: z.boolean().default(false),
  requiresArtworkUpload: z.boolean().default(false),
  customizationPromptEn: z.string().optional(),
  customizationPromptBn: z.string().optional(),
  isActive: z.boolean().default(true)
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional().default('1').transform((v) => Math.max(1, parseInt(v, 10) || 1)),
  limit: z.string().optional().default('12').transform((v) => Math.min(50, Math.max(1, parseInt(v, 10) || 12)))
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
`);

// 6. Product Service
writeFile('server/src/modules/products/product.service.ts', `
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { CreateProductInput, UpdateProductInput, ProductQueryInput } from './product.schemas.js';

export class ProductService {
  static async listPublic(query: ProductQueryInput) {
    const { category, search, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (category) {
      where.category = { slug: category };
    }

    if (search) {
      where.OR = [
        { nameEn: { contains: search } },
        { nameBn: { contains: search } },
        { descriptionEn: { contains: search } },
        { descriptionBn: { contains: search } }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: { id: true, nameEn: true, nameBn: true, slug: true }
          }
        }
      }),
      prisma.product.count({ where })
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async listAdmin(query: ProductQueryInput) {
    const { category, search, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (category) where.category = { slug: category };
    if (search) {
      where.OR = [
        { nameEn: { contains: search } },
        { nameBn: { contains: search } }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: { id: true, nameEn: true, nameBn: true, slug: true }
          }
        }
      }),
      prisma.product.count({ where })
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  static async getBySlug(slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: {
          select: { id: true, nameEn: true, nameBn: true, slug: true }
        }
      }
    });

    if (!product || !product.isActive) {
      throw new NotFoundError('Product not found or unavailable');
    }

    return product;
  }

  static async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true }
    });
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }

  static async create(input: CreateProductInput) {
    const existing = await prisma.product.findUnique({ where: { slug: input.slug } });
    if (existing) throw new BadRequestError('Product slug already exists');

    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw new BadRequestError('Selected category does not exist');

    return prisma.product.create({
      data: input,
      include: { category: true }
    });
  }

  static async update(id: string, input: UpdateProductInput) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('Product not found');

    if (input.slug && input.slug !== product.slug) {
      const existing = await prisma.product.findUnique({ where: { slug: input.slug } });
      if (existing) throw new BadRequestError('Slug is already used by another product');
    }

    if (input.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
      if (!category) throw new BadRequestError('Target category does not exist');
    }

    return prisma.product.update({
      where: { id },
      data: input,
      include: { category: true }
    });
  }

  static async softDelete(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('Product not found');

    return prisma.product.update({
      where: { id },
      data: { isActive: false }
    });
  }
}
`);

// 7. Product Controller
writeFile('server/src/modules/products/product.controller.ts', `
import { Request, Response, NextFunction } from 'express';
import { ProductService } from './product.service.js';

export class ProductController {
  static async listPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ProductService.listPublic(req.query as any);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async listAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ProductService.listAdmin(req.query as any);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await ProductService.getBySlug(req.params.slug);
      res.status(200).json({ success: true, data: product });
    } catch (err) { next(err); }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await ProductService.getById(req.params.id);
      res.status(200).json({ success: true, data: product });
    } catch (err) { next(err); }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const created = await ProductService.create(req.body);
      res.status(201).json({ success: true, message: 'Product created successfully', data: created });
    } catch (err) { next(err); }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await ProductService.update(req.params.id, req.body);
      res.status(200).json({ success: true, message: 'Product updated successfully', data: updated });
    } catch (err) { next(err); }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ProductService.softDelete(req.params.id);
      res.status(200).json({ success: true, message: 'Product deactivated (soft-deleted)' });
    } catch (err) { next(err); }
  }
}
`);

// 8. Product Routes
writeFile('server/src/modules/products/product.routes.ts', `
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
`);

// 9. Update Express App assembly to mount new routes
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
import categoryRoutes from './modules/categories/category.routes.js';
import productRoutes from './modules/products/product.routes.js';
import { NotFoundError } from './utils/errors.js';

const app: Express = express();

app.use(helmet());
app.use(cors({ origin: [env.CLIENT_URL, 'http://localhost:5173'], credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/admin/auth', authRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);

// Catch-all 404
app.use((req, _res, next) => {
  next(new NotFoundError(\`Route \${req.method} \${req.originalUrl} not found\`));
});

app.use(errorHandler);

export default app;
`);

console.log('--- Compiling Server TypeScript ---');
execSync('npm --prefix server run build', { stdio: 'inherit' });

console.log('==========================================================');
console.log(' SUCCESS: Phase 4 modules created and compiled cleanly!   ');
console.log('==========================================================');
