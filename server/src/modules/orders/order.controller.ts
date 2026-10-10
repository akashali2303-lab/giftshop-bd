import { Request, Response, NextFunction } from 'express';
import { OrderService } from './order.service.js';

export class OrderController {
  static async checkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await OrderService.createOrder(req.body);
      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: {
          orderNumber: order.orderNumber,
          totalAmountPaisa: order.totalAmountPaisa,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          fulfillmentStatus: order.fulfillmentStatus,
          createdAt: order.createdAt
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async track(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await OrderService.trackOrderByNumber(req.params.orderNumber);
      res.status(200).json({
        success: true,
        data: order
      });
    } catch (err) {
      next(err);
    }
  }
}
