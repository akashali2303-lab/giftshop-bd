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
      href={`https://wa.me/${phone}?text=${defaultText}`}
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
