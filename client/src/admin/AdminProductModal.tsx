import React, { useState } from 'react';
import { X, Plus, AlertCircle, Loader2 } from 'lucide-react';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';

interface Props {
  isOpen: boolean;
  token: string;
  categories: any[];
  onClose: () => void;
  onProductCreated: () => void;
}

export const AdminProductModal: React.FC<Props> = ({ isOpen, token, categories, onClose, onProductCreated }) => {
  const [nameEn, setNameEn] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [priceTaka, setPriceTaka] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionBn, setDescriptionBn] = useState('');
  const [requiresCustomText, setRequiresCustomText] = useState(false);
  const [requiresArtworkUpload, setRequiresArtworkUpload] = useState(false);
  const [promptEn, setPromptEn] = useState('');
  const [promptBn, setPromptBn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const generatedSlug = slug.trim() || nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const basePricePaisa = Math.round(parseFloat(priceTaka) * 100);

      const payload = {
        nameEn: nameEn.trim(),
        nameBn: nameBn.trim(),
        slug: generatedSlug,
        categoryId: categoryId || categories[0]?.id,
        basePricePaisa,
        featuredImage: '/images/demo/custom-gift.jpg',
        descriptionEn: descriptionEn.trim() || undefined,
        descriptionBn: descriptionBn.trim() || undefined,
        requiresCustomText,
        requiresArtworkUpload,
        customizationPromptEn: promptEn.trim() || undefined,
        customizationPromptBn: promptBn.trim() || undefined,
        isActive: true
      };

      const res = await fetch(API_BASE + '/api/products/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create product');

      onProductCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 relative shadow-2xl my-8 text-left">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-black text-slate-900 mb-1">Add New Product to Catalog</h3>
        <p className="text-xs text-slate-400 mb-4">Fill in the product details to make it live in the shop.</p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Product Title (English) *</label>
              <input
                required
                type="text"
                value={nameEn}
                onChange={e => setNameEn(e.target.value)}
                placeholder="e.g. Birthday Photo Wrapper"
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Product Title (বাংলা) *</label>
              <input
                required
                type="text"
                value={nameBn}
                onChange={e => setNameBn(e.target.value)}
                placeholder="যেমন: ছবিযুক্ত চকলেট র‍্যাপার"
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Category *</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nameEn} ({c.nameBn})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Price in Taka (BDT ৳) *</label>
              <input
                required
                type="number"
                min="1"
                value={priceTaka}
                onChange={e => setPriceTaka(e.target.value)}
                placeholder="e.g. 250"
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 font-bold"
              />
            </div>
          </div>

          {/* Customization Checkboxes */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="block font-bold text-slate-700 text-xs">Customer Customization Rules</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresCustomText}
                  onChange={e => setRequiresCustomText(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs">Requires Custom Text/Name</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresArtworkUpload}
                  onChange={e => setRequiresArtworkUpload(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs">Requires Photo/File Upload</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow flex items-center justify-center gap-2 mt-4 transition-all"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>Publish Product to Store</span>
          </button>
        </form>
      </div>
    </div>
  );
};
