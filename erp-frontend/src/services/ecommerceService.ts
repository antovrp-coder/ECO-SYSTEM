import { apiRequest } from './api';

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

export const ecommerceService = {
  getOverview: () => apiRequest<OverviewResponse>('/api/ecommerce/overview'),
  getProducts: () => apiRequest<ProductItem[]>('/api/ecommerce/products'),
  createProduct: (payload: CreateProductPayload) =>
    apiRequest<ProductItem>('/api/ecommerce/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getOrders: () => apiRequest<OrderItem[]>('/api/ecommerce/orders'),
  updateOrderStatus: (orderId: number, status: string) =>
    apiRequest<OrderItem>(`/api/ecommerce/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  getPaymentOptions: () => apiRequest<PaymentProviderOption[]>('/api/ecommerce/payment-options'),
  checkout: (payload: CheckoutPayload) =>
    apiRequest<CheckoutResponse>('/api/ecommerce/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCustomers: () => apiRequest<CustomersResponse>('/api/ecommerce/customers'),
  getPromotions: () => apiRequest<CampaignItem[]>('/api/ecommerce/promotions'),
  createPromotion: (payload: SavePromotionPayload) =>
    apiRequest<CampaignItem>('/api/ecommerce/promotions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updatePromotion: (id: number, payload: Partial<SavePromotionPayload>) =>
    apiRequest<CampaignItem>(`/api/ecommerce/promotions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getAnalytics: () => apiRequest<AnalyticsResponse>('/api/ecommerce/analytics'),
};
