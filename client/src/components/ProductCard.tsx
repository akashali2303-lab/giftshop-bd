import React from 'react';
import { Product } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { Sparkles, Image as ImageIcon } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onOpenCustomize: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenCustomize }) => {
  const { lang, t } = useLanguage();
  const priceTaka = Math.round(product.basePricePaisa / 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden group">
      <div className="relative aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
        <div className="w-full h-full flex items-center justify-center text-slate-400 bg-gradient-to-tr from-slate-100 to-slate-200">
          <ImageIcon className="w-12 h-12 text-slate-300" />
        </div>
        {product.requiresArtworkUpload && (
          <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 text-brand-600 shadow backdrop-blur-sm flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {lang === 'bn' ? 'ছবি কাস্টমাইজেবল' : 'Photo Custom'}
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-semibold text-brand-600 block mb-1">
            {lang === 'bn' ? product.category?.nameBn : product.category?.nameEn}
          </span>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2">
            {lang === 'bn' ? product.nameBn : product.nameEn}
          </h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            {lang === 'bn' ? product.descriptionBn : product.descriptionEn}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">{lang === 'bn' ? 'মূল্য' : 'Price'}</span>
            <span className="text-lg font-extrabold text-slate-900">৳{priceTaka}</span>
          </div>
          <button
            onClick={() => onOpenCustomize(product)}
            className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            {t('customizeAndBuy')}
          </button>
        </div>
      </div>
    </div>
  );
};
