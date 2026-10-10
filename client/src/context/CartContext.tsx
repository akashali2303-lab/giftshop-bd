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
