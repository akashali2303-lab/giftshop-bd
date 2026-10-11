import React from 'react';
import { Category } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface CategoryGridProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (slug: string | null) => void;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  'eid-salami-cards': '💌',
  'custom-photo-chocolate-wrappers': '🍫',
  'kids-drawing-books': '🎨',
  'qr-stands-and-menus': '📱',
  'spiral-screw-photo-albums': '📖',
  'laminated-budget-frames': '🖼️',
  'wish-cards-gift-tags': '🏷️'
};

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  selectedCategory,
  onSelectCategory
}) => {
  const { lang, t } = useLanguage();

  return (
    <section className="my-10">
      <div className="text-center mb-6">
        <span className="text-xs font-black tracking-widest uppercase text-indigo-600 block mb-1">
          {lang === 'bn' ? '•• এক্সপ্লোর কালেকশন ••' : '•• BROWSE COLLECTIONS ••'}
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          {t('categories')}
        </h2>
      </div>

      {/* Circular Cards Showcase (Inspired by TrendMart Shop By Category) */}
      <div className="flex items-center gap-4 overflow-x-auto pb-4 pt-2 scrollbar-none justify-start lg:justify-center">
        <button
          onClick={() => onSelectCategory(null)}
          className="flex flex-col items-center gap-2 flex-shrink-0 group focus:outline-none"
        >
          <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl transition-all shadow-sm border-2 ${
            selectedCategory === null
              ? 'border-indigo-600 bg-indigo-50 shadow-indigo-500/20 scale-105'
              : 'border-slate-200 bg-white group-hover:border-indigo-300 group-hover:bg-indigo-50/50'
          }`}>
            ✨
          </div>
          <span className={`text-xs font-bold ${
            selectedCategory === null ? 'text-indigo-600' : 'text-slate-700'
          }`}>
            {t('all')}
          </span>
        </button>

        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.slug;
          const emoji = CATEGORY_EMOJIS[cat.slug] || '🎁';
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.slug)}
              className="flex flex-col items-center gap-2 flex-shrink-0 group focus:outline-none"
            >
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-3xl transition-all shadow-sm border-2 ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50 shadow-indigo-500/20 scale-105'
                  : 'border-slate-200 bg-white group-hover:border-indigo-300 group-hover:bg-indigo-50/50'
              }`}>
                {emoji}
              </div>
              <span className={`text-xs font-bold max-w-[90px] text-center leading-tight truncate ${
                isSelected ? 'text-indigo-600 font-extrabold' : 'text-slate-700'
              }`}>
                {lang === 'bn' ? cat.nameBn : cat.nameEn}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
