import React, { useState, useEffect } from 'react';
import {
  crmService,
  CRMOverview,
  CRMLead,
  CRMAccount,
  CRMDeal,
  CreateCRMLeadPayload,
  CreateCRMAccountPayload,
} from '../../services/crmService';
import { useNotification } from '../../context/NotificationContext';
import { useI18n } from '../../i18n/I18nContext';
import {
  Briefcase,
  Target,
  Users2,
  TrendingUp,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  ArrowRight,
  DollarSign,
} from 'lucide-react';

interface CRMWorkspaceProps {
  activeSubMenu?: string;
}

export const CRMWorkspace: React.FC<CRMWorkspaceProps> = ({ activeSubMenu = 'Overview' }) => {
  const { success, warning, error: notifyError } = useNotification();
  const { translateEntity, t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<CRMOverview | null>(null);
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [accounts, setAccounts] = useState<CRMAccount[]>([]);
  const [deals, setDeals] = useState<CRMDeal[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Drafts
  const [leadDraft, setLeadDraft] = useState<CreateCRMLeadPayload>({
    lead_code: '',
    company_name: '',
    contact_name: '',
    email: '',
    segment: 'Enterprise',
    stage: 'New',
    owner_name: 'Sarah Connor',
    estimated_value: 25000,
    last_touch_label: 'Today',
    next_step: 'Schedule demo call',
  });

  const [accountDraft, setAccountDraft] = useState<CreateCRMAccountPayload>({
    account_code: '',
    name: '',
    tier: 'Tier 1',
    industry: 'Technology',
    region: 'North America',
    owner_name: 'Sarah Connor',
    renewal_window: 'Q4 2026',
    health_status: 'Healthy',
    annual_value: 120000,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [ov, ld, acc, dl] = await Promise.all([
        crmService.getOverview().catch(() => null),
        crmService.getLeads().catch(() => []),
        crmService.getAccounts().catch(() => []),
        crmService.getDeals().catch(() => []),
      ]);
      setOverview(ov);
      setLeads(ld);
      setAccounts(acc);
      setDeals(dl);
    } catch (err: any) {
      notifyError('Failed to load CRM data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredLeads = leads.filter((l) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || l.company_name.toLowerCase().includes(q) || l.contact_name.toLowerCase().includes(q) || l.lead_code.toLowerCase().includes(q);
  });

  const filteredAccounts = accounts.filter((a) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || a.name.toLowerCase().includes(q) || a.account_code.toLowerCase().includes(q) || a.industry.toLowerCase().includes(q);
  });

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadDraft.lead_code || !leadDraft.company_name || !leadDraft.contact_name || !leadDraft.email) {
      warning('Please fill in required lead fields.');
      return;
    }
    try {
      await crmService.createLead(leadDraft);
      success(`Lead ${leadDraft.company_name} registered!`);
      setShowLeadModal(false);
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Failed to create lead');
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountDraft.account_code || !accountDraft.name) {
      warning('Please provide account code and name.');
      return;
    }
    try {
      await crmService.createAccount(accountDraft);
      success(`Account ${accountDraft.name} added!`);
      setShowAccountModal(false);
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Failed to create account');
    }
  };

  const handleDealStageChange = async (dealId: number, nextStage: string) => {
    try {
      await crmService.updateDealStage(dealId, nextStage);
      success(`Deal moved to ${nextStage}!`);
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Failed to move deal');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-primary-light)', color: 'var(--app-primary)' }}>
            <Target size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Open Leads')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{leads.length}</div>
          </div>
        </div>

        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-success-bg)', color: 'var(--app-success)' }}>
            <Users2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Active Accounts')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{accounts.length}</div>
          </div>
        </div>

        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-hover)', color: 'var(--app-text)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Deals Pipeline')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{deals.length}</div>
          </div>
        </div>

        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-warning-bg)', color: 'var(--app-warning)' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Pipeline')} {translateEntity('Value')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--app-primary)' }}>
              ${deals.reduce((sum, d) => sum + (parseFloat(d.value.replace(/[^0-9.]/g, '')) || 0), 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* SubMenu Views */}
      {activeSubMenu === 'Leads' ? (
        /* Leads Tab */
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
              <button onClick={() => setShowLeadModal(true)} className="erp-btn erp-btn-primary erp-btn-sm">
                <Plus size={14} /> {translateEntity('Add Lead')}
              </button>
            </div>
          </div>

          <div className="erp-table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{translateEntity('Code')}</th>
                  <th>{translateEntity('Company')}</th>
                  <th>{translateEntity('Contact')}</th>
                  <th>{translateEntity('Email')}</th>
                  <th>{translateEntity('Segment')}</th>
                  <th>{translateEntity('Value')}</th>
                  <th>Owner</th>
                  <th>{translateEntity('Stage')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--app-muted)' }}>
                      No leads found.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((l) => (
                    <tr key={l.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--app-primary)' }}>{l.lead_code}</td>
                      <td style={{ fontWeight: 600 }}>{l.company_name}</td>
                      <td>{l.contact_name}</td>
                      <td>{l.email}</td>
                      <td>
                        <span className="erp-badge erp-badge-info">{translateEntity(l.segment)}</span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{l.estimated_value}</td>
                      <td>{l.owner_name}</td>
                      <td>
                        <span className={`erp-badge ${l.stage === 'Qualified' || l.stage === 'Won' ? 'erp-badge-success' : 'erp-badge-warning'}`}>
                          {translateEntity(l.stage)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeSubMenu === 'Accounts' ? (
        /* Accounts Tab */
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
              <button onClick={() => setShowAccountModal(true)} className="erp-btn erp-btn-primary erp-btn-sm">
                <Plus size={14} /> {translateEntity('Add Account')}
              </button>
            </div>
          </div>

          <div className="erp-table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{translateEntity('Code')}</th>
                  <th>{translateEntity('Account Name')}</th>
                  <th>{translateEntity('Tier')}</th>
                  <th>Industry</th>
                  <th>{translateEntity('Region')}</th>
                  <th>{translateEntity('Annual Value')}</th>
                  <th>Renewal</th>
                  <th>{translateEntity('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--app-muted)' }}>
                      No accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{a.account_code}</td>
                      <td style={{ fontWeight: 700 }}>{a.name}</td>
                      <td>
                        <span className="erp-badge erp-badge-info">{translateEntity(a.tier)}</span>
                      </td>
                      <td>{a.industry}</td>
                      <td>{a.region}</td>
                      <td style={{ fontWeight: 700, color: 'var(--app-primary)' }}>{a.annual_value}</td>
                      <td>{a.renewal_window}</td>
                      <td>
                        <span className={`erp-badge ${a.health_status === 'Healthy' ? 'erp-badge-success' : 'erp-badge-warning'}`}>
                          {translateEntity(a.health_status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Deals Pipeline SubMenu (Default / Deals Pipeline) */
        <div className="erp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{translateEntity('Deals Pipeline')}</h3>
            <button onClick={() => void loadData()} className="erp-btn erp-btn-secondary erp-btn-sm">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {translateEntity('Refresh')}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {deals.map((d) => (
              <div
                key={d.id}
                style={{
                  padding: '1.125rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-hover)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--app-primary)', fontSize: '0.8125rem' }}>{d.deal_code}</span>
                  <span className="erp-badge erp-badge-info">{d.probability}</span>
                </div>

                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{d.account_name}</h4>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--app-text-subtle)', marginTop: '0.25rem' }}>{d.summary}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)' }}>Deal Value</div>
                    <div style={{ fontWeight: 800, color: 'var(--app-primary)', fontSize: '1.125rem' }}>{d.value}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)' }}>Close Target</div>
                    <div style={{ fontWeight: 600 }}>{d.close_date}</div>
                  </div>
                </div>

                {/* Stage changer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', borderTop: '1px solid var(--app-border)', paddingTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--app-muted)' }}>Stage:</span>
                  <select
                    className="erp-select"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    value={d.stage}
                    onChange={(e) => handleDealStageChange(d.id, e.target.value)}
                  >
                    <option value="Discovery">Discovery</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Closed Won">Closed Won</option>
                    <option value="Closed Lost">Closed Lost</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showLeadModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ padding: '1.5rem', maxWidth: '30rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Register CRM Lead</h3>
            <form onSubmit={handleCreateLead} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Code *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    placeholder="LEAD-101"
                    value={leadDraft.lead_code}
                    onChange={(e) => setLeadDraft({ ...leadDraft, lead_code: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Company Name *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    value={leadDraft.company_name}
                    onChange={(e) => setLeadDraft({ ...leadDraft, company_name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Contact Name *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    value={leadDraft.contact_name}
                    onChange={(e) => setLeadDraft({ ...leadDraft, contact_name: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Email *</label>
                  <input
                    type="email"
                    required
                    className="erp-input"
                    value={leadDraft.email}
                    onChange={(e) => setLeadDraft({ ...leadDraft, email: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Segment</label>
                  <select
                    className="erp-select"
                    value={leadDraft.segment}
                    onChange={(e) => setLeadDraft({ ...leadDraft, segment: e.target.value })}
                  >
                    <option value="Enterprise">Enterprise</option>
                    <option value="Mid-Market">Mid-Market</option>
                    <option value="SMB">SMB</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Est. Value ($)</label>
                  <input
                    type="number"
                    min={0}
                    className="erp-input"
                    value={leadDraft.estimated_value}
                    onChange={(e) => setLeadDraft({ ...leadDraft, estimated_value: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowLeadModal(false)} className="erp-btn erp-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="erp-btn erp-btn-primary">
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAccountModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ padding: '1.5rem', maxWidth: '30rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Register CRM Account</h3>
            <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Code *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    placeholder="ACC-101"
                    value={accountDraft.account_code}
                    onChange={(e) => setAccountDraft({ ...accountDraft, account_code: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Account Name *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    value={accountDraft.name}
                    onChange={(e) => setAccountDraft({ ...accountDraft, name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Industry</label>
                  <input
                    type="text"
                    className="erp-input"
                    value={accountDraft.industry}
                    onChange={(e) => setAccountDraft({ ...accountDraft, industry: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Region</label>
                  <input
                    type="text"
                    className="erp-input"
                    value={accountDraft.region}
                    onChange={(e) => setAccountDraft({ ...accountDraft, region: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowAccountModal(false)} className="erp-btn erp-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="erp-btn erp-btn-primary">
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
