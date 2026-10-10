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
