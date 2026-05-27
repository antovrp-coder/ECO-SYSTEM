import { Injectable } from '@angular/core';

const API_BASE_URL = '';

export interface FinanceMetric {
  label: string;
  value: string;
  delta: string;
  copy: string;
}

export interface FinanceOverview {
  metrics: FinanceMetric[];
}

export interface FinanceReceivablesBucket {
  label: string;
  invoice_count: string;
  amount: string;
  share: string;
}

export interface FinanceDepartmentExpense {
  department: string;
  claim_count: string;
  amount: string;
  status_mix: string;
}

export interface FinanceReports {
  receivables: FinanceReceivablesBucket[];
  expenses: FinanceDepartmentExpense[];
  highlights: FinanceMetric[];
}

export interface FinanceJournalEntry {
  id: number;
  entry_code: string;
  ledger_name: string;
  period: string;
  reference: string;
  posted_by: string;
  status: string;
  amount: string;
  summary: string;
}

export interface FinanceInvoice {
  id: number;
  invoice_code: string;
  account_name: string;
  due_date: string;
  status: string;
  owner_name: string;
  aging_bucket: string;
  amount_due: string;
  summary: string;
}

export interface FinanceExpenseClaim {
  id: number;
  claim_code: string;
  employee_name: string;
  department: string;
  category: string;
  submitted_date: string;
  status: string;
  amount: string;
  summary: string;
}

export interface CreateFinanceJournalEntryPayload {
  entry_code: string;
  ledger_name: string;
  period: string;
  reference: string;
  posted_by: string;
  status: string;
  amount: number;
  summary: string;
}

export interface CreateFinanceExpenseClaimPayload {
  claim_code: string;
  employee_name: string;
  department: string;
  category: string;
  submitted_date: string;
  status: string;
  amount: number;
  summary: string;
}

export interface CreateFinanceInvoicePayload {
  invoice_code: string;
  account_name: string;
  due_date: string;
  status: string;
  owner_name: string;
  aging_bucket: string;
  amount_due: number;
  summary: string;
}

@Injectable({
  providedIn: 'root'
})
export class FinanceService {
  async getOverview(): Promise<FinanceOverview> {
    return this.request<FinanceOverview>('/api/finance/overview');
  }

  async getReports(): Promise<FinanceReports> {
    return this.request<FinanceReports>('/api/finance/reports');
  }

  async getJournalEntries(): Promise<FinanceJournalEntry[]> {
    return this.request<FinanceJournalEntry[]>('/api/finance/journal');
  }

  async createJournalEntry(payload: CreateFinanceJournalEntryPayload): Promise<FinanceJournalEntry> {
    return this.request<FinanceJournalEntry>('/api/finance/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async getInvoices(): Promise<FinanceInvoice[]> {
    return this.request<FinanceInvoice[]>('/api/finance/invoices');
  }

  async createInvoice(payload: CreateFinanceInvoicePayload): Promise<FinanceInvoice> {
    return this.request<FinanceInvoice>('/api/finance/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async updateInvoiceStatus(invoiceId: number, status: string): Promise<FinanceInvoice> {
    return this.request<FinanceInvoice>(`/api/finance/invoices/${invoiceId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  }

  async getExpenseClaims(): Promise<FinanceExpenseClaim[]> {
    return this.request<FinanceExpenseClaim[]>('/api/finance/expenses');
  }

  async createExpenseClaim(payload: CreateFinanceExpenseClaimPayload): Promise<FinanceExpenseClaim> {
    return this.request<FinanceExpenseClaim>('/api/finance/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async updateExpenseClaimStatus(claimId: number, status: string): Promise<FinanceExpenseClaim> {
    return this.request<FinanceExpenseClaim>(`/api/finance/expenses/${claimId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
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