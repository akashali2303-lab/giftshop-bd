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
