import { apiRequest } from './api';

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

export const financeService = {
  getOverview: () => apiRequest<FinanceOverview>('/api/finance/overview'),
  getReports: () => apiRequest<FinanceReports>('/api/finance/reports'),
  getJournalEntries: () => apiRequest<FinanceJournalEntry[]>('/api/finance/journal'),
  createJournalEntry: (payload: CreateFinanceJournalEntryPayload) =>
    apiRequest<FinanceJournalEntry>('/api/finance/journal', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getInvoices: () => apiRequest<FinanceInvoice[]>('/api/finance/invoices'),
  createInvoice: (payload: CreateFinanceInvoicePayload) =>
    apiRequest<FinanceInvoice>('/api/finance/invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateInvoiceStatus: (invoiceId: number, status: string) =>
    apiRequest<FinanceInvoice>(`/api/finance/invoices/${invoiceId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  getExpenseClaims: () => apiRequest<FinanceExpenseClaim[]>('/api/finance/expenses'),
  createExpenseClaim: (payload: CreateFinanceExpenseClaimPayload) =>
    apiRequest<FinanceExpenseClaim>('/api/finance/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateExpenseClaimStatus: (claimId: number, status: string) =>
    apiRequest<FinanceExpenseClaim>(`/api/finance/expenses/${claimId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};
