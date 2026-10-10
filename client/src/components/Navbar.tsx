import React from 'react';
import { ShoppingBag, Search, Globe, PackageSearch } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';

interface NavbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenTrack: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ searchQuery, setSearchQuery, onOpenTrack }) => {
  const { lang, setLang, t } = useLanguage();
  const { items, setIsCartOpen } = useCart();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-brand-500/20">
              G
            </div>
            <div>
              <span className="font-bold text-xl text-slate-900 tracking-tight block leading-tight">
                {t('brandTitle')}
              </span>
              <span className="text-xs text-slate-500 hidden sm:block">
                {t('tagline')}
              </span>
            </div>
          </div>

          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full bg-slate-100 border border-slate-200 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onOpenTrack}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border border-slate-300 hover:bg-slate-100 transition-colors text-slate-700"
              title="Track Order"
            >
              <PackageSearch className="w-3.5 h-3.5 text-brand-600" />
              <span className="hidden sm:inline">{lang === 'bn' ? 'অর্ডার ট্র্যাক' : 'Track Order'}</span>
            </button>

            <button
              onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border border-slate-300 hover:bg-slate-100 transition-colors text-slate-700"
            >
              <Globe className="w-3.5 h-3.5 text-brand-600" />
              <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-slate-800"
              aria-label="View Cart"
            >
              <ShoppingBag className="w-5 h-5 text-slate-700" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-600 text-white font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="pb-3 md:hidden">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full bg-slate-100 border border-slate-200 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          </div>
        </div>
      </div>
    </header>
  );
};
