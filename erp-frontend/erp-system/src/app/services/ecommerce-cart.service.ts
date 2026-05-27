import { Injectable, computed, signal } from '@angular/core';
import { ProductItem } from './ecommerce.service';

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

@Injectable({
  providedIn: 'root'
})
export class EcommerceCartService {
  private readonly cartItemsSignal = signal<CartItem[]>(this.readStoredCart());

  readonly items = this.cartItemsSignal.asReadonly();
  readonly itemCount = computed(() => this.cartItemsSignal().reduce((total, item) => total + item.quantity, 0));
  readonly subtotal = computed(() => this.cartItemsSignal().reduce((total, item) => total + item.unitPrice * item.quantity, 0));

  addProduct(product: ProductItem): boolean {
    if (product.stock <= 0) {
      return false;
    }

    const currentItems = this.cartItemsSignal();
    const existingItem = currentItems.find((item) => item.productId === product.id);
    if (existingItem) {
      return this.updateQuantity(product.id, existingItem.quantity + 1);
    }

    const nextItems = [
      ...currentItems,
      {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        priceLabel: product.price,
        unitPrice: this.parsePrice(product.price),
        quantity: 1,
        availableStock: product.stock,
      },
    ];
    this.persist(nextItems);
    return true;
  }

  updateQuantity(productId: number, quantity: number): boolean {
    const currentItems = this.cartItemsSignal();
    const targetItem = currentItems.find((item) => item.productId === productId);
    if (!targetItem) {
      return false;
    }

    if (quantity <= 0) {
      this.removeProduct(productId);
      return true;
    }

    const nextQuantity = Math.min(quantity, Math.max(targetItem.availableStock, 1));
    this.persist(
      currentItems.map((item) => item.productId === productId ? { ...item, quantity: nextQuantity } : item),
    );
    return nextQuantity === quantity;
  }

  removeProduct(productId: number) {
    this.persist(this.cartItemsSignal().filter((item) => item.productId !== productId));
  }

  clear() {
    this.persist([]);
  }

  private persist(items: CartItem[]) {
    this.cartItemsSignal.set(items);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }

  private readStoredCart(): CartItem[] {
    const storedValue = localStorage.getItem(CART_STORAGE_KEY);
    if (!storedValue) {
      return [];
    }

    try {
      const parsed = JSON.parse(storedValue) as CartItem[];
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((item) => item && typeof item.productId === 'number' && typeof item.quantity === 'number');
    } catch {
      return [];
    }
  }

  private parsePrice(priceLabel: string): number {
    const normalized = priceLabel.replace(/[^0-9.]/g, '');
    const price = Number.parseFloat(normalized);
    return Number.isFinite(price) ? price : 0;
  }
}