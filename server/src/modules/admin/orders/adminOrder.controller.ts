import { Request, Response, NextFunction } from 'express';
import { AdminOrderService } from './adminOrder.service.js';

export class AdminOrderController {
  static async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AdminOrderService.getDashboardStats();
      res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
  }

  static async listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fulfillmentStatus, paymentStatus, search, page, limit } = req.query;
      const result = await AdminOrderService.listOrders({
        fulfillmentStatus: fulfillmentStatus as string,
        paymentStatus: paymentStatus as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await AdminOrderService.getOrderById(req.params.id);
      res.status(200).json({ success: true, data: order });
    } catch (err) { next(err); }
  }

  static async updateFulfillment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, note } = req.body;
      const order = await AdminOrderService.updateFulfillmentStatus(
        req.params.id,
        status,
        req.admin!.id,
        note
      );
      res.status(200).json({ success: true, message: 'Fulfillment status updated', data: order });
    } catch (err) { next(err); }
  }

  static async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, note } = req.body;
      const order = await AdminOrderService.verifyPaymentStatus(
        req.params.id,
        status,
        req.admin!.id,
        note
      );
      res.status(200).json({ success: true, message: 'Payment status updated', data: order });
    } catch (err) { next(err); }
  }
}
