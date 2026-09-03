import React, { useState, useEffect } from 'react';
import {
  financeService,
  FinanceOverview,
  FinanceReports,
  FinanceJournalEntry,
  FinanceInvoice,
  FinanceExpenseClaim,
  CreateFinanceJournalEntryPayload,
  CreateFinanceInvoicePayload,
  CreateFinanceExpenseClaimPayload,
} from '../../services/financeService';
import { useNotification } from '../../context/NotificationContext';
import { useI18n } from '../../i18n/I18nContext';
import {
  DollarSign,
  Receipt,
  FileSpreadsheet,
  PieChart,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface FinanceWorkspaceProps {
  activeSubMenu?: string;
}

export const FinanceWorkspace: React.FC<FinanceWorkspaceProps> = ({ activeSubMenu = 'Overview' }) => {
  const { success, warning, error: notifyError } = useNotification();
  const { translateEntity, t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [reports, setReports] = useState<FinanceReports | null>(null);
  const [journalEntries, setJournalEntries] = useState<FinanceJournalEntry[]>([]);
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([]);
  const [expenses, setExpenses] = useState<FinanceExpenseClaim[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);

  // Drafts
  const [invoiceDraft, setInvoiceDraft] = useState<CreateFinanceInvoicePayload>({
    invoice_code: '',
    account_name: '',
    due_date: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
    status: 'Pending',
    owner_name: 'Alex Vance',
    aging_bucket: 'Current',
    amount_due: 15000,
    summary: 'Cloud Infrastructure Consulting Q3',
  });

  const [expenseDraft, setExpenseDraft] = useState<CreateFinanceExpenseClaimPayload>({
    claim_code: '',
    employee_name: 'Alex Vance',
    department: 'Engineering',
    category: 'Software Subscription',
    submitted_date: new Date().toISOString().split('T')[0],
    status: 'Pending',
    amount: 1200,
    summary: 'AWS Dev Server Annual Renewal',
  });

  const [journalDraft, setJournalDraft] = useState<CreateFinanceJournalEntryPayload>({
    entry_code: '',
    ledger_name: 'General Operating Ledger',
    period: '2026-09',
    reference: 'Bank Reconciliation',
    posted_by: 'Alex Vance',
    status: 'Posted',
    amount: 50000,
    summary: 'Monthly Client Retainer Deposit',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [ov, rep, jrn, inv, exp] = await Promise.all([
        financeService.getOverview().catch(() => null),
        financeService.getReports().catch(() => null),
        financeService.getJournalEntries().catch(() => []),
        financeService.getInvoices().catch(() => []),
        financeService.getExpenseClaims().catch(() => []),
      ]);
      setOverview(ov);
      setReports(rep);
      setJournalEntries(jrn);
      setInvoices(inv);
      setExpenses(exp);
    } catch (err: any) {
      notifyError('Failed to load financial records: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || inv.invoice_code.toLowerCase().includes(q) || inv.account_name.toLowerCase().includes(q);
  });

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceDraft.invoice_code || !invoiceDraft.account_name) {
      warning('Please provide invoice code and client account.');
      return;
    }
    try {
      await financeService.createInvoice(invoiceDraft);
      success(`Invoice ${invoiceDraft.invoice_code} generated!`);
      setShowInvoiceModal(false);
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Failed to create invoice');
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDraft.claim_code || !expenseDraft.employee_name) {
      warning('Please provide claim code and employee name.');
      return;
    }
    try {
      await financeService.createExpenseClaim(expenseDraft);
      success('Expense claim filed!');
      setShowExpenseModal(false);
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Failed to file claim');
    }
  };

  const handleCreateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalDraft.entry_code || !journalDraft.ledger_name) {
      warning('Please fill in required journal entry details.');
      return;
    }
    try {
      await financeService.createJournalEntry(journalDraft);
      success('Journal entry posted to ledger!');
      setShowJournalModal(false);
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Failed to post entry');
    }
  };

  const handleInvoiceStatus = async (id: number, status: string) => {
    try {
      await financeService.updateInvoiceStatus(id, status);
      success(`Invoice status set to ${status}`);
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Failed to update invoice');
    }
  };

  const handleExpenseStatus = async (id: number, status: string) => {
    try {
      await financeService.updateExpenseClaimStatus(id, status);
      success(`Expense claim ${status.toLowerCase()}!`);
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Failed to update claim');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-success-bg)', color: 'var(--app-success)' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Total Revenue')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--app-success)' }}>
              ${invoices.reduce((sum, i) => sum + (parseFloat(i.amount_due.replace(/[^0-9.]/g, '')) || 0), 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-primary-light)', color: 'var(--app-primary)' }}>
            <Receipt size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Invoices')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{invoices.length}</div>
          </div>
        </div>

        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-warning-bg)', color: 'var(--app-warning)' }}>
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Expense Claims')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{expenses.length}</div>
          </div>
        </div>

        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-hover)', color: 'var(--app-text)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Journal')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{journalEntries.length}</div>
          </div>
        </div>
      </div>

      {/* SubMenu Views */}
      {activeSubMenu === 'Invoices' ? (
        /* Invoices Tab */
        <div className="erp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '24rem' }}>
              <Search size={16} color="var(--app-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder={translateEntity('Search') + '...'}
                className="erp-input"
                style={{ paddingLeft: '2.25rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => void loadData()} className="erp-btn erp-btn-secondary erp-btn-sm">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {translateEntity('Refresh')}
              </button>
              <button onClick={() => setShowInvoiceModal(true)} className="erp-btn erp-btn-primary erp-btn-sm">
                <Plus size={14} /> {translateEntity('Add Invoice')}
              </button>
            </div>
          </div>

          <div className="erp-table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{translateEntity('Code')}</th>
                  <th>{translateEntity('Customer')}</th>
                  <th>{translateEntity('Due Date')}</th>
                  <th>Owner</th>
                  <th>{translateEntity('Category')}</th>
                  <th>{translateEntity('Amount')}</th>
                  <th>{translateEntity('Status')}</th>
                  <th style={{ textAlign: 'right' }}>{translateEntity('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--app-muted)' }}>
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--app-primary)' }}>{inv.invoice_code}</td>
                      <td style={{ fontWeight: 600 }}>{inv.account_name}</td>
                      <td>{inv.due_date}</td>
                      <td>{inv.owner_name}</td>
                      <td>
                        <span className="erp-badge erp-badge-info">{inv.aging_bucket}</span>
                      </td>
                      <td style={{ fontWeight: 800 }}>{inv.amount_due}</td>
                      <td>
                        <span
                          className={`erp-badge ${
                            inv.status === 'Paid'
                              ? 'erp-badge-success'
                              : inv.status === 'Overdue'
                              ? 'erp-badge-danger'
                              : 'erp-badge-warning'
                          }`}
                        >
                          {translateEntity(inv.status)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <select
                          className="erp-select"
                          style={{ width: 'auto', fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                          value={inv.status}
                          onChange={(e) => handleInvoiceStatus(inv.id, e.target.value)}
                        >
                          <option value="Pending">{translateEntity('Pending')}</option>
                          <option value="Paid">{translateEntity('Paid')}</option>
                          <option value="Overdue">{translateEntity('Rejected')}</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeSubMenu === 'Expense Claims' ? (
        /* Expense Claims Tab */
        <div className="erp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{translateEntity('Expense Claims')}</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => void loadData()} className="erp-btn erp-btn-secondary erp-btn-sm">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {translateEntity('Refresh')}
              </button>
              <button onClick={() => setShowExpenseModal(true)} className="erp-btn erp-btn-primary erp-btn-sm">
                <Plus size={14} /> {translateEntity('Add Expense Claim')}
              </button>
            </div>
          </div>

          <div className="erp-table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{translateEntity('Code')}</th>
                  <th>{translateEntity('Employee')}</th>
                  <th>{translateEntity('Department')}</th>
                  <th>{translateEntity('Category')}</th>
                  <th>{translateEntity('Date')}</th>
                  <th>{translateEntity('Amount')}</th>
                  <th>{translateEntity('Status')}</th>
                  <th style={{ textAlign: 'right' }}>{translateEntity('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--app-muted)' }}>
                      No expense claims submitted.
                    </td>
                  </tr>
                ) : (
                  expenses.map((e) => (
                    <tr key={e.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--app-primary)' }}>{e.claim_code}</td>
                      <td style={{ fontWeight: 600 }}>{e.employee_name}</td>
                      <td>{e.department}</td>
                      <td>
                        <span className="erp-badge erp-badge-info">{translateEntity(e.category)}</span>
                      </td>
                      <td>{e.submitted_date}</td>
                      <td style={{ fontWeight: 800 }}>{e.amount}</td>
                      <td>
                        <span
                          className={`erp-badge ${
                            e.status === 'Approved'
                              ? 'erp-badge-success'
                              : e.status === 'Rejected'
                              ? 'erp-badge-danger'
                              : 'erp-badge-warning'
                          }`}
                        >
                          {translateEntity(e.status)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {e.status === 'Pending' && (
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button
                              onClick={() => handleExpenseStatus(e.id, 'Approved')}
                              className="erp-btn erp-btn-sm"
                              style={{ backgroundColor: 'var(--app-success)', color: '#fff', padding: '0.2rem 0.5rem' }}
                            >
                              {translateEntity('Approved')}
                            </button>
                            <button
                              onClick={() => handleExpenseStatus(e.id, 'Rejected')}
                              className="erp-btn erp-btn-danger erp-btn-sm"
                              style={{ padding: '0.2rem 0.5rem' }}
                            >
                              {translateEntity('Rejected')}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeSubMenu === 'General Ledger' || activeSubMenu === 'Ledger' ? (
        /* General Ledger Tab */
        <div className="erp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{translateEntity('Journal')}</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => void loadData()} className="erp-btn erp-btn-secondary erp-btn-sm">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {translateEntity('Refresh')}
              </button>
              <button onClick={() => setShowJournalModal(true)} className="erp-btn erp-btn-primary erp-btn-sm">
                <Plus size={14} /> {translateEntity('Post Entry')}
              </button>
            </div>
          </div>

          <div className="erp-table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{translateEntity('Code')}</th>
                  <th>{translateEntity('Category')}</th>
                  <th>Period</th>
                  <th>Reference</th>
                  <th>{translateEntity('Employee')}</th>
                  <th>{translateEntity('Amount')}</th>
                  <th>{translateEntity('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {journalEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--app-muted)' }}>
                      No ledger entries posted.
                    </td>
                  </tr>
                ) : (
                  journalEntries.map((j) => (
                    <tr key={j.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--app-primary)' }}>{j.entry_code}</td>
                      <td style={{ fontWeight: 600 }}>{j.ledger_name}</td>
                      <td>{j.period}</td>
                      <td>{j.reference}</td>
                      <td>{j.posted_by}</td>
                      <td style={{ fontWeight: 800 }}>{j.amount}</td>
                      <td>
                        <span className="erp-badge erp-badge-success">{translateEntity(j.status)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Reports / Overview Tab */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="erp-card">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Receivables Aging Analysis</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reports?.receivables && reports.receivables.length > 0 ? (
                reports.receivables.map((r) => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem', borderRadius: '0.5rem', backgroundColor: 'var(--app-hover)' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)' }}>{r.invoice_count} invoices • {r.share} of total</div>
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--app-primary)' }}>{r.amount}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--app-muted)' }}>Receivables data active.</div>
              )}
            </div>
          </div>

          <div className="erp-card">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Departmental Expense Mix</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reports?.expenses && reports.expenses.length > 0 ? (
                reports.expenses.map((ex) => (
                  <div key={ex.department} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem', borderRadius: '0.5rem', backgroundColor: 'var(--app-hover)' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{ex.department}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)' }}>{ex.claim_count} claims • {ex.status_mix}</div>
                    </div>
                    <div style={{ fontWeight: 800 }}>{ex.amount}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--app-muted)' }}>Expenses overview active.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Invoice Modal */}
      {showInvoiceModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ padding: '1.5rem', maxWidth: '30rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Create Client Invoice</h3>
            <form onSubmit={handleCreateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Code *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    placeholder="INV-301"
                    value={invoiceDraft.invoice_code}
                    onChange={(e) => setInvoiceDraft({ ...invoiceDraft, invoice_code: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Client Account *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    placeholder="Acme Corp"
                    value={invoiceDraft.account_name}
                    onChange={(e) => setInvoiceDraft({ ...invoiceDraft, account_name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Due Date</label>
                  <input
                    type="date"
                    required
                    className="erp-input"
                    value={invoiceDraft.due_date}
                    onChange={(e) => setInvoiceDraft({ ...invoiceDraft, due_date: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Amount Due ($)</label>
                  <input
                    type="number"
                    min={0}
                    className="erp-input"
                    value={invoiceDraft.amount_due}
                    onChange={(e) => setInvoiceDraft({ ...invoiceDraft, amount_due: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Summary</label>
                <input
                  type="text"
                  className="erp-input"
                  value={invoiceDraft.summary}
                  onChange={(e) => setInvoiceDraft({ ...invoiceDraft, summary: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowInvoiceModal(false)} className="erp-btn erp-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="erp-btn erp-btn-primary">
                  Save Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ padding: '1.5rem', maxWidth: '30rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>File Expense Claim</h3>
            <form onSubmit={handleCreateExpense} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Code *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    placeholder="EXP-101"
                    value={expenseDraft.claim_code}
                    onChange={(e) => setExpenseDraft({ ...expenseDraft, claim_code: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Employee Name *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    value={expenseDraft.employee_name}
                    onChange={(e) => setExpenseDraft({ ...expenseDraft, employee_name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Category</label>
                  <input
                    type="text"
                    className="erp-input"
                    value={expenseDraft.category}
                    onChange={(e) => setExpenseDraft({ ...expenseDraft, category: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Amount ($)</label>
                  <input
                    type="number"
                    min={0}
                    className="erp-input"
                    value={expenseDraft.amount}
                    onChange={(e) => setExpenseDraft({ ...expenseDraft, amount: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowExpenseModal(false)} className="erp-btn erp-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="erp-btn erp-btn-primary">
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Journal Modal */}
      {showJournalModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ padding: '1.5rem', maxWidth: '30rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Post Journal Entry</h3>
            <form onSubmit={handleCreateJournal} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Entry Code *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    placeholder="JRN-501"
                    value={journalDraft.entry_code}
                    onChange={(e) => setJournalDraft({ ...journalDraft, entry_code: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Ledger Account *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    value={journalDraft.ledger_name}
                    onChange={(e) => setJournalDraft({ ...journalDraft, ledger_name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Reference</label>
                  <input
                    type="text"
                    className="erp-input"
                    value={journalDraft.reference}
                    onChange={(e) => setJournalDraft({ ...journalDraft, reference: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Amount ($)</label>
                  <input
                    type="number"
                    min={0}
                    className="erp-input"
                    value={journalDraft.amount}
                    onChange={(e) => setJournalDraft({ ...journalDraft, amount: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowJournalModal(false)} className="erp-btn erp-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="erp-btn erp-btn-primary">
                  Post to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
