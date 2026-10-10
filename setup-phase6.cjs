const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('==========================================================');
console.log(' Starting Phase 6: Checkout, Orders, & Payment Workflow   ');
console.log('==========================================================');

function writeFile(relativePath, content) {
  const fullPath = path.resolve(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log(`[File Written] ${relativePath}`);
}

// 1. Backend Order Schemas
writeFile('server/src/modules/orders/order.schemas.ts', `
import { z } from 'zod';

export const checkoutItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  customText: z.string().optional(),
  storageKey: z.string().optional(),
  originalFilename: z.string().optional()
});

export const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, 'Full name is required (minimum 2 characters)'),
  customerPhone: z.string().trim().regex(/^01[3-9]\\d{8}$/, 'Valid 11-digit Bangladesh phone number required (e.g. 01712345678)'),
  deliveryAddress: z.string().trim().min(5, 'Detailed delivery address is required'),
  district: z.enum(['Dhaka', 'Outside Dhaka']),
  deliveryInstructions: z.string().optional(),
  paymentMethod: z.enum(['COD', 'BKASH_MANUAL', 'NAGAD_MANUAL']),
  senderPhone: z.string().optional(),
  transactionReference: z.string().optional(),
  items: z.array(checkoutItemSchema).min(1, 'Cart cannot be empty')
});

export const trackOrderSchema = z.object({
  orderNumber: z.string().trim().min(5, 'Valid order number is required')
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type TrackOrderInput = z.infer<typeof trackOrderSchema>;
`);

// 2. Backend Order Service
writeFile('server/src/modules/orders/order.service.ts', `
import crypto from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { CheckoutInput } from './order.schemas.js';

export class OrderService {
  private static generateOrderNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return \`GBD-\${dateStr}-\${randHex}\`;
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
        throw new BadRequestError(\`Product with ID \${item.productId} is unavailable or removed\`);
      }

      if (product.requiresCustomText && !item.customText?.trim()) {
        throw new BadRequestError(\`Product "\${product.nameEn}" requires custom text\`);
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
      throw new NotFoundError(\`Order with reference "\${orderNumber}" was not found\`);
    }

    return order;
  }
}
`);

// 3. Backend Order Controller
writeFile('server/src/modules/orders/order.controller.ts', `
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
`);

// 4. Backend Order Routes
writeFile('server/src/modules/orders/order.routes.ts', `
import { Router } from 'express';
import { OrderController } from './order.controller.js';
import { checkoutSchema } from './order.schemas.js';
import { validate } from '../../middleware/validate.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

// Checkout limiter: max 15 checkout attempts per 15 minutes per IP
const checkoutLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 15,
  message: 'Too many order requests. Please wait a few minutes.'
});

router.post('/checkout', checkoutLimiter, validate({ body: checkoutSchema }), OrderController.checkout);
router.get('/track/:orderNumber', OrderController.track);

export default router;
`);

// 5. Mount Order Routes in Express (server/src/app.ts)
writeFile('server/src/app.ts', `
import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import healthRoutes from './modules/health/health.routes.js';
import uploadRoutes from './modules/uploads/uploads.routes.js';
import categoryRoutes from './modules/categories/category.routes.js';
import productRoutes from './modules/products/product.routes.js';
import orderRoutes from './modules/orders/order.routes.js';
import { NotFoundError } from './utils/errors.js';

const app: Express = express();

app.use(helmet());
app.use(cors({ origin: [env.CLIENT_URL, 'http://localhost:5173'], credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/admin/auth', authRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

app.use((req, _res, next) => {
  next(new NotFoundError(\`Route \${req.method} \${req.originalUrl} not found\`));
});

app.use(errorHandler);

export default app;
`);

// 6. Frontend Checkout Modal Component
writeFile('client/src/components/CheckoutModal.tsx', `
import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { X, CheckCircle, AlertCircle, Loader2, MessageCircle } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const { items, subtotalPaisa, clearCart } = useCart();
  const { lang, t } = useLanguage();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [district, setDistrict] = useState<'Dhaka' | 'Outside Dhaka'>('Dhaka');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BKASH_MANUAL' | 'NAGAD_MANUAL'>('COD');
  const [senderPhone, setSenderPhone] = useState('');
  const [transactionReference, setTransactionReference] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);

  if (!isOpen) return null;

  const deliveryFeePaisa = district === 'Dhaka' ? 8000 : 13000;
  const totalAmountPaisa = subtotalPaisa + deliveryFeePaisa;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate phone number format (01[3-9]XXXXXXXX)
    const phoneRegex = /^01[3-9]\\d{8}$/;
    if (!phoneRegex.test(customerPhone.trim())) {
      setErrorMsg(lang === 'bn' ? 'সঠিক ১১ ডিজিটের ফোন নম্বর দিন (যেমন: 01712345678)' : 'Valid 11-digit Bangladesh phone number required (e.g. 017XXXXXXXX)');
      return;
    }

    if ((paymentMethod === 'BKASH_MANUAL' || paymentMethod === 'NAGAD_MANUAL') && (!senderPhone || !transactionReference)) {
      setErrorMsg(lang === 'bn' ? 'অনুগ্রহ করে প্রেরক নম্বর এবং TrxID প্রদান করুন' : 'Sender phone and Transaction ID (TrxID) are required for MFS payment');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        district,
        deliveryInstructions: deliveryInstructions.trim() || undefined,
        paymentMethod,
        senderPhone: senderPhone.trim() || undefined,
        transactionReference: transactionReference.trim() || undefined,
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          customText: i.customText,
          storageKey: i.artworkFile?.storageKey,
          originalFilename: i.artworkFile?.originalFilename
        }))
      };

      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Checkout failed');
      }

      setOrderSuccess(json.data);
      clearCart();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWhatsAppShareUrl = () => {
    if (!orderSuccess) return '#';
    const message = encodeURIComponent(
      \`*New Order: \${orderSuccess.orderNumber}*\\n\` +
      \`Customer: \${customerName}\\n\` +
      \`Phone: \${customerPhone}\\n\` +
      \`Total: ৳\${Math.round(orderSuccess.totalAmountPaisa / 100)}\\n\` +
      \`Payment: \${orderSuccess.paymentMethod}\\n\\n\` +
      \`Please confirm my gift order.\`
    );
    return \`https://wa.me/8801700000000?text=\${message}\`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 relative shadow-2xl animate-in fade-in zoom-in-95 my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400"
        >
          <X className="w-5 h-5" />
        </button>

        {orderSuccess ? (
          /* Order Placement Success View */
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
            <h2 className="text-2xl font-black text-slate-900">
              {lang === 'bn' ? 'অর্ডার সফলভাবে গ্রহণ করা হয়েছে!' : 'Order Placed Successfully!'}
            </h2>
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 inline-block text-left w-full">
              <p className="text-xs text-slate-500">{lang === 'bn' ? 'অর্ডার রেফারেন্স নম্বর' : 'Order Reference Number'}</p>
              <p className="text-lg font-black text-brand-600 tracking-wider">{orderSuccess.orderNumber}</p>
              <div className="mt-2 text-xs text-slate-700 space-y-1 border-t border-slate-200 pt-2">
                <p><span className="font-bold">{lang === 'bn' ? 'মোট মূল্য:' : 'Total Amount:'}</span> ৳{Math.round(orderSuccess.totalAmountPaisa / 100)}</p>
                <p><span className="font-bold">{lang === 'bn' ? 'পেমেন্ট পদ্ধতি:' : 'Payment Method:'}</span> {orderSuccess.paymentMethod}</p>
                <p><span className="font-bold">{lang === 'bn' ? 'স্ট্যাটাস:' : 'Status:'}</span> {orderSuccess.fulfillmentStatus}</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-4">
              {lang === 'bn'
                ? 'আমাদের কাস্টমার কেয়ার প্রতিনিধি শীঘ্রই আপনার সাথে যোগাযোগ করবেন।'
                : 'Our customer support representative will contact you shortly to confirm production.'}
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <a
                href={getWhatsAppShareUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{lang === 'bn' ? 'হোয়াটসঅ্যাপে অর্ডার নিশ্চিত করুন' : 'Share Order to WhatsApp'}</span>
              </a>

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        ) : (
          /* Checkout Form */
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">{t('checkout')}</h2>
            <p className="text-xs text-slate-500 mb-4">
              {lang === 'bn' ? 'ডেলিভারির জন্য আপনার সঠিক তথ্য প্রদান করুন' : 'Provide your delivery details to complete order'}
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{lang === 'bn' ? 'আপনার নাম *' : 'Full Name *'}</label>
                <input
                  required
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: তানভীর আহমেদ' : 'e.g. Tanvir Ahmed'}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{lang === 'bn' ? 'মোবাইল নম্বর (১১ ডিজিট) *' : 'Mobile Number (11 digits) *'}</label>
                <input
                  required
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{lang === 'bn' ? 'ডেলিভারি এলাকা *' : 'Delivery Area *'}</label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                  >
                    <option value="Dhaka">{lang === 'bn' ? 'ঢাকার ভিতরে (৳৮০)' : 'Inside Dhaka (৳80)'}</option>
                    <option value="Outside Dhaka">{lang === 'bn' ? 'ঢাকার বাইরে (৳১৩০)' : 'Outside Dhaka (৳130)'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{lang === 'bn' ? 'পেমেন্ট মেথড *' : 'Payment Method *'}</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs font-semibold"
                  >
                    <option value="COD">{lang === 'bn' ? 'ক্যাশ অন ডেলিভারি (COD)' : 'Cash on Delivery (COD)'}</option>
                    <option value="BKASH_MANUAL">bKash (Send Money / Pay)</option>
                    <option value="NAGAD_MANUAL">Nagad (Send Money / Pay)</option>
                  </select>
                </div>
              </div>

              {/* bKash / Nagad Manual Payment Instructions */}
              {(paymentMethod === 'BKASH_MANUAL' || paymentMethod === 'NAGAD_MANUAL') && (
                <div className="p-3 bg-pink-50 border border-pink-200 rounded-xl space-y-2">
                  <p className="text-[11px] font-bold text-pink-900">
                    {paymentMethod === 'BKASH_MANUAL' ? 'বিকাশ নম্বর:' : 'নগদ নম্বর:'} <span className="underline">01700-000000</span> (Personal)
                  </p>
                  <p className="text-[10px] text-pink-700">
                    {lang === 'bn'
                      ? \`অনুগ্রহ করে মোট ৳\${Math.round(totalAmountPaisa / 100)} টাকা সেন্ড মানি করুন এবং নিচে আপনার নম্বর ও TrxID লিখুন।\`
                      : \`Please Send Money ৳\${Math.round(totalAmountPaisa / 100)} and enter your sender number & TrxID below.\`}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      required
                      type="text"
                      placeholder={lang === 'bn' ? 'প্রেরক নম্বর' : 'Sender Phone'}
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      className="p-2 rounded-lg border border-pink-300 text-xs bg-white"
                    />
                    <input
                      required
                      type="text"
                      placeholder="TrxID (e.g. 9J28DA1K)"
                      value={transactionReference}
                      onChange={(e) => setTransactionReference(e.target.value)}
                      className="p-2 rounded-lg border border-pink-300 text-xs bg-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">{lang === 'bn' ? 'বিস্তারিত ঠিকানা *' : 'Detailed Address *'}</label>
                <textarea
                  required
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder={lang === 'bn' ? 'বাসা/রোড নম্বর, এলাকা, থানা, জেলা...' : 'House/Road, Area, Thana, District...'}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                />
              </div>

              {/* Cost Summary */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>{t('subtotal')}:</span>
                  <span className="font-semibold">৳{Math.round(subtotalPaisa / 100)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{t('deliveryFee')}:</span>
                  <span className="font-semibold">৳{Math.round(deliveryFeePaisa / 100)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-200">
                  <span>{t('total')}:</span>
                  <span>৳{Math.round(totalAmountPaisa / 100)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'bn' ? 'অর্ডার প্রসেস হচ্ছে...' : 'Processing Order...'}</span>
                  </>
                ) : (
                  <span>{lang === 'bn' ? \`অর্ডার নিশ্চিত করুন (৳\${Math.round(totalAmountPaisa / 100)})\` : \`Confirm Order (৳\${Math.round(totalAmountPaisa / 100)})\`}</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
`);

// 7. Frontend Order Tracking Modal
writeFile('client/src/components/OrderTrackModal.tsx', `
import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, Search, Loader2, PackageCheck } from 'lucide-react';

interface OrderTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrderTrackModal: React.FC<OrderTrackModalProps> = ({ isOpen, onClose }) => {
  const { lang } = useLanguage();
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDetails, setOrderDetails] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) return;

    try {
      setIsLoading(true);
      setErrorMsg(null);
      setOrderDetails(null);

      const res = await fetch(\`/api/orders/track/\${encodeURIComponent(orderNumber.trim())}\`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Order reference not found');
      }

      setOrderDetails(json.data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 relative shadow-2xl animate-in fade-in zoom-in-95 my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <PackageCheck className="w-6 h-6 text-brand-600" />
          <h2 className="text-xl font-bold text-slate-900">
            {lang === 'bn' ? 'অর্ডার ট্র্যাক করুন' : 'Track Your Order'}
          </h2>
        </div>

        <form onSubmit={handleTrack} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. GBD-20261009-8A2F"
              className="flex-1 p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 uppercase font-bold"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center gap-1 shadow"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>{lang === 'bn' ? 'খুঁজুন' : 'Track'}</span>
            </button>
          </div>
        </form>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs mb-3">
            {errorMsg}
          </div>
        )}

        {orderDetails && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-900">{orderDetails.orderNumber}</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-100 text-brand-700">
                {orderDetails.fulfillmentStatus}
              </span>
            </div>

            <div className="space-y-1 text-slate-600">
              <p><span className="font-bold">{lang === 'bn' ? 'গ্রাহক:' : 'Customer:'}</span> {orderDetails.customerName}</p>
              <p><span className="font-bold">{lang === 'bn' ? 'পেমেন্ট স্ট্যাটাস:' : 'Payment Status:'}</span> {orderDetails.paymentStatus}</p>
              <p><span className="font-bold">{lang === 'bn' ? 'মোট মূল্য:' : 'Total:'}</span> ৳{Math.round(orderDetails.totalAmountPaisa / 100)}</p>
            </div>

            <div className="border-t border-slate-200 pt-2">
              <span className="font-bold text-slate-800 block mb-1">{lang === 'bn' ? 'পণ্যসমূহ:' : 'Items:'}</span>
              <ul className="space-y-1 text-slate-600">
                {orderDetails.items.map((it: any, idx: number) => (
                  <li key={idx} className="flex justify-between">
                    <span>{it.quantity}x {it.productNameSnapshot}</span>
                    <span className="font-semibold">৳{Math.round(it.lineTotalPaisa / 100)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
`);

// 8. Update client/src/components/Navbar.tsx to add Order Tracking button
writeFile('client/src/components/Navbar.tsx', `
import React from 'react';
import { ShoppingBag, Search, Globe, PackageSearch } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';

interface NavbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenTrack: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ searchQuery, setSearchQuery, onOpenTrack }) => {
  const { lang, setLang, t } = useLanguage();
  const { items, setIsCartOpen } = useCart();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-brand-500/20">
              G
            </div>
            <div>
              <span className="font-bold text-xl text-slate-900 tracking-tight block leading-tight">
                {t('brandTitle')}
              </span>
              <span className="text-xs text-slate-500 hidden sm:block">
                {t('tagline')}
              </span>
            </div>
          </div>

          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full bg-slate-100 border border-slate-200 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onOpenTrack}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border border-slate-300 hover:bg-slate-100 transition-colors text-slate-700"
              title="Track Order"
            >
              <PackageSearch className="w-3.5 h-3.5 text-brand-600" />
              <span className="hidden sm:inline">{lang === 'bn' ? 'অর্ডার ট্র্যাক' : 'Track Order'}</span>
            </button>

            <button
              onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border border-slate-300 hover:bg-slate-100 transition-colors text-slate-700"
            >
              <Globe className="w-3.5 h-3.5 text-brand-600" />
              <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-slate-800"
              aria-label="View Cart"
            >
              <ShoppingBag className="w-5 h-5 text-slate-700" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-600 text-white font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="pb-3 md:hidden">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full bg-slate-100 border border-slate-200 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          </div>
        </div>
      </div>
    </header>
  );
};
`);

// 9. Update CartDrawer to open CheckoutModal
writeFile('client/src/components/CartDrawer.tsx', `
import React from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { X, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

interface CartDrawerProps {
  onOpenCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onOpenCheckout }) => {
  const { items, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, subtotalPaisa, deliveryFeePaisa, totalPaisa } = useCart();
  const { lang, t } = useLanguage();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity" onClick={() => setIsCartOpen(false)} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-600" />
              <h2 className="font-bold text-slate-900">{t('cart')}</h2>
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-600">
                {items.length}
              </span>
            </div>
            <button onClick={() => setIsCartOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <ShoppingBag className="w-12 h-12 mx-auto stroke-1 mb-2 text-slate-300" />
                <p className="text-sm font-semibold">{t('emptyCart')}</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 leading-snug">
                        {lang === 'bn' ? item.product.nameBn : item.product.nameEn}
                      </h4>
                      <span className="text-xs font-extrabold text-brand-600">
                        ৳{Math.round((item.product.basePricePaisa * item.quantity) / 100)}
                      </span>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-red-600 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {(item.customText || item.artworkFile) && (
                    <div className="p-2 rounded-xl bg-slate-50 text-[11px] text-slate-600 space-y-0.5 border border-slate-100">
                      {item.customText && (
                        <p><span className="font-bold">{lang === 'bn' ? 'লেখা:' : 'Text:'}</span> {item.customText}</p>
                      )}
                      {item.artworkFile && (
                        <p><span className="font-bold">{lang === 'bn' ? 'ফাইল:' : 'File:'}</span> {item.artworkFile.originalFilename}</p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-400">{lang === 'bn' ? 'পরিমাণ:' : 'Qty:'}</span>
                    <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg p-0.5">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded bg-slate-100 font-bold text-xs">-</button>
                      <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded bg-slate-100 font-bold text-xs">+</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {items.length > 0 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>{t('subtotal')}</span>
                <span className="font-semibold">৳{Math.round(subtotalPaisa / 100)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>{t('deliveryFee')}</span>
                <span className="font-semibold">৳{Math.round(deliveryFeePaisa / 100)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1 border-t border-slate-200">
                <span>{t('total')}</span>
                <span>৳{Math.round(totalPaisa / 100)}</span>
              </div>

              <button
                onClick={() => {
                  setIsCartOpen(false);
                  onOpenCheckout();
                }}
                className="w-full mt-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <span>{t('checkout')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
`);

// 10. Update client/src/App.tsx to integrate Checkout and Track Modals
writeFile('client/src/App.tsx', `
import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { CategoryGrid } from './components/CategoryGrid';
import { ProductCard } from './components/ProductCard';
import { ProductCustomizationModal } from './components/ProductCustomizationModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderTrackModal } from './components/OrderTrackModal';
import { WhatsAppButton } from './components/WhatsAppButton';
import { Footer } from './components/Footer';
import { fetchCategories, fetchProducts } from './services/api';
import { Category, Product } from './types';
import { useLanguage } from './context/LanguageContext';

export const App: React.FC = () => {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCustomizeProduct, setActiveCustomizeProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackOpen, setIsTrackOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCategories().then((cats) => setCategories(cats));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchProducts({
      category: selectedCategory || undefined,
      search: searchQuery.trim() || undefined
    })
      .then((prods) => setProducts(prods))
      .finally(() => setIsLoading(false));
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenTrack={() => setIsTrackOpen(true)}
      />
      <Hero />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <CategoryGrid
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">{t('popularProducts')}</h2>
          <span className="text-xs text-slate-500 font-semibold">{products.length} Items</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-2xl h-64 border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
            <p className="text-slate-500 font-bold text-sm">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onOpenCustomize={setActiveCustomizeProduct}
              />
            ))}
          </div>
        )}
      </main>

      <ProductCustomizationModal
        product={activeCustomizeProduct}
        onClose={() => setActiveCustomizeProduct(null)}
      />

      <CartDrawer onOpenCheckout={() => setIsCheckoutOpen(true)} />
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
      <OrderTrackModal isOpen={isTrackOpen} onClose={() => setIsTrackOpen(false)} />

      <WhatsAppButton />
      <Footer />
    </div>
  );
};
export default App;
`);

console.log('--- Compiling Backend TypeScript ---');
execSync('npm --prefix server run build', { stdio: 'inherit' });

console.log('--- Compiling Frontend Production Build ---');
execSync('npm --prefix client run build', { stdio: 'inherit' });

console.log('==========================================================');
console.log(' SUCCESS: Phase 6 Checkout & Orders Workflow Built!       ');
console.log('==========================================================');
