import React, { useState, useEffect, useMemo } from 'react';
import {
  inventoryService,
  InventoryItem,
  InventorySupplier,
  InventoryReport,
  CreateInventoryItemPayload,
  CreateInventorySupplierPayload,
} from '../../services/inventoryService';
import { useNotification } from '../../context/NotificationContext';
import { useI18n } from '../../i18n/I18nContext';
import {
  Package,
  AlertTriangle,
  Truck,
  TrendingUp,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Building2,
  BarChart3,
} from 'lucide-react';

interface InventoryWorkspaceProps {
  activeSubMenu?: string;
}

export const InventoryWorkspace: React.FC<InventoryWorkspaceProps> = ({ activeSubMenu = 'Stock Overview' }) => {
  const { success, warning, error: notifyError } = useNotification();
  const { t, translateEntity } = useI18n();

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<InventorySupplier[]>([]);
  const [reports, setReports] = useState<InventoryReport[]>([]);

  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);

  // Form drafts
  const [itemDraft, setItemDraft] = useState<CreateInventoryItemPayload>({
    sku: '',
    name: '',
    category: '',
    warehouse: '',
    supplier_name: '',
    status: 'Healthy',
    reorder_point: 10,
    on_hand: 0,
    reserved: 0,
    incoming: 0,
    unit_cost: 0,
  });

  const [supplierDraft, setSupplierDraft] = useState<CreateInventorySupplierPayload>({
    name: '',
    contact_name: '',
    email: '',
    region: '',
    lead_time_days: 7,
    status: 'Active',
    payment_terms: 'Net 30',
    reliability_score: 90,
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsData, suppliersData, reportsData] = await Promise.all([
        inventoryService.getItems(),
        inventoryService.getSuppliers(),
        inventoryService.getReports(),
      ]);
      setItems(itemsData || []);
      setSuppliers(suppliersData || []);
      setReports(reportsData || []);
    } catch (err: any) {
      notifyError('Failed to load inventory: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(items.map((i) => i.category).filter(Boolean)))];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCat = categoryFilter === 'All' || item.category === categoryFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.warehouse.toLowerCase().includes(query);
      return matchesCat && matchesQuery;
    });
  }, [items, categoryFilter, searchQuery]);

  const skuCount = items.length;
  const atRiskCount = items.filter((i) => i.status === 'Critical' || i.status === 'Reorder soon').length;
  const inboundUnits = items.reduce((total, i) => total + (i.incoming || 0), 0);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemDraft.sku || !itemDraft.name || !itemDraft.category || !itemDraft.warehouse || itemDraft.unit_cost <= 0) {
      warning('Please fill in all required SKU item fields.');
      return;
    }

    try {
      await inventoryService.createItem(itemDraft);
      success(`SKU ${itemDraft.sku} added to inventory!`);
      setShowAddItemModal(false);
      setItemDraft({
        sku: '',
        name: '',
        category: '',
        warehouse: '',
        supplier_name: '',
        status: 'Healthy',
        reorder_point: 10,
        on_hand: 0,
        reserved: 0,
        incoming: 0,
        unit_cost: 0,
      });
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Failed to create item');
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierDraft.name || !supplierDraft.email || !supplierDraft.region) {
      warning('Please provide supplier name, email, and region.');
      return;
    }

    try {
      await inventoryService.createSupplier(supplierDraft);
      success(`Supplier ${supplierDraft.name} added!`);
      setShowAddSupplierModal(false);
      setSupplierDraft({
        name: '',
        contact_name: '',
        email: '',
        region: '',
        lead_time_days: 7,
        status: 'Active',
        payment_terms: 'Net 30',
        reliability_score: 90,
        notes: '',
      });
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Failed to create supplier');
    }
  };

  const handleAdjustStock = async (item: InventoryItem, delta: number) => {
    const newOnHand = Math.max(0, item.on_hand + delta);
    try {
      await inventoryService.updateItem(item.id, { on_hand: newOnHand });
      success(`Stock for ${item.sku} updated to ${newOnHand}`);
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Failed to update stock');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-primary-light)', color: 'var(--app-primary)' }}>
            <Package size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Total SKUs')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{skuCount}</div>
          </div>
        </div>

        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-danger-bg)', color: 'var(--app-danger)' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Low / At-Risk SKUs')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: atRiskCount > 0 ? 'var(--app-danger)' : 'inherit' }}>
              {atRiskCount}
            </div>
          </div>
        </div>

        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-success-bg)', color: 'var(--app-success)' }}>
            <Truck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Inbound Units')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{inboundUnits}</div>
          </div>
        </div>

        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-hover)', color: 'var(--app-text)' }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Verified Suppliers')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{suppliers.length}</div>
          </div>
        </div>
      </div>

      {/* Main Content by SubMenu */}
      {activeSubMenu === 'Suppliers' ? (
        /* Suppliers Tab */
        <div className="erp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{translateEntity('Suppliers')}</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => void loadData()} className="erp-btn erp-btn-secondary erp-btn-sm">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {translateEntity('Refresh')}
              </button>
              <button onClick={() => setShowAddSupplierModal(true)} className="erp-btn erp-btn-primary erp-btn-sm">
                <Plus size={14} /> {translateEntity('Add Supplier')}
              </button>
            </div>
          </div>

          <div className="erp-table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{translateEntity('Supplier Name')}</th>
                  <th>{translateEntity('Contact')}</th>
                  <th>{translateEntity('Email')}</th>
                  <th>{translateEntity('Region')}</th>
                  <th>{translateEntity('Lead Time')}</th>
                  <th>{translateEntity('Payment Method')}</th>
                  <th>{translateEntity('Reliability')}</th>
                  <th>{translateEntity('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--app-muted)' }}>
                      No suppliers found.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>{s.contact_name}</td>
                      <td>{s.email}</td>
                      <td>{s.region}</td>
                      <td>{s.lead_time_days} days</td>
                      <td>{s.payment_terms}</td>
                      <td>
                        <span className="erp-badge erp-badge-success">{s.reliability_score}%</span>
                      </td>
                      <td>
                        <span className={`erp-badge ${s.status === 'Active' ? 'erp-badge-success' : 'erp-badge-warning'}`}>
                          {translateEntity(s.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeSubMenu === 'Reports' ? (
        /* Reports Tab */
        <div className="erp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{translateEntity('Reports')}</h3>
            <button onClick={() => void loadData()} className="erp-btn erp-btn-secondary erp-btn-sm">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {translateEntity('Refresh')}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {reports.map((r) => (
              <div key={r.id} style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-hover)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{r.name}</span>
                  <span className="erp-badge erp-badge-info">{r.window_label}</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--app-text-subtle)', marginBottom: '0.75rem' }}>{r.summary}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8125rem' }}>
                  <div>
                    <span style={{ color: 'var(--app-muted)' }}>Fill Rate: </span>
                    <strong>{r.fill_rate}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--app-muted)' }}>Stock Cover: </span>
                    <strong>{r.stock_cover_days}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--app-muted)' }}>{translateEntity('Total Value')}: </span>
                    <strong>{r.inventory_value}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--app-muted)' }}>Risk Items: </span>
                    <strong style={{ color: 'var(--app-danger)' }}>{r.risk_skus}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Stock Overview / SKU Management Tab */
        <div className="erp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            {/* Search & Category Filter */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1, maxWidth: '32rem' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '12rem' }}>
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

              <select
                className="erp-select"
                style={{ width: 'auto' }}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {translateEntity('Category')}: {c === 'All' ? translateEntity('All') : c}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => void loadData()} className="erp-btn erp-btn-secondary erp-btn-sm">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {translateEntity('Refresh')}
              </button>
              <button onClick={() => setShowAddItemModal(true)} className="erp-btn erp-btn-primary erp-btn-sm">
                <Plus size={14} /> {translateEntity('Add Item')}
              </button>
            </div>
          </div>

          {/* Stock Table */}
          <div className="erp-table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{translateEntity('SKU')}</th>
                  <th>{translateEntity('Item Name')}</th>
                  <th>{translateEntity('Category')}</th>
                  <th>{translateEntity('Warehouse')}</th>
                  <th>{translateEntity('On Hand')}</th>
                  <th>{translateEntity('Reserved')}</th>
                  <th>{translateEntity('Incoming')}</th>
                  <th>{translateEntity('Unit Cost')}</th>
                  <th>{translateEntity('Status')}</th>
                  <th style={{ textAlign: 'right' }}>{translateEntity('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--app-muted)' }}>
                      No inventory items found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--app-primary)' }}>{item.sku}</td>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>
                        <span className="erp-badge erp-badge-info">{item.category}</span>
                      </td>
                      <td>{item.warehouse}</td>
                      <td style={{ fontWeight: 700 }}>{item.on_hand}</td>
                      <td style={{ color: 'var(--app-muted)' }}>{item.reserved}</td>
                      <td style={{ color: 'var(--app-success)', fontWeight: 600 }}>+{item.incoming}</td>
                      <td>{item.unit_cost}</td>
                      <td>
                        <span
                          className={`erp-badge ${
                            item.status === 'Critical'
                              ? 'erp-badge-danger'
                              : item.status === 'Reorder soon'
                              ? 'erp-badge-warning'
                              : 'erp-badge-success'
                          }`}
                        >
                          {translateEntity(item.status)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                          <button
                            onClick={() => handleAdjustStock(item, -1)}
                            className="erp-btn erp-btn-secondary erp-btn-sm"
                            title="Decrease Stock (-1)"
                            style={{ padding: '0.15rem 0.45rem' }}
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleAdjustStock(item, 5)}
                            className="erp-btn erp-btn-secondary erp-btn-sm"
                            title="Receive Stock (+5)"
                            style={{ padding: '0.15rem 0.45rem' }}
                          >
                            +5
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add SKU Modal */}
      {showAddItemModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ padding: '1.5rem', maxWidth: '32rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Add New SKU to Stock</h3>
            <form onSubmit={handleCreateItem} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>SKU Code *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    placeholder="e.g. SKU-9001"
                    value={itemDraft.sku}
                    onChange={(e) => setItemDraft({ ...itemDraft, sku: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Category *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    placeholder="e.g. Electronics"
                    value={itemDraft.category}
                    onChange={(e) => setItemDraft({ ...itemDraft, category: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Product Name *</label>
                <input
                  type="text"
                  required
                  className="erp-input"
                  placeholder="e.g. Wireless Barcode Scanner"
                  value={itemDraft.name}
                  onChange={(e) => setItemDraft({ ...itemDraft, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Warehouse *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    placeholder="e.g. Central WH-A"
                    value={itemDraft.warehouse}
                    onChange={(e) => setItemDraft({ ...itemDraft, warehouse: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Supplier Name *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    placeholder="e.g. Apex Global"
                    value={itemDraft.supplier_name}
                    onChange={(e) => setItemDraft({ ...itemDraft, supplier_name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Initial Qty</label>
                  <input
                    type="number"
                    min={0}
                    className="erp-input"
                    value={itemDraft.on_hand}
                    onChange={(e) => setItemDraft({ ...itemDraft, on_hand: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Reorder Pt</label>
                  <input
                    type="number"
                    min={0}
                    className="erp-input"
                    value={itemDraft.reorder_point}
                    onChange={(e) => setItemDraft({ ...itemDraft, reorder_point: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0.01}
                    required
                    className="erp-input"
                    value={itemDraft.unit_cost || ''}
                    onChange={(e) => setItemDraft({ ...itemDraft, unit_cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowAddItemModal(false)} className="erp-btn erp-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="erp-btn erp-btn-primary">
                  Save SKU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ padding: '1.5rem', maxWidth: '30rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Add Supplier</h3>
            <form onSubmit={handleCreateSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Supplier Name *</label>
                <input
                  type="text"
                  required
                  className="erp-input"
                  value={supplierDraft.name}
                  onChange={(e) => setSupplierDraft({ ...supplierDraft, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Contact Name</label>
                  <input
                    type="text"
                    className="erp-input"
                    value={supplierDraft.contact_name}
                    onChange={(e) => setSupplierDraft({ ...supplierDraft, contact_name: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Email *</label>
                  <input
                    type="email"
                    required
                    className="erp-input"
                    value={supplierDraft.email}
                    onChange={(e) => setSupplierDraft({ ...supplierDraft, email: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Region *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    value={supplierDraft.region}
                    onChange={(e) => setSupplierDraft({ ...supplierDraft, region: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Lead Time (Days)</label>
                  <input
                    type="number"
                    min={1}
                    className="erp-input"
                    value={supplierDraft.lead_time_days}
                    onChange={(e) => setSupplierDraft({ ...supplierDraft, lead_time_days: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowAddSupplierModal(false)} className="erp-btn erp-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="erp-btn erp-btn-primary">
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
