import { Injectable } from '@angular/core';

const API_BASE_URL = '';

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

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  async getItems(): Promise<InventoryItem[]> {
    return this.request<InventoryItem[]>('/api/inventory/stock');
  }

  async createItem(payload: CreateInventoryItemPayload): Promise<InventoryItem> {
    return this.request<InventoryItem>('/api/inventory/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async updateItem(itemId: number, payload: UpdateInventoryItemPayload): Promise<InventoryItem> {
    return this.request<InventoryItem>(`/api/inventory/stock/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async getSuppliers(): Promise<InventorySupplier[]> {
    return this.request<InventorySupplier[]>('/api/inventory/suppliers');
  }

  async createSupplier(payload: CreateInventorySupplierPayload): Promise<InventorySupplier> {
    return this.request<InventorySupplier>('/api/inventory/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async getReports(): Promise<InventoryReport[]> {
    return this.request<InventoryReport[]>('/api/inventory/reports');
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