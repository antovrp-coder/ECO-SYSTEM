import { apiRequest } from './api';

export interface InventoryItem {
  id: number;
  sku: string;
  name: string;
  category: string;
  warehouse: string;
  supplier_name: string;
  status: string;
  reorder_point: number;
  on_hand: number;
  reserved: number;
  incoming: number;
  available: number;
  unit_cost: string;
  stock_value: string;
}

export interface InventorySupplier {
  id: number;
  name: string;
  contact_name: string;
  email: string;
  region: string;
  lead_time_days: number;
  status: string;
  payment_terms: string;
  reliability_score: number;
  notes: string;
}

export interface InventoryReport {
  id: number;
  name: string;
  window_label: string;
  fill_rate: string;
  inventory_value: string;
  stock_cover_days: string;
  risk_skus: string;
  summary: string;
}

export interface CreateInventoryItemPayload {
  sku: string;
  name: string;
  category: string;
  warehouse: string;
  supplier_name: string;
  status: string;
  reorder_point: number;
  on_hand: number;
  reserved: number;
  incoming: number;
  unit_cost: number;
}

export interface UpdateInventoryItemPayload {
  status?: string;
  reorder_point?: number;
  on_hand?: number;
  reserved?: number;
  incoming?: number;
}

export interface CreateInventorySupplierPayload {
  name: string;
  contact_name: string;
  email: string;
  region: string;
  lead_time_days: number;
  status: string;
  payment_terms: string;
  reliability_score: number;
  notes: string;
}

export const inventoryService = {
  getItems: () => apiRequest<InventoryItem[]>('/api/inventory/stock'),
  createItem: (payload: CreateInventoryItemPayload) =>
    apiRequest<InventoryItem>('/api/inventory/stock', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateItem: (itemId: number, payload: UpdateInventoryItemPayload) =>
    apiRequest<InventoryItem>(`/api/inventory/stock/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getSuppliers: () => apiRequest<InventorySupplier[]>('/api/inventory/suppliers'),
  createSupplier: (payload: CreateInventorySupplierPayload) =>
    apiRequest<InventorySupplier>('/api/inventory/suppliers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getReports: () => apiRequest<InventoryReport[]>('/api/inventory/reports'),
};
