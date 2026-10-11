import React, { useState, useEffect } from 'react';
import { Sparkles, Truck, ShieldCheck, HeartHandshake, ArrowRight, Star, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const Hero: React.FC = () => {
  const { lang } = useLanguage();

  // Deal countdown timer simulation
  const [timeLeft, setTimeLeft] = useState({ hours: 8, minutes: 24, seconds: 36 });
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/60 via-white to-slate-50 border-b border-slate-200">
      {/* Top TrendMart Announcement Bar */}
      <div className="bg-slate-900 text-slate-300 py-2 px-4 text-center text-xs font-medium flex items-center justify-center gap-4 border-b border-slate-800">
        <span className="inline-flex items-center gap-1.5 text-amber-400 font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          {lang === 'bn' ? 'সীমিত সময়ের অফার:' : 'LIMITED TIME OFFER:'}
        </span>
        <span>
          {lang === 'bn' 
            ? '১,৫০০ টাকার অর্ডারে সারা দেশে ফ্রি ডেলিভারি!' 
            : 'Free shipping on orders over ৳1,500 nationwide!'}
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-100/80 text-indigo-700 shadow-sm border border-indigo-200/50">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>{lang === 'bn' ? 'প্রিমিয়াম পার্সোনালাইজড প্রিন্টিং' : 'Premium Personalized Printing & Gifts'}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
              {lang === 'bn' ? (
                <>
                  আপনার প্রিয় মুহূর্তগুলোকে রূপ দিন <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-rose-600">অনন্য উপহারে</span>
                </>
              ) : (
                <>
                  Shop More, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-rose-600">Gift Better</span>
                </>
              )}
            </h1>

            <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
              {lang === 'bn'
                ? 'কাস্টম চকলেট র‍্যাপার, ঈদ সালামি কার্ড, ফটো অ্যালবাম, ফ্রেম ও বিজনেস কিউআর স্ট্যান্ড — নিখুঁত প্রিন্টিং ও হোম ডেলিভারি সারা বাংলাদেশে।'
                : 'Custom photo chocolate wrappers, memory albums, laminated frames, and local business QR stands crafted with precision and delivered across Bangladesh.'}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="#catalog-section"
                className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5"
              >
                <span>{lang === 'bn' ? 'কালেকশন দেখুন' : 'Explore Collection'}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/8801710318776?text=Hello%20GiftShop%20BD%2C%20I%20want%20to%20order"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-300 shadow-sm transition-all flex items-center gap-2"
              >
                <span>{lang === 'bn' ? 'হোয়াটসঅ্যাপে অর্ডার' : 'WhatsApp Order'}</span>
              </a>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200/80 max-w-lg">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                  ★
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 text-xs sm:text-sm leading-none">20K+</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{lang === 'bn' ? 'সন্তুষ্ট গ্রাহক' : 'Happy Clients'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                  ✓
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 text-xs sm:text-sm leading-none">100%</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{lang === 'bn' ? 'নিরাপদ পেমেন্ট' : 'Secure MFS'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 font-bold text-xs">
                  COD
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 text-xs sm:text-sm leading-none">{lang === 'bn' ? 'ক্যাশ অন' : 'Cash On'}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{lang === 'bn' ? 'ডেলিভারি' : 'Delivery'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right TrendMart 3D Hero Visual Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md bg-gradient-to-tr from-indigo-100 via-rose-50 to-amber-50 rounded-3xl p-6 border border-slate-200/80 shadow-2xl">
              {/* Up to 50% OFF Badge */}
              <div className="absolute -top-4 -right-3 bg-gradient-to-br from-rose-500 to-indigo-600 text-white rounded-2xl px-4 py-2.5 shadow-lg shadow-rose-500/30 flex flex-col items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider">{lang === 'bn' ? 'সর্বোচ্চ' : 'UP TO'}</span>
                <span className="text-lg font-black leading-none">50% OFF</span>
              </div>

              {/* Visual Showcase Graphic */}
              <div className="aspect-square rounded-2xl bg-white/90 backdrop-blur-sm border border-white/60 shadow-inner flex flex-col items-center justify-center p-6 text-center">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-rose-500 flex items-center justify-center text-white text-4xl shadow-lg shadow-indigo-500/20 mb-4 animate-bounce">
                  🎁
                </div>
                <h3 className="font-black text-slate-900 text-lg">
                  {lang === 'bn' ? 'কাস্টম গিফট কালেকশন' : 'Custom Personalized Prints'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  {lang === 'bn' ? 'চকলেট র‍্যাপার, অ্যালবাম, ঈদ কার্ড ও ফটো ফ্রেম' : 'Photo Chocolate Wrappers, Albums, Greeting Cards & Frames'}
                </p>

                {/* Micro Rating */}
                <div className="flex items-center gap-1 mt-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-xs font-bold text-slate-700 ml-1">4.9 (1.8k reviews)</span>
                </div>
              </div>

              {/* Deal of the Day Box */}
              <div className="mt-4 bg-white/95 rounded-2xl p-3.5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-500 animate-spin" />
                  <div>
                    <p className="text-[10px] font-bold uppercase text-rose-500 tracking-wider">
                      {lang === 'bn' ? 'আজকের স্পেশাল ডিল' : 'DEAL OF THE DAY'}
                    </p>
                    <p className="text-xs font-extrabold text-slate-800">
                      {lang === 'bn' ? 'ঈদ স্পেশাল প্যাকেজ' : 'Special Gift Combo'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 font-mono font-black text-xs text-slate-900">
                  <span className="bg-slate-100 px-2 py-1 rounded-md">{String(timeLeft.hours).padStart(2, '0')}h</span>
                  <span>:</span>
                  <span className="bg-slate-100 px-2 py-1 rounded-md">{String(timeLeft.minutes).padStart(2, '0')}m</span>
                  <span>:</span>
                  <span className="bg-slate-100 px-2 py-1 rounded-md">{String(timeLeft.seconds).padStart(2, '0')}s</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 4-Item ShopEase Value Bar */}
      <div className="bg-white border-t border-slate-200/80 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">{lang === 'bn' ? 'সারা দেশে ডেলিভারি' : 'Fast Delivery'}</p>
              <p className="text-[11px] text-slate-500">{lang === 'bn' ? 'ঢাকা ও বিভাগীয় শহর' : 'Dhaka & Nationwide'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">{lang === 'bn' ? 'বিকাশ ও নগদ গ্রহণযোগ্য' : 'Secure Payment'}</p>
              <p className="text-[11px] text-slate-500">{lang === 'bn' ? 'সহজ মোবাইল পেমেন্ট' : '100% verified checkout'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">{lang === 'bn' ? 'ক্যাশ অন ডেলিভারি' : 'Cash On Delivery'}</p>
              <p className="text-[11px] text-slate-500">{lang === 'bn' ? 'পণ্য দেখে টাকা দিন' : 'Pay after delivery'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">{lang === 'bn' ? 'উচ্চমানের প্রিন্টিং' : 'Premium Quality'}</p>
              <p className="text-[11px] text-slate-500">{lang === 'bn' ? 'এইচডি ফিনিশিং' : 'Crisp HD print finish'}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
