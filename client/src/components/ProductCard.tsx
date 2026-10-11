import React from 'react';
import { Product } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { Sparkles, Star, ShoppingBag, Eye } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onOpenCustomize: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenCustomize }) => {
  const { lang, t } = useLanguage();
  const priceTaka = Math.round(product.basePricePaisa / 100);
  const strikethroughPrice = Math.round(priceTaka * 1.25); // Simulated realistic original price

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col overflow-hidden group">
      {/* Product Image Area */}
      <div className="relative aspect-square bg-gradient-to-tr from-slate-100 to-indigo-50/30 flex items-center justify-center overflow-hidden">
        {/* Customization Badge */}
        {product.requiresArtworkUpload && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-600 text-white shadow-sm flex items-center gap-1 z-10">
            <Sparkles className="w-3 h-3" />
            {lang === 'bn' ? 'ছবি কাস্টমাইজেবল' : 'Photo Custom'}
          </span>
        )}

        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 group-hover:scale-105 transition-transform duration-500">
          <span className="text-5xl mb-2">🎁</span>
          <span className="text-[11px] font-bold text-slate-400">GiftShop BD</span>
        </div>

        {/* Hover Quick Action */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={() => onOpenCustomize(product)}
            className="p-3 bg-white text-slate-900 rounded-full shadow-lg hover:bg-indigo-600 hover:text-white transition-colors"
            title="Customize & View"
          >
            <Eye className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Product Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between text-left">
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-600 block mb-1">
            {lang === 'bn' ? product.category?.nameBn : product.category?.nameEn}
          </span>
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
            {lang === 'bn' ? product.nameBn : product.nameEn}
          </h3>

          {/* Star Ratings */}
          <div className="flex items-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            ))}
            <span className="text-[11px] text-slate-400 font-bold ml-1">(24)</span>
          </div>
        </div>

        {/* Price & Action */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-900">৳{priceTaka}</span>
              <span className="text-xs text-slate-400 line-through">৳{strikethroughPrice}</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold block">{lang === 'bn' ? 'স্টকে আছে' : 'In Stock'}</span>
          </div>

          <button
            onClick={() => onOpenCustomize(product)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{t('customizeAndBuy')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
