import { Injectable } from '@angular/core';

const API_BASE_URL = '';

export interface PurchaseMetric {
  label: string;
  value: string;
  delta: string;
  copy: string;
}

export interface PurchaseOverview {
  metrics: PurchaseMetric[];
}

export interface PurchaseRequisition {
  id: number;
  request_code: string;
  title: string;
  department: string;
  requested_by: string;
  priority: string;
  status: string;
  target_date: string;
  estimated_value: string;
  summary: string;
}

export interface PurchaseOrder {
  id: number;
  order_code: string;
  vendor_name: string;
  category: string;
  status: string;
  buyer_name: string;
  expected_receipt: string;
  value: string;
  line_items: string;
  summary: string;
}

export interface PurchaseVendor {
  id: number;
  vendor_code: string;
  name: string;
  category: string;
  region: string;
  contact_name: string;
  email: string;
  lead_time: string;
  status: string;
  annual_spend: string;
}

export interface CreatePurchaseRequisitionPayload {
  request_code: string;
  title: string;
  department: string;
  requested_by: string;
  priority: string;
  status: string;
  target_date: string;
  estimated_value: number;
  summary: string;
}

export interface CreatePurchaseVendorPayload {
  vendor_code: string;
  name: string;
  category: string;
  region: string;
  contact_name: string;
  email: string;
  lead_time_days: number;
  status: string;
  annual_spend: number;
}

@Injectable({
  providedIn: 'root'
})
export class PurchaseService {
  async getOverview(): Promise<PurchaseOverview> {
    return this.request<PurchaseOverview>('/api/purchase/overview');
  }

  async getRequisitions(): Promise<PurchaseRequisition[]> {
    return this.request<PurchaseRequisition[]>('/api/purchase/requisitions');
  }

  async createRequisition(payload: CreatePurchaseRequisitionPayload): Promise<PurchaseRequisition> {
    return this.request<PurchaseRequisition>('/api/purchase/requisitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async getOrders(): Promise<PurchaseOrder[]> {
    return this.request<PurchaseOrder[]>('/api/purchase/orders');
  }

  async updateOrderStatus(orderId: number, status: string): Promise<PurchaseOrder> {
    return this.request<PurchaseOrder>(`/api/purchase/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  }

  async getVendors(): Promise<PurchaseVendor[]> {
    return this.request<PurchaseVendor[]>('/api/purchase/vendors');
  }

  async createVendor(payload: CreatePurchaseVendorPayload): Promise<PurchaseVendor> {
    return this.request<PurchaseVendor>('/api/purchase/vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
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