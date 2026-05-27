import { Injectable } from '@angular/core';

const API_BASE_URL = '';

export interface CRMOverviewMetric {
  label: string;
  value: string;
  delta: string;
  copy: string;
}

export interface CRMOverview {
  metrics: CRMOverviewMetric[];
}

export interface CRMLead {
  id: number;
  lead_code: string;
  company_name: string;
  contact_name: string;
  email: string;
  segment: string;
  stage: string;
  owner_name: string;
  estimated_value: string;
  last_touch_label: string;
  next_step: string;
}

export interface CRMAccount {
  id: number;
  account_code: string;
  name: string;
  tier: string;
  industry: string;
  region: string;
  owner_name: string;
  renewal_window: string;
  health_status: string;
  annual_value: string;
}

export interface CRMDeal {
  id: number;
  deal_code: string;
  account_name: string;
  stage: string;
  owner_name: string;
  forecast_category: string;
  close_date: string;
  value: string;
  probability: string;
  summary: string;
}

export interface CreateCRMLeadPayload {
  lead_code: string;
  company_name: string;
  contact_name: string;
  email: string;
  segment: string;
  stage: string;
  owner_name: string;
  estimated_value: number;
  last_touch_label: string;
  next_step: string;
}

export interface CreateCRMAccountPayload {
  account_code: string;
  name: string;
  tier: string;
  industry: string;
  region: string;
  owner_name: string;
  renewal_window: string;
  health_status: string;
  annual_value: number;
}

@Injectable({
  providedIn: 'root'
})
export class CrmService {
  async getOverview(): Promise<CRMOverview> {
    return this.request<CRMOverview>('/api/crm/overview');
  }

  async getLeads(): Promise<CRMLead[]> {
    return this.request<CRMLead[]>('/api/crm/leads');
  }

  async createLead(payload: CreateCRMLeadPayload): Promise<CRMLead> {
    return this.request<CRMLead>('/api/crm/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async getAccounts(): Promise<CRMAccount[]> {
    return this.request<CRMAccount[]>('/api/crm/accounts');
  }

  async createAccount(payload: CreateCRMAccountPayload): Promise<CRMAccount> {
    return this.request<CRMAccount>('/api/crm/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async getDeals(): Promise<CRMDeal[]> {
    return this.request<CRMDeal[]>('/api/crm/pipeline');
  }

  async updateDealStage(dealId: number, stage: string): Promise<CRMDeal> {
    return this.request<CRMDeal>(`/api/crm/pipeline/${dealId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
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