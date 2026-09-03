import React, { useState, useEffect } from 'react';
import {
  purchaseService,
  PurchaseOverview,
  PurchaseRequisition,
  PurchaseOrder,
  PurchaseVendor,
  CreatePurchaseRequisitionPayload,
  CreatePurchaseVendorPayload,
} from '../../services/purchaseService';
import { useNotification } from '../../context/NotificationContext';
import { useI18n } from '../../i18n/I18nContext';
import {
  ShoppingCart,
  FileText,
  Truck,
  Building2,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';

interface PurchaseWorkspaceProps {
  activeSubMenu?: string;
}

export const PurchaseWorkspace: React.FC<PurchaseWorkspaceProps> = ({ activeSubMenu = 'Overview' }) => {
  const { success, warning, error: notifyError } = useNotification();
  const { translateEntity, t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<PurchaseOverview | null>(null);
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<PurchaseVendor[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showReqModal, setShowReqModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);

  // Drafts
  const [reqDraft, setReqDraft] = useState<CreatePurchaseRequisitionPayload>({
    request_code: '',
    title: '',
    department: 'Operations',
    requested_by: 'Alex Vance',
    priority: 'High',
    status: 'Pending',
    target_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    estimated_value: 12000,
    summary: 'Warehouse replenishment batch',
  });

  const [vendorDraft, setVendorDraft] = useState<CreatePurchaseVendorPayload>({
    vendor_code: '',
    name: '',
    category: 'Hardware & Tools',
    region: 'North America',
    contact_name: '',
    email: '',
    lead_time_days: 5,
    status: 'Active',
    annual_spend: 50000,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [ov, req, ord, ven] = await Promise.all([
        purchaseService.getOverview().catch(() => null),
        purchaseService.getRequisitions().catch(() => []),
        purchaseService.getOrders().catch(() => []),
        purchaseService.getVendors().catch(() => []),
      ]);
      setOverview(ov);
      setRequisitions(req);
      setOrders(ord);
      setVendors(ven);
    } catch (err: any) {
      notifyError('Failed to load purchase data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || o.order_code.toLowerCase().includes(q) || o.vendor_name.toLowerCase().includes(q);
  });

  const handleCreateReq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqDraft.request_code || !reqDraft.title) {
      warning('Please enter request code and title.');
      return;
    }
    try {
      await purchaseService.createRequisition(reqDraft);
      success(`Requisition ${reqDraft.request_code} submitted!`);
      setShowReqModal(false);
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Failed to submit requisition');
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorDraft.vendor_code || !vendorDraft.name || !vendorDraft.email) {
      warning('Please provide vendor code, name, and email.');
      return;
    }
    try {
      await purchaseService.createVendor(vendorDraft);
      success(`Vendor ${vendorDraft.name} added!`);
      setShowVendorModal(false);
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Failed to add vendor');
    }
  };

  const handleOrderStatusChange = async (orderId: number, status: string) => {
    try {
      await purchaseService.updateOrderStatus(orderId, status);
      success(`PO status updated to ${status}`);
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Failed to update PO');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-primary-light)', color: 'var(--app-primary)' }}>
            <FileText size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Requisitions')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{requisitions.length}</div>
          </div>
        </div>

        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-success-bg)', color: 'var(--app-success)' }}>
            <ShoppingCart size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Purchase Orders')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{orders.length}</div>
          </div>
        </div>

        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-hover)', color: 'var(--app-text)' }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Vendors')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{vendors.length}</div>
          </div>
        </div>

        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-warning-bg)', color: 'var(--app-warning)' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Total')} {translateEntity('Expenses')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--app-primary)' }}>
              ${orders.reduce((sum, o) => sum + (parseFloat(o.value.replace(/[^0-9.]/g, '')) || 0), 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* SubMenu Views */}
      {activeSubMenu === 'Requisitions' ? (
        /* Requisitions Tab */
        <div className="erp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{translateEntity('Requisitions')}</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => void loadData()} className="erp-btn erp-btn-secondary erp-btn-sm">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {translateEntity('Refresh')}
              </button>
              <button onClick={() => setShowReqModal(true)} className="erp-btn erp-btn-primary erp-btn-sm">
                <Plus size={14} /> {translateEntity('Add Requisition')}
              </button>
            </div>
          </div>

          <div className="erp-table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{translateEntity('Code')}</th>
                  <th>{translateEntity('Title')}</th>
                  <th>{translateEntity('Department')}</th>
                  <th>Requested By</th>
                  <th>{translateEntity('Priority')}</th>
                  <th>{translateEntity('Value')}</th>
                  <th>{translateEntity('Due Date')}</th>
                  <th>{translateEntity('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {requisitions.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--app-muted)' }}>
                      No requisitions found.
                    </td>
                  </tr>
                ) : (
                  requisitions.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--app-primary)' }}>{r.request_code}</td>
                      <td style={{ fontWeight: 600 }}>{r.title}</td>
                      <td>{r.department}</td>
                      <td>{r.requested_by}</td>
                      <td>
                        <span className={`erp-badge ${r.priority === 'High' ? 'erp-badge-danger' : 'erp-badge-info'}`}>
                          {translateEntity(r.priority)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{r.estimated_value}</td>
                      <td>{r.target_date}</td>
                      <td>
                        <span className="erp-badge erp-badge-success">{translateEntity(r.status)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeSubMenu === 'Vendors' ? (
        /* Vendors Tab */
        <div className="erp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{translateEntity('Vendors')}</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => void loadData()} className="erp-btn erp-btn-secondary erp-btn-sm">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {translateEntity('Refresh')}
              </button>
              <button onClick={() => setShowVendorModal(true)} className="erp-btn erp-btn-primary erp-btn-sm">
                <Plus size={14} /> {translateEntity('Add Supplier')}
              </button>
            </div>
          </div>

          <div className="erp-table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{translateEntity('Code')}</th>
                  <th>{translateEntity('Vendor')}</th>
                  <th>{translateEntity('Category')}</th>
                  <th>{translateEntity('Contact')}</th>
                  <th>{translateEntity('Email')}</th>
                  <th>{translateEntity('Lead Time')}</th>
                  <th>{translateEntity('Annual Value')}</th>
                  <th>{translateEntity('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {vendors.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--app-muted)' }}>
                      No vendors listed.
                    </td>
                  </tr>
                ) : (
                  vendors.map((v) => (
                    <tr key={v.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v.vendor_code}</td>
                      <td style={{ fontWeight: 700 }}>{v.name}</td>
                      <td>
                        <span className="erp-badge erp-badge-info">{translateEntity(v.category)}</span>
                      </td>
                      <td>{v.contact_name}</td>
                      <td>{v.email}</td>
                      <td>{v.lead_time}</td>
                      <td style={{ fontWeight: 700 }}>{v.annual_spend}</td>
                      <td>
                        <span className="erp-badge erp-badge-success">{translateEntity(v.status)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Purchase Orders SubMenu (Default / Purchase Orders) */
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

            <button onClick={() => void loadData()} className="erp-btn erp-btn-secondary erp-btn-sm">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {translateEntity('Refresh')}
            </button>
          </div>

          <div className="erp-table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>PO #</th>
                  <th>{translateEntity('Vendor')}</th>
                  <th>{translateEntity('Category')}</th>
                  <th>Buyer</th>
                  <th>{translateEntity('Due Date')}</th>
                  <th>{translateEntity('Total Value')}</th>
                  <th>{translateEntity('Status')}</th>
                  <th style={{ textAlign: 'right' }}>{translateEntity('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--app-muted)' }}>
                      No purchase orders found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--app-primary)' }}>{o.order_code}</td>
                      <td style={{ fontWeight: 600 }}>{o.vendor_name}</td>
                      <td>
                        <span className="erp-badge erp-badge-info">{translateEntity(o.category)}</span>
                      </td>
                      <td>{o.buyer_name}</td>
                      <td>{o.expected_receipt}</td>
                      <td style={{ fontWeight: 800 }}>{o.value}</td>
                      <td>
                        <span
                          className={`erp-badge ${
                            o.status === 'Delivered' || o.status === 'Received'
                              ? 'erp-badge-success'
                              : o.status === 'In Transit'
                              ? 'erp-badge-info'
                              : 'erp-badge-warning'
                          }`}
                        >
                          {translateEntity(o.status)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <select
                          className="erp-select"
                          style={{ width: 'auto', fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                          value={o.status}
                          onChange={(e) => handleOrderStatusChange(o.id, e.target.value)}
                        >
                          <option value="Approved">{translateEntity('Approved')}</option>
                          <option value="In Transit">{translateEntity('In Progress')}</option>
                          <option value="Received">{translateEntity('Completed')}</option>
                          <option value="Cancelled">{translateEntity('Cancelled')}</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Req Modal */}
      {showReqModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ padding: '1.5rem', maxWidth: '30rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Create Purchase Requisition</h3>
            <form onSubmit={handleCreateReq} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Code *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    placeholder="REQ-201"
                    value={reqDraft.request_code}
                    onChange={(e) => setReqDraft({ ...reqDraft, request_code: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Title *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    value={reqDraft.title}
                    onChange={(e) => setReqDraft({ ...reqDraft, title: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Department</label>
                  <input
                    type="text"
                    className="erp-input"
                    value={reqDraft.department}
                    onChange={(e) => setReqDraft({ ...reqDraft, department: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Est. Value ($)</label>
                  <input
                    type="number"
                    min={0}
                    className="erp-input"
                    value={reqDraft.estimated_value}
                    onChange={(e) => setReqDraft({ ...reqDraft, estimated_value: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowReqModal(false)} className="erp-btn erp-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="erp-btn erp-btn-primary">
                  Submit Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Vendor Modal */}
      {showVendorModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ padding: '1.5rem', maxWidth: '30rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Register Vendor</h3>
            <form onSubmit={handleCreateVendor} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Code *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    placeholder="VEN-401"
                    value={vendorDraft.vendor_code}
                    onChange={(e) => setVendorDraft({ ...vendorDraft, vendor_code: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Vendor Name *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    value={vendorDraft.name}
                    onChange={(e) => setVendorDraft({ ...vendorDraft, name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Contact Name</label>
                  <input
                    type="text"
                    className="erp-input"
                    value={vendorDraft.contact_name}
                    onChange={(e) => setVendorDraft({ ...vendorDraft, contact_name: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Email *</label>
                  <input
                    type="email"
                    required
                    className="erp-input"
                    value={vendorDraft.email}
                    onChange={(e) => setVendorDraft({ ...vendorDraft, email: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowVendorModal(false)} className="erp-btn erp-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="erp-btn erp-btn-primary">
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
