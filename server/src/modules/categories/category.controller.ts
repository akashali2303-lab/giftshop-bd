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
