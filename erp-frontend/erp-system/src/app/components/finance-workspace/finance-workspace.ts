import { CommonModule } from '@angular/common';
import { Component, effect, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CreateFinanceExpenseClaimPayload,
  CreateFinanceInvoicePayload,
  CreateFinanceJournalEntryPayload,
  FinanceDepartmentExpense,
  FinanceExpenseClaim,
  FinanceInvoice,
  FinanceJournalEntry,
  FinanceMetric,
  FinanceReceivablesBucket,
  FinanceReports,
  FinanceService,
} from '../../services/finance.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-finance-workspace',
  imports: [CommonModule, FormsModule],
  templateUrl: './finance-workspace.html',
  styleUrl: './finance-workspace.scss',
})
export class FinanceWorkspaceComponent {
  readonly tabName = input.required<string>();
  private readonly financeService = inject(FinanceService);
  private readonly notificationService = inject(NotificationService);
  private loadVersion = 0;

  loading = false;
  error = '';
  journalSaving = false;
  invoiceSaving = false;
  expenseSaving = false;
  updatingInvoiceId: number | null = null;
  updatingExpenseId: number | null = null;
  invoiceFilter = 'All';
  expenseFilter = 'All';

  metrics: FinanceMetric[] = [];
  reportHighlights: FinanceMetric[] = [];
  receivables: FinanceReceivablesBucket[] = [];
  departmentExpenses: FinanceDepartmentExpense[] = [];
  journalEntries: FinanceJournalEntry[] = [];
  invoices: FinanceInvoice[] = [];
  expenseClaims: FinanceExpenseClaim[] = [];

  journalDraft: CreateFinanceJournalEntryPayload = {
    entry_code: '',
    ledger_name: '',
    period: '',
    reference: '',
    posted_by: '',
    status: 'Draft',
    amount: 0,
    summary: '',
  };

  invoiceDraft: CreateFinanceInvoicePayload = {
    invoice_code: '',
    account_name: '',
    due_date: '',
    status: 'Open',
    owner_name: '',
    aging_bucket: 'Current',
    amount_due: 0,
    summary: '',
  };

  expenseDraft: CreateFinanceExpenseClaimPayload = {
    claim_code: '',
    employee_name: '',
    department: '',
    category: '',
    submitted_date: '',
    status: 'Submitted',
    amount: 0,
    summary: '',
  };

  constructor() {
    effect(() => {
      this.tabName();
      void this.loadWorkspace();
    });
  }

  get invoiceStatuses(): string[] {
    return ['Open', 'Paid', 'Overdue', 'Disputed', 'Void'];
  }

  get expenseStatuses(): string[] {
    return ['Submitted', 'Review', 'Approved', 'Paid', 'Rejected'];
  }

  get invoiceFilters(): string[] {
    return ['All', ...new Set(this.invoices.map((invoice) => invoice.status))];
  }

  get filteredInvoices(): FinanceInvoice[] {
    if (this.invoiceFilter === 'All') {
      return this.invoices;
    }

    return this.invoices.filter((invoice) => invoice.status === this.invoiceFilter);
  }

  get expenseFilters(): string[] {
    return ['All', ...new Set(this.expenseClaims.map((claim) => claim.status))];
  }

  get filteredExpenseClaims(): FinanceExpenseClaim[] {
    if (this.expenseFilter === 'All') {
      return this.expenseClaims;
    }

    return this.expenseClaims.filter((claim) => claim.status === this.expenseFilter);
  }

  async createJournalEntry(): Promise<void> {
    if (!this.journalDraft.entry_code.trim() || !this.journalDraft.ledger_name.trim() || !this.journalDraft.posted_by.trim() || this.journalDraft.amount <= 0) {
      this.notificationService.warning('Entry code, ledger, posted by, and amount are required.', 3200);
      return;
    }

    this.journalSaving = true;
    try {
      const entry = await this.financeService.createJournalEntry({
        ...this.journalDraft,
        entry_code: this.journalDraft.entry_code.trim(),
        ledger_name: this.journalDraft.ledger_name.trim(),
        period: this.journalDraft.period.trim(),
        reference: this.journalDraft.reference.trim(),
        posted_by: this.journalDraft.posted_by.trim(),
        summary: this.journalDraft.summary.trim(),
      });
      this.journalEntries = [entry, ...this.journalEntries];
      this.resetJournalDraft();
      this.notificationService.success(`${entry.entry_code} added to the journal.`, 2600);
    } catch (error) {
      this.notificationService.error(this.describeError(error, 'Failed to create journal entry.'), 4500);
    } finally {
      this.journalSaving = false;
    }
  }

  async createInvoice(): Promise<void> {
    if (!this.invoiceDraft.invoice_code.trim() || !this.invoiceDraft.account_name.trim() || !this.invoiceDraft.owner_name.trim() || this.invoiceDraft.amount_due <= 0) {
      this.notificationService.warning('Invoice code, account, owner, and amount are required.', 3200);
      return;
    }

    this.invoiceSaving = true;
    try {
      const invoice = await this.financeService.createInvoice({
        ...this.invoiceDraft,
        invoice_code: this.invoiceDraft.invoice_code.trim(),
        account_name: this.invoiceDraft.account_name.trim(),
        due_date: this.invoiceDraft.due_date.trim(),
        owner_name: this.invoiceDraft.owner_name.trim(),
        aging_bucket: this.invoiceDraft.aging_bucket.trim(),
        summary: this.invoiceDraft.summary.trim(),
      });
      this.invoices = [invoice, ...this.invoices];
      this.invoiceFilter = 'All';
      this.resetInvoiceDraft();
      this.notificationService.success(`${invoice.invoice_code} added to invoices.`, 2600);
    } catch (error) {
      this.notificationService.error(this.describeError(error, 'Failed to create invoice.'), 4500);
    } finally {
      this.invoiceSaving = false;
    }
  }

