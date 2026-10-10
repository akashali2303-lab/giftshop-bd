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
