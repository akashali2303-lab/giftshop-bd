const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('==========================================================');
console.log(' Starting Phase 5: Customer Frontend Setup                ');
console.log('==========================================================');

function writeFile(relativePath, content) {
  const fullPath = path.resolve(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log(`[File Written] ${relativePath}`);
}

// 1. client/package.json
writeFile('client/package.json', `
{
  "name": "giftshop-bd-client",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^0.344.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3",
    "vite": "^5.1.6"
  }
}
`);

// 2. client/vite.config.ts
writeFile('client/vite.config.ts', `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
`);

// 3. client/postcss.config.js & tailwind.config.js
writeFile('client/postcss.config.js', `
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`);

writeFile('client/tailwind.config.js', `
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf4f4',
          100: '#fbe8e8',
          500: '#e11d48',
          600: '#be123c',
          700: '#9f1239',
        }
      }
    },
  },
  plugins: [],
}
`);

// 4. client/tsconfig.json
writeFile('client/tsconfig.json', `
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
`);

// 5. client/index.html
writeFile('client/index.html', `
<!doctype html>
<html lang="bn">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23be123c'><path d='M20 12v10H4V12H2V10h6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6h6v2h-2zM6 14v6h12v-6H6zm4-4h4V4h-4v6z'/></svg>" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GiftShop BD | অনলাইন প্রিন্টিং ও পার্সোনালাইজড গিফট শপ</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body class="bg-slate-50 text-slate-800 antialiased font-['Hind_Siliguri',sans-serif]">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`);

// 6. client/src/index.css
writeFile('client/src/index.css', `
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  min-height: 100vh;
}
`);

// 7. client/src/types/index.ts
writeFile('client/src/types/index.ts', `
export interface Category {
  id: string;
  nameEn: string;
  nameBn: string;
  slug: string;
  description?: string;
  displayOrder: number;
}

export interface Product {
  id: string;
  categoryId: string;
  nameEn: string;
  nameBn: string;
  slug: string;
  descriptionEn?: string;
  descriptionBn?: string;
  basePricePaisa: number;
  featuredImage: string;
  requiresCustomText: boolean;
  requiresArtworkUpload: boolean;
  customizationPromptEn?: string;
  customizationPromptBn?: string;
  category?: Category;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  customText?: string;
  artworkFile?: {
    storageKey: string;
    originalFilename: string;
    previewUrl?: string;
  };
}
`);

// 8. client/src/context/LanguageContext.tsx
writeFile('client/src/context/LanguageContext.tsx', `
import React, { createContext, useContext, useState, useEffect } from 'react';

type Lang = 'bn' | 'en';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Lang, string>> = {
  brandTitle: { en: 'GiftShop BD', bn: 'গিফট শপ বিডি' },
  tagline: { en: 'Custom Printing & Personalized Gifts', bn: 'অনলাইন প্রিন্টিং ও পার্সোনালাইজড গিফট' },
  home: { en: 'Home', bn: 'হোম' },
  categories: { en: 'Categories', bn: 'ক্যাটাগরি' },
  popularProducts: { en: 'Popular Products', bn: 'জনপ্রিয় উপহার ও প্রিন্ট' },
  searchPlaceholder: { en: 'Search gifts (e.g. wrapper, album, frame)...', bn: 'উপহার খুঁজুন (যেমন: র‍্যাপার, অ্যালবাম, ফ্রেম)...' },
  all: { en: 'All Categories', bn: 'সকল ক্যাটাগরি' },
  customizeAndBuy: { en: 'Customize & Order', bn: 'কাস্টমাইজ ও অর্ডার' },
  cart: { en: 'Cart', bn: 'কার্ট' },
  emptyCart: { en: 'Your cart is empty', bn: 'আপনার কার্ট খালি' },
  subtotal: { en: 'Subtotal', bn: 'উপমোট' },
  deliveryFee: { en: 'Delivery Fee (Dhaka / Nationwide)', bn: 'ডেলিভারি চার্জ' },
  total: { en: 'Total', bn: 'সর্বমোট' },
  checkout: { en: 'Proceed to Checkout', bn: 'অর্ডার সম্পন্ন করুন' },
  customTextLabel: { en: 'Custom Text / Message to Print', bn: 'প্রিন্ট করার জন্য আপনার লেখা বা নাম' },
  uploadLabel: { en: 'Upload Photo or File (JPG, PNG, PDF up to 20MB)', bn: 'ছবি বা ফাইল আপলোড করুন (সর্বোচ্চ ২০ মেগাবাইট)' },
  uploading: { en: 'Uploading file securely...', bn: 'ফাইল আপলোড হচ্ছে...' },
  addToCart: { en: 'Add to Cart', bn: 'কার্টে যোগ করুন' },
  whatsappSupport: { en: 'Order via WhatsApp', bn: 'হোয়াটসঅ্যাপে অর্ডার' },
  codAvailable: { en: 'Cash on Delivery Available', bn: 'ক্যাশ অন ডেলিভারি সুবিধা' },
  securePayment: { en: 'bKash & Nagad Accepted', bn: 'বিকাশ ও নগদ পেমেন্ট গ্রহণযোগ্য' },
  fastDelivery: { en: 'Fast Delivery Nationwide', bn: 'সারা দেশে দ্রুত ডেলিভারি' },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('giftshop_lang') as Lang) || 'bn';
  });

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('giftshop_lang', newLang);
  };

  const t = (key: string): string => {
    if (translations[key] && translations[key][lang]) {
      return translations[key][lang];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
`);

// 9. client/src/context/CartContext.tsx
writeFile('client/src/context/CartContext.tsx', `
import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product } from '../types';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity: number, customText?: string, artworkFile?: CartItem['artworkFile']) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  subtotalPaisa: number;
  deliveryFeePaisa: number;
  totalPaisa: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('giftshop_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('giftshop_cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (
    product: Product,
    quantity: number,
    customText?: string,
    artworkFile?: CartItem['artworkFile']
  ) => {
    const newItem: CartItem = {
      id: 'cart_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      product,
      quantity,
      customText,
      artworkFile
    };
    setItems((prev) => [...prev, newItem]);
    setIsCartOpen(true);
  };

  const removeFromCart = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.id === itemId) {
            const newQ = i.quantity + delta;
            return newQ > 0 ? { ...i, quantity: newQ } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => setItems([]);

  const subtotalPaisa = items.reduce((acc, i) => acc + i.product.basePricePaisa * i.quantity, 0);
  const deliveryFeePaisa = items.length > 0 ? 8000 : 0; // ৳80 delivery charge standard
  const totalPaisa = subtotalPaisa + deliveryFeePaisa;

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        subtotalPaisa,
        deliveryFeePaisa,
        totalPaisa,
        isCartOpen,
        setIsCartOpen
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
`);

// 10. client/src/services/api.ts
writeFile('client/src/services/api.ts', `
import { Category, Product } from '../types';

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch('/api/categories');
  const json = await res.json();
  return json.success ? json.data : [];
}

export async function fetchProducts(params: { category?: string; search?: string } = {}): Promise<Product[]> {
  const query = new URLSearchParams();
  if (params.category) query.append('category', params.category);
  if (params.search) query.append('search', params.search);

  const res = await fetch('/api/products?' + query.toString());
  const json = await res.json();
  return json.success && json.data.items ? json.data.items : [];
}

export async function uploadArtworkFile(file: File): Promise<{ storageKey: string; originalFilename: string }> {
  const formData = new FormData();
  formData.append('artwork', file);

  const res = await fetch('/api/uploads/artwork', {
    method: 'POST',
    body: formData
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Failed to upload artwork');
  }

  return json.data;
}
`);

// 11. client/src/components/Navbar.tsx
writeFile('client/src/components/Navbar.tsx', `
import React from 'react';
import { ShoppingBag, Search, Globe, PhoneCall } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';

interface NavbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ searchQuery, setSearchQuery }) => {
  const { lang, setLang, t } = useLanguage();
  const { items, setIsCartOpen } = useCart();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
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

          {/* Search bar */}
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

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <button
              onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border border-slate-300 hover:bg-slate-100 transition-colors text-slate-700"
            >
              <Globe className="w-3.5 h-3.5 text-brand-600" />
              <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
            </button>

            {/* Cart Button */}
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

        {/* Mobile Search Bar */}
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
`);

// 12. client/src/components/Hero.tsx
writeFile('client/src/components/Hero.tsx', `
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
`);

// 13. client/src/components/CategoryGrid.tsx
writeFile('client/src/components/CategoryGrid.tsx', `
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
          className={\`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors \${
            selectedCategory === null
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
          }\`}
        >
          {t('all')}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.slug)}
            className={\`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors \${
              selectedCategory === cat.slug
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }\`}
          >
            {lang === 'bn' ? cat.nameBn : cat.nameEn}
          </button>
        ))}
      </div>
    </div>
  );
};
`);

// 14. client/src/components/ProductCard.tsx
writeFile('client/src/components/ProductCard.tsx', `
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
`);

// 15. client/src/components/ProductCustomizationModal.tsx
writeFile('client/src/components/ProductCustomizationModal.tsx', `
import React, { useState } from 'react';
import { Product, CartItem } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { uploadArtworkFile } from '../services/api';
import { X, Upload, CheckCircle2, AlertCircle, Loader2, FileText } from 'lucide-react';

interface ModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductCustomizationModal: React.FC<ModalProps> = ({ product, onClose }) => {
  const { lang, t } = useLanguage();
  const { addToCart } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [customText, setCustomText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadedArtwork, setUploadedArtwork] = useState<CartItem['artworkFile'] | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!product) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 20971520) {
      setErrorMsg(lang === 'bn' ? 'ফাইলের আকার ২০ মেগাবাইটের বেশি হতে পারবে না' : 'File must be under 20MB');
      return;
    }

    setFile(selected);
    setErrorMsg(null);

    if (selected.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(selected));
    } else {
      setFilePreview(null);
    }

    try {
      setIsUploading(true);
      const res = await uploadArtworkFile(selected);
      setUploadedArtwork({
        storageKey: res.storageKey,
        originalFilename: res.originalFilename,
        previewUrl: selected.type.startsWith('image/') ? URL.createObjectURL(selected) : undefined
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = () => {
    if (product.requiresCustomText && !customText.trim()) {
      setErrorMsg(lang === 'bn' ? 'অনুগ্রহ করে কাস্টম লেখা প্রদান করুন' : 'Custom text is required');
      return;
    }
    if (product.requiresArtworkUpload && !uploadedArtwork) {
      setErrorMsg(lang === 'bn' ? 'অনুগ্রহ করে ফাইল বা ছবি আপলোড করুন' : 'Artwork upload is required');
      return;
    }

    addToCart(product, quantity, customText.trim() || undefined, uploadedArtwork);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-500"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-slate-900 pr-8">
          {lang === 'bn' ? product.nameBn : product.nameEn}
        </h2>
        <p className="text-sm font-extrabold text-brand-600 mt-1">
          ৳{Math.round(product.basePricePaisa / 100)} / {lang === 'bn' ? 'পিস' : 'item'}
        </p>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mt-5 space-y-4">
          {/* Custom Text Field */}
          {product.requiresCustomText && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'bn' ? product.customizationPromptBn : product.customizationPromptEn || t('customTextLabel')}
              </label>
              <textarea
                rows={2}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder={lang === 'bn' ? 'কার্ডে বা গিফটে যে নাম/বার্তা প্রিন্ট হবে লিখুন...' : 'Enter the text/name to print...'}
                className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}

          {/* Artwork Upload Field */}
          {product.requiresArtworkUpload && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('uploadLabel')}
              </label>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:bg-slate-50 transition-colors">
                {filePreview ? (
                  <div className="relative inline-block">
                    <img src={filePreview} alt="Preview" className="w-24 h-24 object-cover rounded-xl shadow-sm border border-slate-200 mx-auto" />
                    <button
                      type="button"
                      onClick={() => { setFile(null); setFilePreview(null); setUploadedArtwork(undefined); }}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : file ? (
                  <div className="flex items-center justify-center gap-2 text-slate-700 py-2">
                    <FileText className="w-6 h-6 text-brand-600" />
                    <span className="text-xs font-semibold">{file.name}</span>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center">
                    <Upload className="w-7 h-7 text-brand-600 mb-1.5" />
                    <span className="text-xs font-bold text-slate-800">
                      {lang === 'bn' ? 'ফাইল সিলেক্ট করতে ক্লিক করুন' : 'Click to select file'}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, PDF (Max 20MB)</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}

                {isUploading && (
                  <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-brand-600 font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('uploading')}</span>
                  </div>
                )}

                {uploadedArtwork && !isUploading && (
                  <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{lang === 'bn' ? 'ফাইল সফলভাবে আপলোড হয়েছে' : 'File uploaded ready'}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-bold text-slate-700">{lang === 'bn' ? 'পরিমাণ (পিস)' : 'Quantity'}</span>
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg bg-slate-100 font-bold hover:bg-slate-200"
              >
                -
              </button>
              <span className="w-8 text-center font-bold text-sm">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-lg bg-slate-100 font-bold hover:bg-slate-200"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isUploading}
          className="w-full mt-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition-all"
        >
          {t('addToCart')} (৳{Math.round((product.basePricePaisa * quantity) / 100)})
        </button>
      </div>
    </div>
  );
};
`);

// 16. client/src/components/CartDrawer.tsx
writeFile('client/src/components/CartDrawer.tsx', `
import React from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { X, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const { items, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, subtotalPaisa, deliveryFeePaisa, totalPaisa } = useCart();
  const { lang, t } = useLanguage();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity" onClick={() => setIsCartOpen(false)} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-600" />
              <h2 className="font-bold text-slate-900">{t('cart')}</h2>
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-600">
                {items.length}
              </span>
            </div>
            <button onClick={() => setIsCartOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <ShoppingBag className="w-12 h-12 mx-auto stroke-1 mb-2 text-slate-300" />
                <p className="text-sm font-semibold">{t('emptyCart')}</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 leading-snug">
                        {lang === 'bn' ? item.product.nameBn : item.product.nameEn}
                      </h4>
                      <span className="text-xs font-extrabold text-brand-600">
                        ৳{Math.round((item.product.basePricePaisa * item.quantity) / 100)}
                      </span>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-red-600 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Customization Details Summary */}
                  {(item.customText || item.artworkFile) && (
                    <div className="p-2 rounded-xl bg-slate-50 text-[11px] text-slate-600 space-y-0.5 border border-slate-100">
                      {item.customText && (
                        <p><span className="font-bold">{lang === 'bn' ? 'লেখা:' : 'Text:'}</span> {item.customText}</p>
                      )}
                      {item.artworkFile && (
                        <p><span className="font-bold">{lang === 'bn' ? 'ফাইল:' : 'File:'}</span> {item.artworkFile.originalFilename}</p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-400">{lang === 'bn' ? 'পরিমাণ:' : 'Qty:'}</span>
                    <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg p-0.5">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded bg-slate-100 font-bold text-xs">-</button>
                      <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded bg-slate-100 font-bold text-xs">+</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Totals & Checkout */}
          {items.length > 0 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>{t('subtotal')}</span>
                <span className="font-semibold">৳{Math.round(subtotalPaisa / 100)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>{t('deliveryFee')}</span>
                <span className="font-semibold">৳{Math.round(deliveryFeePaisa / 100)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1 border-t border-slate-200">
                <span>{t('total')}</span>
                <span>৳{Math.round(totalPaisa / 100)}</span>
              </div>

              <button
                onClick={() => {
                  alert(lang === 'bn' ? 'চেকআউট ও পেমেন্ট ফ্লো পরবর্তী ফেইজ ৬ এ যুক্ত হবে।' : 'Checkout & order payment flow arriving in Phase 6.');
                }}
                className="w-full mt-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <span>{t('checkout')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
`);

// 17. client/src/components/WhatsAppButton.tsx
writeFile('client/src/components/WhatsAppButton.tsx', `
import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const WhatsAppButton: React.FC = () => {
  const { lang, t } = useLanguage();
  const phone = '8801700000000';
  const defaultText = encodeURIComponent(
    lang === 'bn'
      ? 'হ্যালো, আমি GiftShop BD থেকে কাস্টমাইজড গিফট ও প্রিন্টিং অর্ডার করতে আগ্রহী।'
      : 'Hello, I want to inquire about a custom gift order on GiftShop BD.'
  );

  return (
    <a
      href={\`https://wa.me/\${phone}?text=\${defaultText}\`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-full shadow-lg shadow-emerald-600/30 flex items-center gap-2 font-bold text-xs tracking-wide transition-all hover:scale-105"
      aria-label="Contact on WhatsApp"
    >
      <MessageCircle className="w-5 h-5 fill-white text-emerald-600" />
      <span className="hidden sm:inline">{t('whatsappSupport')}</span>
    </a>
  );
};
`);

// 18. client/src/components/Footer.tsx
writeFile('client/src/components/Footer.tsx', `
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
`);

// 19. client/src/App.tsx
writeFile('client/src/App.tsx', `
import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { CategoryGrid } from './components/CategoryGrid';
import { ProductCard } from './components/ProductCard';
import { ProductCustomizationModal } from './components/ProductCustomizationModal';
import { CartDrawer } from './components/CartDrawer';
import { WhatsAppButton } from './components/WhatsAppButton';
import { Footer } from './components/Footer';
import { fetchCategories, fetchProducts } from './services/api';
import { Category, Product } from './types';
import { useLanguage } from './context/LanguageContext';

export const App: React.FC = () => {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCustomizeProduct, setActiveCustomizeProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCategories().then((cats) => setCategories(cats));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchProducts({
      category: selectedCategory || undefined,
      search: searchQuery.trim() || undefined
    })
      .then((prods) => setProducts(prods))
      .finally(() => setIsLoading(false));
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <Hero />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <CategoryGrid
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">{t('popularProducts')}</h2>
          <span className="text-xs text-slate-500 font-semibold">{products.length} Items</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-2xl h-64 border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
            <p className="text-slate-500 font-bold text-sm">No products found matching your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onOpenCustomize={setActiveCustomizeProduct}
              />
            ))}
          </div>
        )}
      </main>

      <ProductCustomizationModal
        product={activeCustomizeProduct}
        onClose={() => setActiveCustomizeProduct(null)}
      />

      <CartDrawer />
      <WhatsAppButton />
      <Footer />
    </div>
  );
};
export default App;
`);

// 20. client/src/main.tsx
writeFile('client/src/main.tsx', `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { LanguageProvider } from './context/LanguageContext';
import { CartProvider } from './context/CartContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </LanguageProvider>
  </React.StrictMode>
);
`);

console.log('--- Installing Client Packages (React, Vite, Tailwind, Lucide) ---');
execSync('npm --prefix client install', { stdio: 'inherit' });

console.log('--- Compiling Client Production Build (Vite) ---');
execSync('npm --prefix client run build', { stdio: 'inherit' });

console.log('==========================================================');
console.log(' SUCCESS: Phase 5 Customer Frontend Built Cleanly!        ');
console.log('==========================================================');
