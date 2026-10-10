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
