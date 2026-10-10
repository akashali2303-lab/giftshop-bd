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
