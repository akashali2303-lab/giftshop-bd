import { Category, Product } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE}/api/categories`);
  const json = await res.json();
  return json.success ? json.data : [];
}

export async function fetchProducts(params: { category?: string; search?: string } = {}): Promise<Product[]> {
  const query = new URLSearchParams();
  if (params.category) query.append('category', params.category);
  if (params.search) query.append('search', params.search);

  const res = await fetch(`${API_BASE}/api/products?` + query.toString());
  const json = await res.json();
  return json.success && json.data.items ? json.data.items : [];
}

export async function uploadArtworkFile(file: File): Promise<{ storageKey: string; originalFilename: string }> {
  const formData = new FormData();
  formData.append('artwork', file);

  const res = await fetch(`${API_BASE}/api/uploads/artwork`, {
    method: 'POST',
    body: formData
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Failed to upload artwork');
  }

  return json.data;
}
