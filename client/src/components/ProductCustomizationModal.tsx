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
