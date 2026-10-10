const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
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

      const res = await fetch(`${API_BASE}/api/orders/track/${encodeURIComponent(orderNumber.trim())}`);
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
