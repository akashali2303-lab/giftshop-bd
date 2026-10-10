const fs = require('fs');
const { execSync } = require('child_process');

console.log('--- Fixing client/src/components/CheckoutModal.tsx ---');

const checkoutModalContent = `import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { X, CheckCircle, AlertCircle, Loader2, MessageCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

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

    const phoneRegex = /^01[3-9]\\d{8}$/;
    if (!phoneRegex.test(customerPhone.trim())) {
      setErrorMsg(
        lang === 'bn'
          ? 'সঠিক ১১ ডিজিটের ফোন নম্বর দিন (যেমন: 01712345678)'
          : 'Valid 11-digit Bangladesh phone number required (e.g. 017XXXXXXXX)'
      );
      return;
    }

    if (
      (paymentMethod === 'BKASH_MANUAL' || paymentMethod === 'NAGAD_MANUAL') &&
      (!senderPhone || !transactionReference)
    ) {
      setErrorMsg(
        lang === 'bn'
          ? 'অনুগ্রহ করে প্রেরক নম্বর এবং TrxID প্রদান করুন'
          : 'Sender phone and Transaction ID (TrxID) are required for MFS payment'
      );
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

      const res = await fetch(API_BASE + '/api/orders/checkout', {
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
    const lines = [
      '*New Order: ' + orderSuccess.orderNumber + '*',
      'Customer: ' + customerName,
      'Phone: ' + customerPhone,
      'Total: ৳' + Math.round(orderSuccess.totalAmountPaisa / 100),
      'Payment: ' + orderSuccess.paymentMethod,
      '',
      'Please confirm my gift order.'
    ];
    const message = encodeURIComponent(lines.join('\\n'));
    return 'https://wa.me/8801700000000?text=' + message;
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
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
            <h2 className="text-2xl font-black text-slate-900">
              {lang === 'bn' ? 'অর্ডার সফলভাবে গ্রহণ করা হয়েছে!' : 'Order Placed Successfully!'}
            </h2>
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 inline-block text-left w-full">
              <p className="text-xs text-slate-500">
                {lang === 'bn' ? 'অর্ডার রেফারেন্স নম্বর' : 'Order Reference Number'}
              </p>
              <p className="text-lg font-black text-brand-600 tracking-wider">
                {orderSuccess.orderNumber}
              </p>
              <div className="mt-2 text-xs text-slate-700 space-y-1 border-t border-slate-200 pt-2">
                <p>
                  <span className="font-bold">{lang === 'bn' ? 'মোট মূল্য:' : 'Total Amount:'}</span> ৳
                  {Math.round(orderSuccess.totalAmountPaisa / 100)}
                </p>
                <p>
                  <span className="font-bold">{lang === 'bn' ? 'পেমেন্ট পদ্ধতি:' : 'Payment Method:'}</span>{' '}
                  {orderSuccess.paymentMethod}
                </p>
                <p>
                  <span className="font-bold">{lang === 'bn' ? 'স্ট্যাটাস:' : 'Status:'}</span>{' '}
                  {orderSuccess.fulfillmentStatus}
                </p>
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
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">{t('checkout')}</h2>
            <p className="text-xs text-slate-500 mb-4">
              {lang === 'bn'
                ? 'ডেলিভারির জন্য আপনার সঠিক তথ্য প্রদান করুন'
                : 'Provide your delivery details to complete order'}
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === 'bn' ? 'আপনার নাম *' : 'Full Name *'}
                </label>
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
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === 'bn' ? 'মোবাইল নম্বর (১১ ডিজিট) *' : 'Mobile Number (11 digits) *'}
                </label>
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
                  <label className="block font-bold text-slate-700 mb-1">
                    {lang === 'bn' ? 'ডেলিভারি এলাকা *' : 'Delivery Area *'}
                  </label>
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
                  <label className="block font-bold text-slate-700 mb-1">
                    {lang === 'bn' ? 'পেমেন্ট মেথড *' : 'Payment Method *'}
                  </label>
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

              {(paymentMethod === 'BKASH_MANUAL' || paymentMethod === 'NAGAD_MANUAL') && (
                <div className="p-3 bg-pink-50 border border-pink-200 rounded-xl space-y-2">
                  <p className="text-[11px] font-bold text-pink-900">
                    {paymentMethod === 'BKASH_MANUAL' ? 'বিকাশ নম্বর:' : 'নগদ নম্বর:'}{' '}
                    <span className="underline">01700-000000</span> (Personal)
                  </p>
                  <p className="text-[10px] text-pink-700">
                    {lang === 'bn'
                      ? 'অনুগ্রহ করে মোট টাকা সেন্ড মানি করুন এবং নিচে আপনার নম্বর ও TrxID লিখুন।'
                      : 'Please Send Money and enter your sender number & TrxID below.'}
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
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === 'bn' ? 'বিস্তারিত ঠিকানা *' : 'Detailed Address *'}
                </label>
                <textarea
                  required
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder={lang === 'bn' ? 'বাসা/রোড নম্বর, এলাকা, থানা, জেলা...' : 'House/Road, Area, Thana, District...'}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                />
              </div>

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
                  <span>
                    {lang === 'bn'
                      ? 'অর্ডার নিশ্চিত করুন (৳' + Math.round(totalAmountPaisa / 100) + ')'
                      : 'Confirm Order (৳' + Math.round(totalAmountPaisa / 100) + ')'}
                  </span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
`;

fs.writeFileSync('client/src/components/CheckoutModal.tsx', checkoutModalContent.trim() + '\n', 'utf8');
console.log('[File Written] client/src/components/CheckoutModal.tsx');

console.log('--- Compiling Client Production Build ---');
execSync('npm --prefix client run build', { stdio: 'inherit' });

console.log('--- Compiling Admin Production Build ---');
execSync('npm --prefix admin run build', { stdio: 'inherit' });

console.log('==========================================================');
console.log(' ALL BUILDS PASSED! Ready to commit and push to GitHub.    ');
console.log('==========================================================');
