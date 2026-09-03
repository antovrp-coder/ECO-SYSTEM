import { useState, useEffect } from 'react';
import { ProductItem } from './ecommerceService';

const CART_STORAGE_KEY = 'erpEcommerceCart';

export interface CartItem {
  productId: number;
  sku: string;
  name: string;
  priceLabel: string;
  unitPrice: number;
  quantity: number;
  availableStock: number;
}

function parsePrice(priceLabel: string): number {
  const normalized = (priceLabel || '').replace(/[^0-9.]/g, '');
  const price = Number.parseFloat(normalized);
  return Number.isFinite(price) ? price : 0;
}

export function readStoredCart(): CartItem[] {
  const stored = localStorage.getItem(CART_STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export function useEcommerceCart() {
  const [items, setItems] = useState<CartItem[]>(readStoredCart);

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const addProduct = (product: ProductItem): boolean => {
    if (product.stock <= 0) return false;

    setItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        const nextQty = Math.min(existing.quantity + 1, product.stock);
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: nextQty } : item
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          priceLabel: product.price,
          unitPrice: parsePrice(product.price),
          quantity: 1,
          availableStock: product.stock,
        },
      ];
    });
    return true;
  };

  const updateQuantity = (productId: number, quantity: number): boolean => {
    if (quantity <= 0) {
      removeProduct(productId);
      return true;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const nextQty = Math.min(quantity, Math.max(item.availableStock, 1));
          return { ...item, quantity: nextQty };
        }
        return item;
      })
    );
    return true;
  };

  const removeProduct = (productId: number) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clear = () => {
    setItems([]);
  };

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);

  return {
    items,
    itemCount,
    subtotal,
    addProduct,
    updateQuantity,
    removeProduct,
    clear,
  };
}
