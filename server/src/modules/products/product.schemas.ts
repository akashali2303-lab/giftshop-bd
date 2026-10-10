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
