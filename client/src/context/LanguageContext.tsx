import React, { createContext, useContext, useState } from 'react';

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