  async createExpenseClaim(): Promise<void> {
    if (!this.expenseDraft.claim_code.trim() || !this.expenseDraft.employee_name.trim() || !this.expenseDraft.department.trim() || this.expenseDraft.amount <= 0) {
      this.notificationService.warning('Claim code, employee, department, and amount are required.', 3200);
      return;
    }

    this.expenseSaving = true;
    try {
      const claim = await this.financeService.createExpenseClaim({
        ...this.expenseDraft,
        claim_code: this.expenseDraft.claim_code.trim(),
        employee_name: this.expenseDraft.employee_name.trim(),
        department: this.expenseDraft.department.trim(),
        category: this.expenseDraft.category.trim(),
        submitted_date: this.expenseDraft.submitted_date.trim(),
        summary: this.expenseDraft.summary.trim(),
      });
      this.expenseClaims = [claim, ...this.expenseClaims];
      this.resetExpenseDraft();
      this.notificationService.success(`${claim.claim_code} added to expenses.`, 2600);
    } catch (error) {
      this.notificationService.error(this.describeError(error, 'Failed to create expense claim.'), 4500);
    } finally {
      this.expenseSaving = false;
    }
  }

  async updateInvoiceStatus(invoice: FinanceInvoice, status: string): Promise<void> {
    if (invoice.status === status) {
      return;
    }

    this.updatingInvoiceId = invoice.id;
    try {
      const updatedInvoice = await this.financeService.updateInvoiceStatus(invoice.id, status);
      this.invoices = this.invoices.map((item) => item.id === updatedInvoice.id ? updatedInvoice : item);
      this.notificationService.success(`${updatedInvoice.invoice_code} moved to ${updatedInvoice.status}.`, 2400);
    } catch (error) {
      this.notificationService.error(this.describeError(error, 'Failed to update invoice status.'), 4500);
    } finally {
      this.updatingInvoiceId = null;
    }
  }

  async updateExpenseClaimStatus(claim: FinanceExpenseClaim, status: string): Promise<void> {
    if (claim.status === status) {
      return;
    }

    this.updatingExpenseId = claim.id;
    try {
      const updatedClaim = await this.financeService.updateExpenseClaimStatus(claim.id, status);
      this.expenseClaims = this.expenseClaims.map((item) => item.id === updatedClaim.id ? updatedClaim : item);
      this.notificationService.success(`${updatedClaim.claim_code} moved to ${updatedClaim.status}.`, 2400);
    } catch (error) {
      this.notificationService.error(this.describeError(error, 'Failed to update expense status.'), 4500);
    } finally {
      this.updatingExpenseId = null;
    }
  }

  trackByMetric(_index: number, item: FinanceMetric): string {
    return item.label;
  }

  trackById(_index: number, item: { id: number }): number {
    return item.id;
  }

  private async loadWorkspace(): Promise<void> {
    const version = ++this.loadVersion;
    this.loading = true;
    this.error = '';

    try {
      const [overview, reports, journalEntries, invoices, expenseClaims] = await Promise.all([
        this.financeService.getOverview(),
        this.financeService.getReports(),
        this.financeService.getJournalEntries(),
        this.financeService.getInvoices(),
        this.financeService.getExpenseClaims(),
      ]);

      if (version !== this.loadVersion) {
        return;
      }

      this.metrics = overview.metrics;
  this.applyReports(reports);
      this.journalEntries = journalEntries;
      this.invoices = invoices;
      this.expenseClaims = expenseClaims;
    } catch (error) {
      if (version !== this.loadVersion) {
        return;
      }

      this.error = this.describeError(error, 'Failed to load finance workspace data.');
    } finally {
      if (version === this.loadVersion) {
        this.loading = false;
      }
    }
  }

  private applyReports(reports: FinanceReports): void {
    this.reportHighlights = reports.highlights;
    this.receivables = reports.receivables;
    this.departmentExpenses = reports.expenses;
  }

  private resetJournalDraft(): void {
    this.journalDraft = {
      entry_code: '',
      ledger_name: '',
      period: '',
      reference: '',
      posted_by: '',
      status: 'Draft',
      amount: 0,
      summary: '',
    };
  }

  private resetInvoiceDraft(): void {
    this.invoiceDraft = {
      invoice_code: '',
      account_name: '',
      due_date: '',
      status: 'Open',
      owner_name: '',
      aging_bucket: 'Current',
      amount_due: 0,
      summary: '',
    };
  }

  private resetExpenseDraft(): void {
    this.expenseDraft = {
      claim_code: '',
      employee_name: '',
      department: '',
      category: '',
      submitted_date: '',
      status: 'Submitted',
      amount: 0,
      summary: '',
    };
  }

  private describeError(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return fallback;
  }
}