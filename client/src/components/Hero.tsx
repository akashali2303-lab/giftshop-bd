import React from 'react';
import { Sparkles, Truck, ShieldCheck, HeartHandshake } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const Hero: React.FC = () => {
  const { lang, t } = useLanguage();

  return (
    <section className="bg-gradient-to-b from-brand-50 via-white to-slate-50 border-b border-slate-200 py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-brand-100 text-brand-700 mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          {lang === 'bn' ? 'বিশেষ ঈদ ও অনুষ্ঠান স্পেশাল উপহার' : 'Special Events & Personalized Printing'}
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight max-w-3xl mx-auto leading-tight">
          {lang === 'bn'
            ? 'আপনার প্রিয় মুহূর্তগুলোকে রূপ দিন অনন্য উপহারে'
            : 'Bring Your Memories to Life with Custom Printing'}
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
          {lang === 'bn'
            ? 'কাস্টম চকলেট র‍্যাপার, ঈদ সালামি কার্ড, ফটো অ্যালবাম, ফ্রেম ও বিজনেস কিউআর স্ট্যান্ড - তৈরি ও হোম ডেলিভারি সারা বাংলাদেশে।'
            : 'Custom photo chocolate wrappers, photo albums, frames, and business menus delivered nationwide.'}
        </p>

        {/* Value Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-3xl mx-auto text-left">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <Truck className="w-6 h-6 text-brand-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-800">{t('fastDelivery')}</p>
              <p className="text-xs text-slate-500">{lang === 'bn' ? 'হোম ডেলিভারি সেবা' : 'Nationwide Service'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <ShieldCheck className="w-6 h-6 text-brand-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-800">{t('securePayment')}</p>
              <p className="text-xs text-slate-500">{lang === 'bn' ? 'সহজ ও নিরাপদ লেনদেন' : 'Mobile Payments'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <HeartHandshake className="w-6 h-6 text-brand-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-800">{t('codAvailable')}</p>
              <p className="text-xs text-slate-500">{lang === 'bn' ? 'পণ্য হাতে পেয়ে মূল্য দিন' : 'Pay Upon Delivery'}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
