import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Phone, Mail, MapPin, Send } from 'lucide-react';

export const Footer: React.FC = () => {
  const { lang } = useLanguage();

  return (
    <footer className="bg-slate-950 text-slate-400 pt-16 pb-8 border-t border-slate-900 mt-20 text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Newsletter Signup Row */}
        <div className="bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-500/20 rounded-3xl p-6 sm:p-8 mb-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-left">
            <h4 className="text-lg sm:text-xl font-black text-white">
              {lang === 'bn' ? 'নতুন অফার ও ঈদ ডিসকাউন্ট পান' : 'Get Exclusive Offers & Updates'}
            </h4>
            <p className="text-xs text-indigo-200 mt-1">
              {lang === 'bn' ? 'সাবস্ক্রাইব করুন এবং পরবর্তী কাস্টম অর্ডারে ১০% ছাড় পান।' : 'Sign up to receive 10% off your next personalized printing order.'}
            </p>
          </div>
          <div className="flex w-full md:w-auto max-w-md gap-2">
            <input
              type="email"
              placeholder={lang === 'bn' ? 'আপনার ইমেইল অ্যাড্রেস...' : 'Enter your email...'}
              className="bg-slate-900 border border-slate-700 text-white text-xs px-4 py-3 rounded-xl flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors">
              <span>Subscribe</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Column Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-left pb-10 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                G
              </div>
              <span className="text-white font-black text-lg">GiftShop BD</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'bn'
                ? 'ব্যক্তিগত ও বাণিজ্যিক প্রিন্টিং, চকলেট র‍্যাপার, ঈদ সালামি কার্ড ও কাস্টমাইজড গিফট এর সবচেয়ে বিশ্বস্ত প্ল্যাটফর্ম।'
                : 'Your trusted partner for personalized gifts, photo chocolate wrappers, cards, and business prints across Bangladesh.'}
            </p>
          </div>

          <div>
            <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              {lang === 'bn' ? 'জনপ্রিয় কালেকশন' : 'POPULAR CATEGORIES'}
            </h5>
            <ul className="space-y-2 text-xs">
              <li><a href="#catalog-section" className="hover:text-white transition-colors">Eid Salami Cards (ঈদ কার্ড)</a></li>
              <li><a href="#catalog-section" className="hover:text-white transition-colors">Photo Chocolate Wrappers</a></li>
              <li><a href="#catalog-section" className="hover:text-white transition-colors">Kids' Drawing Books</a></li>
              <li><a href="#catalog-section" className="hover:text-white transition-colors">Local Business QR Stands</a></li>
              <li><a href="#catalog-section" className="hover:text-white transition-colors">Photo Albums & Frames</a></li>
            </ul>
          </div>

          <div>
            <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              {lang === 'bn' ? 'পেমেন্ট ও ডেলিভারি' : 'PAYMENT & TRUST'}
            </h5>
            <p className="text-xs text-slate-400 mb-3">
              {lang === 'bn' ? 'আমরা বিকাশ, নগদ ও ক্যাশ অন ডেলিভারি গ্রহণ করি।' : 'We support bKash, Nagad, and Cash on Delivery.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-pink-950/60 text-pink-400 font-bold text-[11px] border border-pink-800/40">bKash</span>
              <span className="px-2.5 py-1 rounded-lg bg-orange-950/60 text-orange-400 font-bold text-[11px] border border-orange-800/40">Nagad</span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-400 font-bold text-[11px] border border-emerald-800/40">COD</span>
            </div>
          </div>

          <div>
            <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              {lang === 'bn' ? 'যোগাযোগ ও সাপোর্ট' : 'CONTACT & SUPPORT'}
            </h5>
            <div className="space-y-2 text-xs text-slate-400">
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <a href="https://wa.me/8801710318776" target="_blank" rel="noopener noreferrer" className="hover:text-white font-mono">
                  +880 1710-318776
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>support@giftshop.com.bd</span>
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>Dhaka, Bangladesh</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Admin Shortcut */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <span>© 2026 GiftShop BD. All rights reserved.</span>
          <a
            href="/admin"
            className="hover:text-slate-300 transition-colors text-[11px] underline underline-offset-4"
          >
            Admin Management Portal (/admin)
          </a>
        </div>
      </div>
    </footer>
  );
};
