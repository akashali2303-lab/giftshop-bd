import React, { useState, useEffect } from 'react';
import { AdminOrderDetailModal } from './components/AdminOrderDetailModal';
import { Lock, LogOut, Search, RefreshCw, Loader2, AlertCircle } from 'lucide-react';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';

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

  const fetchData = async () => {
    if (!token) return;
    try {
      const statsRes = await fetch(API_BASE + '/api/admin/dashboard/stats', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const statsJson = await statsRes.json();
      if (statsJson.success) setStats(statsJson.data.metrics);

      const query = new URLSearchParams();
      if (statusFilter) query.append('fulfillmentStatus', statusFilter);
      if (searchQuery.trim()) query.append('search', searchQuery.trim());

      const ordersRes = await fetch(API_BASE + '/api/admin/orders?' + query.toString(), {
        headers: { 'Authorization': 'Bearer ' + token }
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
                  className={
                    'px-3 py-1.5 rounded-lg font-bold whitespace-nowrap ' +
                    (statusFilter === st ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                  }
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
                        <span className={
                          'px-2 py-0.5 rounded-full text-[10px] font-extrabold ' +
                          (ord.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-pink-100 text-pink-700')
                        }>
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
