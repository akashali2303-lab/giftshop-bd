import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const WhatsAppButton: React.FC = () => {
  const { lang, t } = useLanguage();
  const phone = '8801710318776';
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
      className="fixed bottom-6 right-6 z-40 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-full shadow-xl shadow-emerald-600/30 flex items-center gap-2.5 font-bold text-xs tracking-wide transition-all hover:scale-105 group border-2 border-white/20"
      aria-label="Contact on WhatsApp"
    >
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
      </span>
      <MessageCircle className="w-5 h-5 fill-white text-emerald-600" />
      <span className="font-semibold">{t('whatsappSupport')}</span>
    </a>
  );
};
