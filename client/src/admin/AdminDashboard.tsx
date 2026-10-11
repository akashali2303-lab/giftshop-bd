import React, { useState, useEffect } from 'react';
import { AdminOrderDetailModal } from './AdminOrderDetailModal';
import { AdminProductModal } from './AdminProductModal';
import { 
  LayoutDashboard, ShoppingBag, Package, RefreshCw, 
  Search, Plus, Trash2, ArrowUpRight, LogOut, CheckCircle2, Clock
} from 'lucide-react';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';

interface Props {
  onBackToStore: () => void;
}

export const AdminDashboard: React.FC<Props> = ({ onBackToStore }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('giftshop_admin_token'));
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products'>('overview');

  // Stats & Orders
  const [stats, setStats] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  // Products
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  // Login credentials state
  const [email, setEmail] = useState('admin@giftshop.com.bd');
  const [password, setPassword] = useState('AdminPass123!');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch(API_BASE + '/api/admin/auth/login', {
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

  const fetchStatsAndOrders = async () => {
    if (!token) return;
    try {
      const statsRes = await fetch(API_BASE + '/api/admin/dashboard/stats', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const statsJson = await statsRes.json();
      if (statsJson.success) setStats(statsJson.data.metrics);

      const query = new URLSearchParams();
      if (statusFilter) query.append('fulfillmentStatus', statusFilter);
      if (orderSearch.trim()) query.append('search', orderSearch.trim());

      const ordersRes = await fetch(API_BASE + '/api/admin/orders?' + query.toString(), {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const ordersJson = await ordersRes.json();
      if (ordersJson.success) setOrders(ordersJson.data.items);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProductsAndCategories = async () => {
    if (!token) return;
    try {
      const pRes = await fetch(API_BASE + '/api/products/admin/all', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const pJson = await pRes.json();
      if (pJson.success) setProducts(pJson.data.items);

      const cRes = await fetch(API_BASE + '/api/categories');
      const cJson = await cRes.json();
      if (cJson.success) setCategories(cJson.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveProduct = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}"? (It will be deactivated so old orders remain safe)`)) return;
    try {
      await fetch(API_BASE + '/api/products/admin/' + id, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      fetchProductsAndCategories();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStatsAndOrders();
      fetchProductsAndCategories();
    }
  }, [token, statusFilter, orderSearch]);

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl text-left">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl">
              G
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-lg leading-tight">GiftShop BD</h2>
              <span className="text-xs text-slate-400">Admin Operations Portal</span>
            </div>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Admin Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow flex items-center justify-center gap-2"
            >
              Sign In to Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans text-left">
      {/* Kapee-Inspired Left Navigation Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between hidden md:flex sticky top-0 h-screen p-5">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black">
              G
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-sm leading-tight">GiftShop BD</h2>
              <span className="text-[11px] text-slate-400">Printing Management</span>
            </div>
          </div>

          <nav className="space-y-1.5 text-xs font-bold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                activeTab === 'orders' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Orders ({orders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                activeTab === 'products' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Product Catalog ({products.length})</span>
            </button>
          </nav>
        </div>

        <div className="space-y-2 pt-6 border-t border-slate-100">
          <button
            onClick={onBackToStore}
            className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            ← Back to Store
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200/80 px-6 h-16 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-black text-slate-900 capitalize">
              {activeTab === 'overview' ? 'Analytical Overview' : activeTab}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-slate-100 text-slate-600 font-bold px-3 py-1.5 rounded-full">
              admin@giftshop.com.bd
            </span>
            <button onClick={fetchStatsAndOrders} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="p-6 space-y-6 flex-1 max-w-7xl w-full">
          {/* TAB 1: OVERVIEW (Finexy/Kapee Style Metric Cards + Chart) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                    <span className="text-xs font-bold text-slate-400 block">Total Revenue</span>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-2xl font-black text-slate-900">৳{Math.round(stats.totalRevenuePaisa / 100)}</span>
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                        <ArrowUpRight className="w-3.5 h-3.5" /> +14%
                      </span>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                    <span className="text-xs font-bold text-slate-400 block">Total Orders</span>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-2xl font-black text-slate-900">{stats.totalOrders}</span>
                      <span className="text-xs font-bold text-indigo-600">Active</span>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                    <span className="text-xs font-bold text-amber-500 block">Pending Review</span>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-2xl font-black text-amber-600">{stats.pendingOrders}</span>
                      <span className="text-[11px] font-bold text-slate-400">Needs Action</span>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                    <span className="text-xs font-bold text-blue-500 block">In Production (Printing)</span>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-2xl font-black text-blue-600">{stats.printingOrders}</span>
                      <span className="text-[11px] font-bold text-slate-400">Machine Run</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Finexy Simulated Revenue Activity Bar */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">Revenue & Production Volume</h3>
                    <p className="text-xs text-slate-400">Monthly printing sales and fulfillment stats</p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-slate-100 rounded-lg text-slate-600">2026 Live</span>
                </div>
                <div className="h-44 flex items-end gap-3 pt-6 border-t border-slate-100 px-2 justify-between">
                  {[
                    { month: 'Jan', h: '40%' },
                    { month: 'Feb', h: '60%' },
                    { month: 'Mar', h: '85%' },
                    { month: 'Apr', h: '55%' },
                    { month: 'May', h: '95%' },
                    { month: 'Jun', h: '70%' },
                    { month: 'Jul', h: '80%' },
                    { month: 'Aug', h: '65%' },
                    { month: 'Sep', h: '90%' },
                    { month: 'Oct', h: '100%' }
                  ].map((bar, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                      <div className="w-full max-w-[32px] bg-indigo-600 hover:bg-indigo-500 transition-all rounded-t-xl" style={{ height: bar.h }}></div>
                      <span className="text-[10px] font-bold text-slate-400">{bar.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORDERS MANAGEMENT */}
          {(activeTab === 'orders' || activeTab === 'overview') && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <input
                    type="text"
                    placeholder="Search Order #, Phone, Name..."
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                  {['', 'PENDING', 'CONFIRMED', 'PRINTING', 'READY_FOR_SHIPMENT', 'COMPLETED', 'CANCELLED'].map(st => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap ${
                        statusFilter === st ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st || 'ALL'}
                    </button>
                  ))}
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
                          No orders found matching the filter
                        </td>
                      </tr>
                    ) : (
                      orders.map(ord => (
                        <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">{ord.orderNumber}</td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 block">{ord.customerName}</span>
                            <span className="text-[11px] text-slate-400">{ord.customerPhone}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-slate-700 font-semibold">{ord.items?.length || 0} Item(s)</span>
                            {ord.items?.some((i: any) => i.artworkFile) && (
                              <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] bg-rose-50 text-rose-600 font-bold">Artwork</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900">৳{Math.round(ord.totalAmountPaisa / 100)}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                              ord.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-pink-100 text-pink-700'
                            }`}>
                              {ord.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
                              {ord.fulfillmentStatus}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => setSelectedOrder(ord)}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs"
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
          )}

          {/* TAB 3: PRODUCT CATALOG (ADD & REMOVE PRODUCTS) */}
          {activeTab === 'products' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-slate-900 text-base">Store Catalog & Inventory</h3>
                  <p className="text-xs text-slate-400">Add new printing products or remove existing items</p>
                </div>
                <button
                  onClick={() => setIsAddProductOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Product</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {products.map(p => (
                  <div key={p.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {p.category?.nameEn}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <h4 className="font-black text-slate-900 text-sm mt-2">{p.nameEn}</h4>
                      <p className="text-xs text-slate-500 font-bold">{p.nameBn}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-base font-black text-slate-900">৳{Math.round(p.basePricePaisa / 100)}</span>
                      <button
                        onClick={() => handleRemoveProduct(p.id, p.nameEn)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      <AdminOrderDetailModal
        order={selectedOrder}
        token={token}
        onClose={() => setSelectedOrder(null)}
        onOrderUpdated={() => {
          setSelectedOrder(null);
          fetchStatsAndOrders();
        }}
      />

      <AdminProductModal
        isOpen={isAddProductOpen}
        token={token}
        categories={categories}
        onClose={() => setIsAddProductOpen(false)}
        onProductCreated={fetchProductsAndCategories}
      />
    </div>
  );
};
export default AdminDashboard;
