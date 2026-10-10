import React from 'react';
import { Category } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface CategoryGridProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (slug: string | null) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  selectedCategory,
  onSelectCategory
}) => {
  const { lang, t } = useLanguage();

  return (
    <div className="my-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">{t('categories')}</h2>
        {selectedCategory && (
          <button
            onClick={() => onSelectCategory(null)}
            className="text-xs font-semibold text-brand-600 hover:underline"
          >
            {t('all')}
          </button>
        )}
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => onSelectCategory(null)}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedCategory === null
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          {t('all')}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.slug)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === cat.slug
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {lang === 'bn' ? cat.nameBn : cat.nameEn}
          </button>
        ))}
      </div>
    </div>
  );
};
