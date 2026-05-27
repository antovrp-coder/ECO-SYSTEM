import { Injectable } from '@angular/core';

const API_BASE_URL = '';

export interface CommerceMetric {
  label: string;
  value: string;
  delta: string;
  copy: string;
}

export interface ChannelPerformance {
  channel: string;
  share: number;
  revenue: string;
}

export interface OverviewResponse {
  metrics: CommerceMetric[];
  channels: ChannelPerformance[];
  checklist: string[];
}

export interface ProductItem {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: string;
  stock: number;
  status: 'Healthy' | 'Reorder' | 'Backorder';
  conversion: string;
  tags: string[];
  image_urls: string[];
}

export interface OrderItem {
  id: number;
  order_number: string;
  customer: string;
  channel: string;
  value: string;
  status: 'New' | 'Packed' | 'Shipped' | 'Delayed';
  fulfillment_eta: string;
  payment_provider: string;
  payment_method: string;
}

export type PaymentMethod = 'card' | 'upi' | 'netbanking' | 'wallet' | 'cod';

export interface PaymentProviderOption {
  id: string;
  label: string;
  status: string;
  copy: string;
  supported_methods: PaymentMethod[];
  button_label: string;
}

export interface CheckoutItemPayload {
  product_id: number;
  quantity: number;
}

export interface CheckoutPayload {
  full_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  channel?: string;
  payment_provider: string;
  payment_method: PaymentMethod;
  items: CheckoutItemPayload[];
}

export interface CheckoutResponse {
  order: OrderItem;
  payment_message: string;
}

export interface CustomerSegment {
  name: string;
  count: string;
  insight: string;
}

export interface CustomerSpotlight {
  id: number;
  name: string;
  tier: string;
  lifetime_value: string;
  next_action: string;
}

export interface CustomersResponse {
  segments: CustomerSegment[];
  spotlights: CustomerSpotlight[];
}

export interface CampaignItem {
  id: number;
  name: string;
  status: 'Active' | 'Scheduled' | 'Draft';
  channel: string;
  uplift: string;
  window: string;
  discount_percent: number;
  audience: string;
}

export interface FunnelStage {
  label: string;
  value: string;
  completion: number;
}

export interface RegionMetric {
  region: string;
  share: number;
  revenue: string;
}

export interface AnalyticsResponse {
  funnel: FunnelStage[];
  regions: RegionMetric[];
}

export interface CreateProductPayload {
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  tags: string[];
  image_urls: string[];
}

export interface SavePromotionPayload {
  name: string;
  status: CampaignItem['status'];
  channel: string;
  window: string;
  discount_percent: number;
  audience: string;
}

@Injectable({
  providedIn: 'root'
})
export class EcommerceService {
  async getOverview(): Promise<OverviewResponse> {
    return this.request<OverviewResponse>('/api/ecommerce/overview');
  }

  async getProducts(): Promise<ProductItem[]> {
    return this.request<ProductItem[]>('/api/ecommerce/products');
  }

  async createProduct(payload: CreateProductPayload): Promise<ProductItem> {
    return this.request<ProductItem>('/api/ecommerce/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async getOrders(): Promise<OrderItem[]> {
    return this.request<OrderItem[]>('/api/ecommerce/orders');
  }

  async getPaymentOptions(): Promise<PaymentProviderOption[]> {
    return this.request<PaymentProviderOption[]>('/api/ecommerce/payment-options');
  }

  async checkout(payload: CheckoutPayload): Promise<CheckoutResponse> {
    return this.request<CheckoutResponse>('/api/ecommerce/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async updateOrderStatus(orderId: number, status: OrderItem['status']): Promise<OrderItem> {
    return this.request<OrderItem>(`/api/ecommerce/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  }

  async getCustomers(): Promise<CustomersResponse> {
    return this.request<CustomersResponse>('/api/ecommerce/customers');
  }

  async getPromotions(): Promise<CampaignItem[]> {
    return this.request<CampaignItem[]>('/api/ecommerce/promotions');
  }

  async createPromotion(payload: SavePromotionPayload): Promise<CampaignItem> {
    return this.request<CampaignItem>('/api/ecommerce/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async updatePromotion(promotionId: number, payload: SavePromotionPayload): Promise<CampaignItem> {
    return this.request<CampaignItem>(`/api/ecommerce/promotions/${promotionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async getAnalytics(): Promise<AnalyticsResponse> {
    return this.request<AnalyticsResponse>('/api/ecommerce/analytics');
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, init);
    const body = await this.readBody<T | { error?: string }>(response);

    if (!response.ok) {
      const error = typeof body === 'object' && body && 'error' in body ? body.error : undefined;
      throw new Error(error || `Request failed for ${path}`);
    }

    return body as T;
  }

  private async readBody<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text.trim()) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }
}