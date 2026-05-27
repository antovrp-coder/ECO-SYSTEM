import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';
import {
  CheckoutPayload,
  EcommerceService,
  OrderItem,
  PaymentMethod,
  PaymentProviderOption,
  ProductItem,
} from '../../services/ecommerce.service';

interface PosCartItem {
  productId: number;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  priceLabel: string;
  availableStock: number;
}

@Component({
  selector: 'app-pos-workspace',
  imports: [CommonModule, FormsModule],
  templateUrl: './pos-workspace.html',
  styleUrl: './pos-workspace.scss',
})
export class PosWorkspaceComponent implements OnInit {
  private readonly ecommerceService = inject(EcommerceService);
  private readonly notificationService = inject(NotificationService);

  loading = false;
  submitting = false;
  error = '';
  productSearch = '';
  selectedCategory = 'All';
  selectedPaymentProvider = '';
  paymentMethod: PaymentMethod = 'card';
  receiptMessage = '';

  customer = {
    fullName: 'Walk-in Customer',
    email: 'walkin@eco-pos.local',
    phone: '',
    address: 'Counter sale',
    city: 'In-store',
  };

  products: ProductItem[] = [];
  orders: OrderItem[] = [];
  paymentProviders: PaymentProviderOption[] = [];
  cart: PosCartItem[] = [];

  ngOnInit(): void {
    void this.loadWorkspace();
  }

  get categories(): string[] {
    return ['All', ...new Set(this.products.map((product) => product.category))];
  }

  get filteredProducts(): ProductItem[] {
    const query = this.productSearch.trim().toLowerCase();
    return this.products.filter((product) => {
      const matchesCategory = this.selectedCategory === 'All' || product.category === this.selectedCategory;
      const haystack = `${product.name} ${product.sku} ${product.category}`.toLowerCase();
      return matchesCategory && (!query || haystack.includes(query));
    });
  }

  get recentOrders(): OrderItem[] {
    return this.orders.slice(0, 6);
  }

  get cartItemCount(): number {
    return this.cart.reduce((total, item) => total + item.quantity, 0);
  }

  get cartSubtotal(): number {
    return this.cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  }

  get selectedPaymentOption(): PaymentProviderOption | null {
    return this.paymentProviders.find((provider) => provider.id === this.selectedPaymentProvider) ?? null;
  }

  get supportedPaymentMethods(): PaymentMethod[] {
    return this.selectedPaymentOption?.supported_methods ?? [];
  }

  async loadWorkspace(): Promise<void> {
    this.loading = true;
    this.error = '';

    try {
      const [products, orders, paymentProviders] = await Promise.all([
        this.ecommerceService.getProducts(),
        this.ecommerceService.getOrders(),
        this.ecommerceService.getPaymentOptions(),
      ]);
      this.products = products;
      this.orders = orders;
      this.paymentProviders = paymentProviders;
      if (!this.selectedPaymentProvider && paymentProviders.length > 0) {
        this.selectedPaymentProvider = paymentProviders[0].id;
      }
      this.ensurePaymentMethod();
    } catch (error) {
      this.error = this.describeError(error, 'Failed to load POS workspace data.');
    } finally {
      this.loading = false;
    }
  }

  addProduct(product: ProductItem): void {
    if (product.stock <= 0) {
      this.notificationService.warning(`${product.name} is out of stock.`, 2500);
      return;
    }

    const existing = this.cart.find((item) => item.productId === product.id);
    if (existing) {
      this.updateQuantity(existing, existing.quantity + 1);
      return;
    }

    this.cart = [
      ...this.cart,
      {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: 1,
        unitPrice: this.parsePrice(product.price),
        priceLabel: product.price,
        availableStock: product.stock,
      },
    ];
    this.notificationService.success(`${product.name} added to the POS cart.`, 2200);
  }

  updateQuantity(item: PosCartItem, nextQuantity: number): void {
    if (nextQuantity <= 0) {
      this.removeItem(item.productId);
      return;
    }

    const quantity = Math.min(nextQuantity, Math.max(item.availableStock, 1));
    this.cart = this.cart.map((line) => line.productId === item.productId ? { ...line, quantity } : line);
  }

  removeItem(productId: number): void {
    this.cart = this.cart.filter((item) => item.productId !== productId);
  }

  clearSale(): void {
    this.cart = [];
    this.receiptMessage = '';
  }

  selectPaymentProvider(providerId: string): void {
    this.selectedPaymentProvider = providerId;
    this.ensurePaymentMethod();
  }

  async completeSale(): Promise<void> {
    if (this.cart.length === 0) {
      this.notificationService.warning('Add at least one product before taking payment.', 3000);
      return;
    }

    if (!this.customer.fullName.trim() || !this.customer.email.trim() || !this.customer.address.trim() || !this.customer.city.trim()) {
      this.notificationService.warning('Fill in customer name, email, address, and city before completing the sale.', 3200);
      return;
    }

    if (!this.selectedPaymentProvider) {
      this.notificationService.warning('Choose a payment provider for the POS sale.', 3000);
      return;
    }

    const cartSnapshot = this.cart.map((item) => ({ ...item }));
    const payload: CheckoutPayload = {
      full_name: this.customer.fullName.trim(),
      email: this.customer.email.trim(),
      phone: this.customer.phone.trim(),
      address: this.customer.address.trim(),
      city: this.customer.city.trim(),
      channel: 'POS Terminal',
      payment_provider: this.selectedPaymentProvider,
      payment_method: this.paymentMethod,
      items: cartSnapshot.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
    };

    this.submitting = true;
    try {
      const response = await this.ecommerceService.checkout(payload);
      this.orders = [response.order, ...this.orders];
      this.applyInventoryUpdate(cartSnapshot);
      this.receiptMessage = response.payment_message;
      this.cart = [];
      this.notificationService.success(`Sale ${response.order.order_number} completed on ${response.order.channel}.`, 3500);
    } catch (error) {
      this.notificationService.error(this.describeError(error, 'Failed to complete the POS sale.'), 4500);
    } finally {
      this.submitting = false;
    }
  }

  trackById(_index: number, item: { id: number }): number {
    return item.id;
  }

  trackByStringId(_index: number, item: { id: string }): string {
    return item.id;
  }

  trackByProductId(_index: number, item: { productId: number }): number {
    return item.productId;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  }

  private applyInventoryUpdate(cartSnapshot: PosCartItem[]): void {
    this.products = this.products.map((product) => {
      const line = cartSnapshot.find((item) => item.productId === product.id);
      if (!line) {
        return product;
      }

      const nextStock = Math.max(0, product.stock - line.quantity);
      return {
        ...product,
        stock: nextStock,
        status: nextStock === 0 ? 'Backorder' : nextStock < 35 ? 'Reorder' : 'Healthy',
      };
    });
  }

  private ensurePaymentMethod(): void {
    const supportedMethods = this.supportedPaymentMethods;
    if (supportedMethods.length === 0) {
      return;
    }

    if (!supportedMethods.includes(this.paymentMethod)) {
      this.paymentMethod = supportedMethods[0];
    }
  }

  private parsePrice(priceLabel: string): number {
    const normalized = priceLabel.replace(/[^0-9.]/g, '');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private describeError(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return fallback;
  }
}