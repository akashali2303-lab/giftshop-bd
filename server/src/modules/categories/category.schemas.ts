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
