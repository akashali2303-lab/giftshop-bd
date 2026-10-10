import crypto from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { CheckoutInput } from './order.schemas.js';

export class OrderService {
  private static generateOrderNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `GBD-${dateStr}-${randHex}`;
  }

  static async createOrder(input: CheckoutInput) {
    // 1. Server-side price recalculation & product validation
    const productIds = input.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true }
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    let calculatedSubtotalPaisa = 0;
    const validatedItems: Array<{
      productId: string;
      productNameSnapshot: string;
      unitPricePaisa: number;
      quantity: number;
      lineTotalPaisa: number;
      customText?: string;
      storageKey?: string;
      originalFilename?: string;
    }> = [];

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new BadRequestError(`Product with ID ${item.productId} is unavailable or removed`);
      }

      if (product.requiresCustomText && !item.customText?.trim()) {
        throw new BadRequestError(`Product "${product.nameEn}" requires custom text`);
      }

      const lineTotalPaisa = product.basePricePaisa * item.quantity;
      calculatedSubtotalPaisa += lineTotalPaisa;

      validatedItems.push({
        productId: product.id,
        productNameSnapshot: product.nameEn,
        unitPricePaisa: product.basePricePaisa,
        quantity: item.quantity,
        lineTotalPaisa,
        customText: item.customText?.trim(),
        storageKey: item.storageKey,
        originalFilename: item.originalFilename
      });
    }

    // Standard Bangladesh delivery rates: Dhaka = ৳80, Outside Dhaka = ৳130
    const deliveryFeePaisa = input.district === 'Dhaka' ? 8000 : 13000;
    const totalAmountPaisa = calculatedSubtotalPaisa + deliveryFeePaisa;
    const orderNumber = this.generateOrderNumber();

    // Determine initial payment status
    const paymentStatus =
      input.paymentMethod === 'COD'
        ? 'UNPAID'
        : 'AWAITING_VERIFICATION';

    // 2. Atomic Database Transaction
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          deliveryAddress: input.deliveryAddress,
          district: input.district,
          deliveryInstructions: input.deliveryInstructions,
          subtotalPaisa: calculatedSubtotalPaisa,
          deliveryFeePaisa,
          totalAmountPaisa,
          currency: 'BDT',
          paymentMethod: input.paymentMethod,
          paymentStatus,
          fulfillmentStatus: 'PENDING',
          items: {
            create: validatedItems.map((vi) => ({
              productId: vi.productId,
              productNameSnapshot: vi.productNameSnapshot,
              unitPricePaisa: vi.unitPricePaisa,
              quantity: vi.quantity,
              lineTotalPaisa: vi.lineTotalPaisa,
              customText: vi.customText,
              ...(vi.storageKey && {
                artworkFile: {
                  create: {
                    storageKey: vi.storageKey,
                    originalFilename: vi.originalFilename || 'artwork.file',
                    mimeType: vi.storageKey.endsWith('.pdf') ? 'application/pdf' : 'image/png',
                    fileSizeBytes: 0
                  }
                }
              })
            }))
          },
          statusHistory: {
            create: {
              previousStatus: 'PENDING',
              newStatus: 'PENDING',
              note: 'Order placed by customer via checkout'
            }
          },
          ...((input.paymentMethod === 'BKASH_MANUAL' || input.paymentMethod === 'NAGAD_MANUAL') && {
            paymentTransactions: {
              create: {
                paymentMethod: input.paymentMethod,
                amountPaisa: totalAmountPaisa,
                senderPhone: input.senderPhone,
                transactionReference: input.transactionReference,
                isVerified: false
              }
            }
          })
        },
        include: {
          items: {
            include: { artworkFile: true }
          },
          paymentTransactions: true
        }
      });

      return order;
    });
  }

  static async trackOrderByNumber(orderNumber: string) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: {
        orderNumber: true,
        customerName: true,
        district: true,
        subtotalPaisa: true,
        deliveryFeePaisa: true,
        totalAmountPaisa: true,
        currency: true,
        paymentMethod: true,
        paymentStatus: true,
        fulfillmentStatus: true,
        createdAt: true,
        items: {
          select: {
            productNameSnapshot: true,
            unitPricePaisa: true,
            quantity: true,
            lineTotalPaisa: true,
            customText: true
          }
        }
      }
    });

    if (!order) {
      throw new NotFoundError(`Order with reference "${orderNumber}" was not found`);
    }

    return order;
  }
}
