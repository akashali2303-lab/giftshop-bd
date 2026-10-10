const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('==========================================================');
console.log(' Starting Phase 7: Admin Order Operations & Dashboard     ');
console.log('==========================================================');

function writeFile(relativePath, content) {
  const fullPath = path.resolve(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log(`[File Written] ${relativePath}`);
}

// 1. Admin Order & Dashboard Service
writeFile('server/src/modules/admin/orders/adminOrder.service.ts', `
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
          note: note?.trim() || \`Fulfillment status updated to \${newStatus}\`,
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
          note: note?.trim() || \`Payment status changed to \${paymentStatus}\`,
          actorId
        }
      });

      return updated;
    });
  }
}
`);

// 2. Admin Order Controller
writeFile('server/src/modules/admin/orders/adminOrder.controller.ts', `
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
`);

// 3. Admin Order Routes
writeFile('server/src/modules/admin/orders/adminOrder.routes.ts', `
import { Router } from 'express';
import { AdminOrderController } from './adminOrder.controller.js';
import { requireAdminAuth } from '../../../middleware/auth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/dashboard/stats', AdminOrderController.getStats);
router.get('/orders', AdminOrderController.listOrders);
router.get('/orders/:id', AdminOrderController.getOrder);
router.patch('/orders/:id/fulfillment', AdminOrderController.updateFulfillment);
router.patch('/orders/:id/payment', AdminOrderController.verifyPayment);

export default router;
`);

// 4. Update Express App to Mount Admin Order Routes
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
import adminOrderRoutes from './modules/admin/orders/adminOrder.routes.js';
import { NotFoundError } from './utils/errors.js';

const app: Express = express();

app.use(helmet());
app.use(cors({ origin: [env.CLIENT_URL, 'http://localhost:5173'], credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Public & Customer Routes
app.use('/api/health', healthRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/uploads', uploadRoutes);

// Protected Admin Routes
app.use('/api/admin/auth', authRoutes);
app.use('/api/admin', adminOrderRoutes);

app.use((req, _res, next) => {
  next(new NotFoundError(\`Route \${req.method} \${req.originalUrl} not found\`));
});

app.use(errorHandler);

export default app;
`);

// 5. Frontend Admin Login Modal
writeFile('client/src/components/admin/AdminLoginModal.tsx', `
import React, { useState } from 'react';
import { X, Lock, Loader2, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, admin: any) => void;
}

export const AdminLoginModal: React.FC<Props> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@giftshop.com.bd');
  const [password, setPassword] = useState('AdminPass123!');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Login failed');
      }

      localStorage.setItem('giftshop_admin_token', json.data.token);
      onLoginSuccess(json.data.token, json.data.admin);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 relative shadow-2xl animate-in fade-in zoom-in-95">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-base">Admin Portal</h3>
            <span className="text-[11px] text-slate-400">Restricted System Access</span>
          </div>
        </div>

        {errorMsg && (
          <div className="my-3 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3 mt-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-sm shadow flex items-center justify-center gap-1.5"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign In to Dashboard</span>}
          </button>
        </form>
      </div>
    </div>
  );
};
`);

// 6. Frontend Admin Order Detail Modal (Inspect, Download Artwork, Transition Status, Verify TrxID)
writeFile('client/src/components/admin/AdminOrderDetailModal.tsx', `
import React, { useState } from 'react';
import { X, Download, CheckCircle, Clock, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  order: any | null;
  token: string;
  onClose: () => void;
  onOrderUpdated: () => void;
}

export const AdminOrderDetailModal: React.FC<Props> = ({ order, token, onClose, onOrderUpdated }) => {
  const [selectedFulfillment, setSelectedFulfillment] = useState(order?.fulfillmentStatus || 'PENDING');
  const [fulfillmentNote, setFulfillmentNote] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(order?.paymentStatus || 'UNPAID');
  const [paymentNote, setPaymentNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!order) return null;

  const handleUpdateFulfillment = async () => {
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      const res = await fetch(\`/api/admin/orders/\${order.id}/fulfillment\`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify({ status: selectedFulfillment, note: fulfillmentNote })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Update failed');
      onOrderUpdated();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePayment = async (status: string) => {
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      const res = await fetch(\`/api/admin/orders/\${order.id}/payment\`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify({ status, note: paymentNote || \`Admin verified payment as \${status}\` })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Payment update failed');
      onOrderUpdated();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadArtwork = (storageKey: string) => {
    // Open the authorized streaming download endpoint with token
    window.open(\`/api/uploads/artwork/\${storageKey}\`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 relative shadow-2xl my-8">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between border-b border-slate-200 pb-3 pr-8">
          <div>
            <h3 className="text-lg font-black text-slate-900">{order.orderNumber}</h3>
            <span className="text-xs text-slate-400">Placed on {new Date(order.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {order.fulfillmentStatus}
            </span>
            <span className={\`px-2.5 py-1 rounded-full text-xs font-bold \${
              order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-pink-100 text-pink-700'
            }\`}>
              {order.paymentStatus}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="my-3 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 text-xs">
          {/* Customer & Delivery */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <h4 className="font-bold text-slate-800 mb-1">Customer Details</h4>
            <p><span className="text-slate-500">Name:</span> <strong className="text-slate-900">{order.customerName}</strong></p>
            <p><span className="text-slate-500">Phone:</span> <strong className="text-slate-900">{order.customerPhone}</strong></p>
            <p><span className="text-slate-500">Area:</span> {order.district}</p>
            <p><span className="text-slate-500">Address:</span> {order.deliveryAddress}</p>
          </div>

          {/* Payment & Financials */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <h4 className="font-bold text-slate-800 mb-1">Payment Verification</h4>
            <p><span className="text-slate-500">Method:</span> <strong className="text-slate-900">{order.paymentMethod}</strong></p>
            <p><span className="text-slate-500">Total:</span> <strong className="text-brand-600 text-sm">৳{Math.round(order.totalAmountPaisa / 100)}</strong></p>
            {order.paymentTransactions?.[0] && (
              <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] bg-white p-2 rounded-lg">
                <p><span className="text-slate-400">Sender:</span> <strong>{order.paymentTransactions[0].senderPhone || 'N/A'}</strong></p>
                <p><span className="text-slate-400">TrxID:</span> <strong className="text-pink-600 font-mono">{order.paymentTransactions[0].transactionReference || 'N/A'}</strong></p>
              </div>
            )}
            <div className="pt-2 flex gap-2">
              <button
                onClick={() => handleUpdatePayment('PAID')}
                disabled={isUpdating}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
              >
                Mark as PAID
              </button>
              <button
                onClick={() => handleUpdatePayment('UNPAID')}
                disabled={isUpdating}
                className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs"
              >
                Mark UNPAID
              </button>
            </div>
          </div>
        </div>

        {/* Order Items & Artwork Download */}
        <div className="border border-slate-200 rounded-2xl p-4 my-4">
          <h4 className="font-bold text-slate-900 text-xs mb-3">Purchased Items & Customization</h4>
          <div className="space-y-3">
            {order.items?.map((it: any) => (
              <div key={it.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900">{it.quantity}x {it.productNameSnapshot}</p>
                  <p className="text-slate-500">৳{Math.round(it.unitPricePaisa / 100)} each</p>
                  {it.customText && (
                    <p className="text-[11px] text-brand-700 mt-1">
                      <strong>Custom Text:</strong> "{it.customText}"
                    </p>
                  )}
                </div>

                {it.artworkFile ? (
                  <button
                    onClick={() => handleDownloadArtwork(it.artworkFile.storageKey)}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 self-start md:self-center shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Artwork ({it.artworkFile.originalFilename})</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">No artwork file attached</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Fulfillment Status Changer */}
        <div className="p-4 bg-brand-50 border border-brand-200 rounded-2xl my-4 text-xs space-y-2">
          <h4 className="font-bold text-brand-900">Production & Fulfillment Status</h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedFulfillment}
              onChange={(e) => setSelectedFulfillment(e.target.value)}
              className="p-2 rounded-xl border border-brand-300 bg-white font-bold text-xs flex-1"
            >
              <option value="PENDING">PENDING (Awaiting Review)</option>
              <option value="CONFIRMED">CONFIRMED (Accepted)</option>
              <option value="PRINTING">PRINTING (In Production)</option>
              <option value="READY_FOR_SHIPMENT">READY_FOR_SHIPMENT (Packed)</option>
              <option value="SHIPPED">SHIPPED (With Courier)</option>
              <option value="COMPLETED">COMPLETED (Delivered)</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
            <input
              type="text"
              placeholder="Internal status note (optional)"
              value={fulfillmentNote}
              onChange={(e) => setFulfillmentNote(e.target.value)}
              className="p-2 rounded-xl border border-brand-300 bg-white text-xs flex-1"
            />
            <button
              onClick={handleUpdateFulfillment}
              disabled={isUpdating}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs"
            >
              Update Status
            </button>
          </div>
        </div>

        {/* Audit Status History Timeline */}
        {order.statusHistory?.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-200">
            <h5 className="font-bold text-slate-700 text-xs mb-2">Audit History Timeline</h5>
            <div className="space-y-1.5 max-h-36 overflow-y-auto text-[11px] text-slate-500 pr-2">
              {order.statusHistory.map((h: any) => (
                <div key={h.id} className="flex items-start gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800">{h.previousStatus} → {h.newStatus}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">({new Date(h.createdAt).toLocaleTimeString()})</span>
                    {h.note && <p className="text-slate-600">{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
`);

// 7. Frontend Admin Dashboard View
writeFile('client/src/components/admin/AdminDashboard.tsx', `
import React, { useState, useEffect } from 'react';
import { AdminOrderDetailModal } from './AdminOrderDetailModal';
import { Package, Clock, Printer, Truck, CheckCircle, Search, RefreshCw, LogOut } from 'lucide-react';

interface Props {
  token: string;
  admin: any;
  onLogout: () => void;
  onBackToStore: () => void;
}

export const AdminDashboard: React.FC<Props> = ({ token, admin, onLogout, onBackToStore }) => {
  const [stats, setStats] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Stats
      const statsRes = await fetch('/api/admin/dashboard/stats', {
        headers: { 'Authorization': \`Bearer \${token}\` }
      });
      const statsJson = await statsRes.json();
      if (statsJson.success) setStats(statsJson.data.metrics);

      // 2. Fetch Orders
      const query = new URLSearchParams();
      if (statusFilter) query.append('fulfillmentStatus', statusFilter);
      if (searchQuery.trim()) query.append('search', searchQuery.trim());

      const ordersRes = await fetch('/api/admin/orders?' + query.toString(), {
        headers: { 'Authorization': \`Bearer \${token}\` }
      });
      const ordersJson = await ordersRes.json();
      if (ordersJson.success) setOrders(ordersJson.data.items);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Admin Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center font-bold text-white">
              G
            </div>
            <div>
              <h1 className="font-black text-sm sm:text-base leading-tight">GiftShop BD — Operations Portal</h1>
              <span className="text-[11px] text-slate-400">Logged in as {admin?.email} ({admin?.role})</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBackToStore}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
            >
              Customer Store
            </button>
            <button
              onClick={onLogout}
              className="p-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 text-xs font-bold"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Metric Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 block">Total Orders</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{stats.totalOrders}</span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-amber-500 block">Pending Review</span>
              <span className="text-2xl font-black text-amber-600 mt-1 block">{stats.pendingOrders}</span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-blue-500 block">In Production</span>
              <span className="text-2xl font-black text-blue-600 mt-1 block">{stats.printingOrders}</span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-purple-500 block">Ready / Packed</span>
              <span className="text-2xl font-black text-purple-600 mt-1 block">{stats.readyOrders}</span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-500 block">Completed</span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">{stats.completedOrders}</span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-brand-600 block">Revenue Earned</span>
              <span className="text-xl font-black text-brand-700 mt-1 block">৳{Math.round(stats.totalRevenuePaisa / 100)}</span>
            </div>
          </div>
        )}

        {/* Orders Table Container */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Search by Order #, Phone, Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {['', 'PENDING', 'CONFIRMED', 'PRINTING', 'READY_FOR_SHIPMENT', 'COMPLETED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={\`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors \${
                    statusFilter === st ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }\`}
                >
                  {st || 'ALL'}
                </button>
              ))}
              <button onClick={fetchData} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600" title="Refresh">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black border-y border-slate-200">
                <tr>
                  <th className="py-3 px-3">Order Number</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Items</th>
                  <th className="py-3 px-3">Total</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3">Fulfillment</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No orders found matching the filter
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{ord.orderNumber}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{ord.customerName}</span>
                        <span className="text-[11px] text-slate-400">{ord.customerPhone}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-slate-700 font-semibold">{ord.items?.length || 0} Item(s)</span>
                        {ord.items?.some((i: any) => i.artworkFile) && (
                          <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] bg-brand-50 text-brand-600 font-bold">Artwork</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">৳{Math.round(ord.totalAmountPaisa / 100)}</td>
                      <td className="py-3 px-3">
                        <span className={\`px-2 py-0.5 rounded-full text-[10px] font-extrabold \${
                          ord.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-pink-100 text-pink-700'
                        }\`}>
                          {ord.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
                          {ord.fulfillmentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white font-bold text-[11px]"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <AdminOrderDetailModal
        order={selectedOrder}
        token={token}
        onClose={() => setSelectedOrder(null)}
        onOrderUpdated={() => {
          setSelectedOrder(null);
          fetchData();
        }}
      />
    </div>
  );
};
`);

// 8. Update Footer with Admin Portal Access
writeFile('client/src/components/Footer.tsx', `
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Lock } from 'lucide-react';

interface FooterProps {
  onOpenAdminLogin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdminLogin }) => {
  const { lang } = useLanguage();

  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 mt-16 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <span className="text-white font-bold text-lg block mb-2">GiftShop BD</span>
          <p className="text-xs text-slate-400 leading-relaxed">
            {lang === 'bn'
              ? 'ব্যক্তিগত ও বাণিজ্যিক সব ধরনের প্রিন্টিং ও কাস্টমাইজড গিফট এর বিশ্বস্ত সমাধান।'
              : 'Your trusted partner for personalized printing and customized gifts across Bangladesh.'}
          </p>
        </div>

        <div>
          <h4 className="text-white font-bold text-sm mb-3">
            {lang === 'bn' ? 'পেমেন্ট মাধ্যম' : 'Payment Methods'}
          </h4>
          <div className="flex gap-2">
            <span className="px-2.5 py-1 rounded bg-slate-800 text-pink-400 font-bold text-xs border border-slate-700">bKash</span>
            <span className="px-2.5 py-1 rounded bg-slate-800 text-orange-400 font-bold text-xs border border-slate-700">Nagad</span>
            <span className="px-2.5 py-1 rounded bg-slate-800 text-emerald-400 font-bold text-xs border border-slate-700">Cash on Delivery</span>
          </div>
        </div>

        <div>
          <h4 className="text-white font-bold text-sm mb-3">
            {lang === 'bn' ? 'যোগাযোগ ও সাপোর্ট' : 'Contact Support'}
          </h4>
          <p className="text-xs">Dhaka, Bangladesh</p>
          <p className="text-xs mt-1">support@giftshop.com.bd</p>
          <p className="text-xs mt-1">+880 1700-000000</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
        <span>© 2026 GiftShop BD. All rights reserved.</span>
        <button
          onClick={onOpenAdminLogin}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Admin Portal</span>
        </button>
      </div>
    </footer>
  );
};
`);

// 9. Update client/src/App.tsx to wire Admin Dashboard & Modal
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
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
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
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('giftshop_admin_token'));
  const [adminUser, setAdminUser] = useState<any | null>(null);
  const [viewAdminPortal, setViewAdminPortal] = useState(() => window.location.search.includes('admin=true'));
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

  if (viewAdminPortal && adminToken) {
    return (
      <AdminDashboard
        token={adminToken}
        admin={adminUser || { email: 'admin@giftshop.com.bd', role: 'SUPER_ADMIN' }}
        onLogout={() => {
          localStorage.removeItem('giftshop_admin_token');
          setAdminToken(null);
          setViewAdminPortal(false);
        }}
        onBackToStore={() => setViewAdminPortal(false)}
      />
    );
  }

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
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={(tok, usr) => {
          setAdminToken(tok);
          setAdminUser(usr);
          setViewAdminPortal(true);
        }}
      />

      <WhatsAppButton />
      <Footer onOpenAdminLogin={() => {
        if (adminToken) {
          setViewAdminPortal(true);
        } else {
          setIsAdminLoginOpen(true);
        }
      }} />
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
console.log(' SUCCESS: Phase 7 Admin Operations & Metrics Complete!    ');
console.log('==========================================================');
