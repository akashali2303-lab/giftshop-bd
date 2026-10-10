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
