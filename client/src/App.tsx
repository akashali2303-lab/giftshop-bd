import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { CategoryGrid } from './components/CategoryGrid';
import { ProductCard } from './components/ProductCard';
import { ProductCustomizationModal } from './components/ProductCustomizationModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderTrackModal } from './components/OrderTrackModal';
import { WhatsAppButton } from './components/WhatsAppButton';
import { Footer } from './components/Footer';
import { fetchCategories, fetchProducts } from './services/api';
import { Category, Product } from './types';
import { useLanguage } from './context/LanguageContext';

// Dynamic lazy import: Customers on / never download the Admin bundle
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));

export const App: React.FC = () => {
  const { t } = useLanguage();
  const [isAdminRoute, setIsAdminRoute] = useState(() => window.location.pathname.startsWith('/admin'));

  useEffect(() => {
    const checkPath = () => {
      setIsAdminRoute(window.location.pathname.startsWith('/admin'));
    };
    window.addEventListener('popstate', checkPath);
    return () => window.removeEventListener('popstate', checkPath);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setIsAdminRoute(path.startsWith('/admin'));
  };

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCustomizeProduct, setActiveCustomizeProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackOpen, setIsTrackOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAdminRoute) {
      fetchCategories().then((cats) => setCategories(cats));
    }
  }, [isAdminRoute]);

  useEffect(() => {
    if (!isAdminRoute) {
      setIsLoading(true);
      fetchProducts({
        category: selectedCategory || undefined,
        search: searchQuery.trim() || undefined
      })
        .then((prods) => setProducts(prods))
        .finally(() => setIsLoading(false));
    }
  }, [selectedCategory, searchQuery, isAdminRoute]);

  // If path is /admin -> Render Admin Dashboard
  if (isAdminRoute) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
          Loading Admin Operations...
        </div>
      }>
        <AdminDashboard onBackToStore={() => navigateTo('/')} />
      </Suspense>
    );
  }

  // Otherwise -> Render Customer Storefront
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenTrack={() => setIsTrackOpen(true)}
      />
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
            <p className="text-slate-500 font-bold text-sm">No products found</p>
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

      <CartDrawer onOpenCheckout={() => setIsCheckoutOpen(true)} />
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
      <OrderTrackModal isOpen={isTrackOpen} onClose={() => setIsTrackOpen(false)} />

      <WhatsAppButton />
      <Footer />
    </div>
  );
};
export default App;
