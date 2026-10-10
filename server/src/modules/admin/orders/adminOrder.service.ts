import { prisma } from '../../../lib/prisma.js';
import { NotFoundError, BadRequestError } from '../../../utils/errors.js';

export class AdminOrderService {
  static async getDashboardStats() {
    const [
      totalOrders,
      pendingOrders,
      printingOrders,
      readyOrders,
      completedOrders,
      cancelledOrders,
      revenueResult
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { fulfillmentStatus: 'PENDING' } }),
      prisma.order.count({ where: { fulfillmentStatus: 'PRINTING' } }),
      prisma.order.count({ where: { fulfillmentStatus: 'READY_FOR_SHIPMENT' } }),
      prisma.order.count({ where: { fulfillmentStatus: 'COMPLETED' } }),
      prisma.order.count({ where: { fulfillmentStatus: 'CANCELLED' } }),
      prisma.order.aggregate({
        _sum: { totalAmountPaisa: true },
        where: {
          OR: [
            { paymentStatus: 'PAID' },
            { fulfillmentStatus: 'COMPLETED' }
          ]
        }
      })
    ]);

    const recentOrders = await prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        totalAmountPaisa: true,
        paymentStatus: true,
        fulfillmentStatus: true,
        createdAt: true
      }
    });

    return {
      metrics: {
        totalOrders,
        pendingOrders,
        printingOrders,
        readyOrders,
        completedOrders,
        cancelledOrders,
        totalRevenuePaisa: revenueResult._sum.totalAmountPaisa || 0
      },
      recentOrders
    };
  }

  static async listOrders(query: {
    fulfillmentStatus?: string;
    paymentStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 15));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.fulfillmentStatus) where.fulfillmentStatus = query.fulfillmentStatus;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { orderNumber: { contains: s } },
        { customerPhone: { contains: s } },
        { customerName: { contains: s } }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: { artworkFile: true }
          },
          paymentTransactions: true
        }
      }),
      prisma.order.count({ where })
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

  static async getOrderById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { artworkFile: true }
        },
        paymentTransactions: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            actor: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    if (!order) throw new NotFoundError('Order not found');
    return order;
  }

  static async updateFulfillmentStatus(
    orderId: string,
    newStatus: string,
    actorId: string,
    note?: string
  ) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Order not found');

    const previousStatus = order.fulfillmentStatus;

    return prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { fulfillmentStatus: newStatus },
        include: {
          items: { include: { artworkFile: true } },
          paymentTransactions: true,
          statusHistory: true
        }
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          previousStatus,
          newStatus,
          note: note?.trim() || `Fulfillment status updated to ${newStatus}`,
          actorId
        }
      });

      return updatedOrder;
    });
  }

  static async verifyPaymentStatus(
    orderId: string,
    paymentStatus: string,
    actorId: string,
    note?: string
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { paymentTransactions: true }
    });
    if (!order) throw new NotFoundError('Order not found');

    return prisma.$transaction(async (tx) => {
      const isPaid = paymentStatus === 'PAID';

      // Update linked payment transactions if verifying
      if (order.paymentTransactions.length > 0) {
        await tx.paymentTransaction.updateMany({
          where: { orderId },
          data: {
            isVerified: isPaid,
            verifiedAt: isPaid ? new Date() : null,
            adminNote: note
          }
        });
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus },
        include: {
          items: { include: { artworkFile: true } },
          paymentTransactions: true
        }
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          previousStatus: order.fulfillmentStatus,
          newStatus: order.fulfillmentStatus,
          note: note?.trim() || `Payment status changed to ${paymentStatus}`,
          actorId
        }
      });

      return updated;
    });
  }
}
