import { apiRequest } from './api';

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

export const crmService = {
  getOverview: () => apiRequest<CRMOverview>('/api/crm/overview'),
  getLeads: () => apiRequest<CRMLead[]>('/api/crm/leads'),
  createLead: (payload: CreateCRMLeadPayload) =>
    apiRequest<CRMLead>('/api/crm/leads', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAccounts: () => apiRequest<CRMAccount[]>('/api/crm/accounts'),
  createAccount: (payload: CreateCRMAccountPayload) =>
    apiRequest<CRMAccount>('/api/crm/accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getDeals: () => apiRequest<CRMDeal[]>('/api/crm/pipeline'),
  updateDealStage: (dealId: number, stage: string) =>
    apiRequest<CRMDeal>(`/api/crm/pipeline/${dealId}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stage }),
    }),
};
