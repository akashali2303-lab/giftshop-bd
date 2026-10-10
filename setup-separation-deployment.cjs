const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('==========================================================');
console.log(' Separating Admin Panel & Generating Live Deployment      ');
console.log('==========================================================');

function writeFile(relativePath, content) {
  const fullPath = path.resolve(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log(`[File Written] ${relativePath}`);
}

// ----------------------------------------------------
// 1. UPDATE ROOT package.json TO INCLUDE 'admin'
// ----------------------------------------------------
writeFile('package.json', `
{
  "name": "giftshop-bd-root",
  "version": "1.0.0",
  "private": true,
  "description": "Production Online Printing & Personalized Gift Shop for Bangladesh",
  "workspaces": [
    "server",
    "client",
    "admin"
  ],
  "scripts": {
    "dev:server": "npm --prefix server run dev",
    "dev:client": "npm --prefix client run dev",
    "dev:admin": "npm --prefix admin run dev",
    "build:all": "npm --prefix server run build && npm --prefix client run build && npm --prefix admin run build",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts"
  },
  "devDependencies": {
    "@types/node": "^20.11.24",
    "prisma": "^5.10.2",
    "tsx": "^4.7.1",
    "typescript": "^5.3.3"
  }
}
`);

// ----------------------------------------------------
// 2. BUILD DEDICATED admin/ WORKSPACE
// ----------------------------------------------------
writeFile('admin/package.json', `
{
  "name": "giftshop-bd-admin",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^0.344.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3",
    "vite": "^5.1.6"
  }
}
`);

writeFile('admin/vite.config.ts', `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
`);

writeFile('admin/postcss.config.js', `
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`);

writeFile('admin/tailwind.config.js', `
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf4f4',
          500: '#e11d48',
          600: '#be123c',
          700: '#9f1239',
        }
      }
    },
  },
  plugins: [],
}
`);

writeFile('admin/tsconfig.json', `
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
`);

writeFile('admin/index.html', `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GiftShop BD — Operations Dashboard</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  </head>
  <body class="bg-slate-100 text-slate-800 antialiased font-['Inter',sans-serif]">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`);

writeFile('admin/src/index.css', `
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  min-height: 100vh;
}
`);

// Admin Detail Modal
writeFile('admin/src/components/AdminOrderDetailModal.tsx', `
import React, { useState } from 'react';
import { X, Download, Clock, AlertCircle } from 'lucide-react';

interface Props {
  order: any | null;
  token: string;
  onClose: () => void;
  onOrderUpdated: () => void;
}

export const AdminOrderDetailModal: React.FC<Props> = ({ order, token, onClose, onOrderUpdated }) => {
  const [selectedFulfillment, setSelectedFulfillment] = useState(order?.fulfillmentStatus || 'PENDING');
  const [fulfillmentNote, setFulfillmentNote] = useState('');
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
        body: JSON.stringify({ status, note: paymentNote || \`Admin marked payment as \${status}\` })
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
            <span className="text-xs text-slate-400">Date: {new Date(order.createdAt).toLocaleString()}</span>
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
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <h4 className="font-bold text-slate-800 mb-1">Customer & Delivery</h4>
            <p><span className="text-slate-500">Name:</span> <strong className="text-slate-900">{order.customerName}</strong></p>
            <p><span className="text-slate-500">Phone:</span> <strong className="text-slate-900">{order.customerPhone}</strong></p>
            <p><span className="text-slate-500">Area:</span> {order.district}</p>
            <p><span className="text-slate-500">Address:</span> {order.deliveryAddress}</p>
          </div>

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
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Verify PAID
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

        <div className="border border-slate-200 rounded-2xl p-4 my-4">
          <h4 className="font-bold text-slate-900 text-xs mb-3">Custom Products & Artwork</h4>
          <div className="space-y-3">
            {order.items?.map((it: any) => (
              <div key={it.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900">{it.quantity}x {it.productNameSnapshot}</p>
                  <p className="text-slate-500">৳{Math.round(it.unitPricePaisa / 100)}</p>
                  {it.customText && (
                    <p className="text-[11px] text-brand-700 mt-1">
                      <strong>Text:</strong> "{it.customText}"
                    </p>
                  )}
                </div>

                {it.artworkFile ? (
                  <button
                    onClick={() => handleDownloadArtwork(it.artworkFile.storageKey)}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 self-start md:self-center"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Artwork ({it.artworkFile.originalFilename})</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">No artwork attached</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-brand-50 border border-brand-200 rounded-2xl my-4 text-xs space-y-2">
          <h4 className="font-bold text-brand-900">Update Production Status</h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedFulfillment}
              onChange={(e) => setSelectedFulfillment(e.target.value)}
              className="p-2 rounded-xl border border-brand-300 bg-white font-bold text-xs flex-1"
            >
              <option value="PENDING">PENDING (New)</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="PRINTING">PRINTING (In Production)</option>
              <option value="READY_FOR_SHIPMENT">READY FOR SHIPMENT</option>
              <option value="SHIPPED">SHIPPED</option>
              <option value="COMPLETED">COMPLETED</option>
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
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs"
            >
              Update
            </button>
          </div>
        </div>

        {order.statusHistory?.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-200">
            <h5 className="font-bold text-slate-700 text-xs mb-2">Audit History Timeline</h5>
            <div className="space-y-1.5 max-h-32 overflow-y-auto text-[11px] text-slate-500 pr-2">
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

// Admin App & Login
writeFile('admin/src/App.tsx', `
import React, { useState, useEffect } from 'react';
import { AdminOrderDetailModal } from './components/AdminOrderDetailModal';
import { Lock, LogOut, Search, RefreshCw, Loader2, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('giftshop_admin_token'));
  const [email, setEmail] = useState('admin@giftshop.com.bd');
  const [password, setPassword] = useState('AdminPass123!');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [stats, setStats] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || 'Login failed');
      localStorage.setItem('giftshop_admin_token', json.data.token);
      setToken(json.data.token);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('giftshop_admin_token');
    setToken(null);
  };

  const fetchData = async () => {
    if (!token) return;
    try {
      const statsRes = await fetch('/api/admin/dashboard/stats', {
        headers: { 'Authorization': \`Bearer \${token}\` }
      });
      const statsJson = await statsRes.json();
      if (statsJson.success) setStats(statsJson.data.metrics);

      const query = new URLSearchParams();
      if (statusFilter) query.append('fulfillmentStatus', statusFilter);
      if (searchQuery.trim()) query.append('search', searchQuery.trim());

      const ordersRes = await fetch('/api/admin/orders?' + query.toString(), {
        headers: { 'Authorization': \`Bearer \${token}\` }
      });
      const ordersJson = await ordersRes.json();
      if (ordersJson.success) setOrders(ordersJson.data.items);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token, statusFilter, searchQuery]);

  // Login View
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold">
              G
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-lg leading-tight">Admin Operations</h2>
              <span className="text-xs text-slate-400">GiftShop BD Portal</span>
            </div>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Admin Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-sm shadow flex items-center justify-center gap-2"
            >
              {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign In to Dashboard</span>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center font-bold text-white">
              G
            </div>
            <div>
              <h1 className="font-black text-sm sm:text-base leading-tight">GiftShop BD — Operations</h1>
              <span className="text-[11px] text-slate-400">Standalone Admin System</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-bold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 block">Total Orders</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{stats.totalOrders}</span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-amber-500 block">Pending</span>
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

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {['', 'PENDING', 'CONFIRMED', 'PRINTING', 'READY_FOR_SHIPMENT', 'COMPLETED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={\`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap \${
                    statusFilter === st ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }\`}
                >
                  {st || 'ALL'}
                </button>
              ))}
              <button onClick={fetchData} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

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
                      No orders matching the filter
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/80">
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
export default App;
`);

writeFile('admin/src/main.tsx', `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`);

// ----------------------------------------------------
// 3. CLEAN UP CUSTOMER STOREFRONT (client/)
// ----------------------------------------------------
// Remove admin components from client to eliminate bundle leakage
if (fs.existsSync('client/src/components/admin')) {
  fs.rmSync('client/src/components/admin', { recursive: true, force: true });
  console.log('[Cleaned] Removed client/src/components/admin directory');
}

writeFile('client/src/components/Footer.tsx', `
import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export const Footer: React.FC = () => {
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
        © 2026 GiftShop BD. All rights reserved.
      </div>
    </footer>
  );
};
`);

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

// ----------------------------------------------------
// 4. GENERATE PRODUCTION DOCKER & NGINX STACK
// ----------------------------------------------------
writeFile('docker-compose.yml', `
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=5000
      - DATABASE_URL=file:/app/prisma/dev.db
      - SESSION_SECRET=\${SESSION_SECRET:-change_in_production_min_32_chars_bd_giftshop}
      - LOCAL_STORAGE_PATH=/app/storage/uploads
    volumes:
      - ./prisma:/app/prisma
      - ./storage/uploads:/app/storage/uploads
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./client/dist:/var/www/client:ro
      - ./admin/dist:/var/www/admin:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
`);

writeFile('Dockerfile.backend', `
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
COPY prisma ./prisma/
RUN npm install
RUN npm --prefix server install
COPY server ./server/
RUN npx prisma generate
RUN npm --prefix server run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/prisma ./prisma
RUN mkdir -p storage/uploads

EXPOSE 5000
CMD ["node", "server/dist/index.js"]
`);

writeFile('nginx/nginx.conf', `
# 1. Main Customer Store (yourdomain.com)
server {
    listen 80;
    server_name localhost _;

    # API Proxy to Node.js Backend
    location /api/ {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 25M;
    }

    # Admin Portal (Mapped to /admin-portal or via separate subdomain)
    location /admin/ {
        alias /var/www/admin/;
        try_files $uri $uri/ /admin/index.html;
    }

    # Customer Storefront (Static React SPA)
    location / {
        root /var/www/client;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
`);

// ----------------------------------------------------
// 5. INSTALL & COMPILE ALL 3 APPLICATIONS
// ----------------------------------------------------
console.log('--- Installing admin dependencies ---');
execSync('npm --prefix admin install', { stdio: 'inherit' });

console.log('--- Compiling Server TypeScript ---');
execSync('npm --prefix server run build', { stdio: 'inherit' });

console.log('--- Compiling Customer Storefront Build (client/) ---');
execSync('npm --prefix client run build', { stdio: 'inherit' });

console.log('--- Compiling Dedicated Admin Panel Build (admin/) ---');
execSync('npm --prefix admin run build', { stdio: 'inherit' });

console.log('==========================================================');
console.log(' SUCCESS: Admin Separated & Production Builds Complete!   ');
console.log('==========================================================');
