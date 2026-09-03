import React, { useState, useEffect } from 'react';
import {
  ecommerceService,
  ProductItem,
  OrderItem,
  OverviewResponse,
  CampaignItem,
  AnalyticsResponse,
  CreateProductPayload,
  SavePromotionPayload,
} from '../../services/ecommerceService';
import { useEcommerceCart } from '../../services/ecommerceCartService';
import { useNotification } from '../../context/NotificationContext';
import { useI18n } from '../../i18n/I18nContext';
import {
  ShoppingBag,
  TrendingUp,
  Package,
  Layers,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  CheckCircle2,
  Tag,
  BarChart,
  Globe2,
} from 'lucide-react';

interface EcommerceWorkspaceProps {
  activeSubMenu?: string;
}

export const EcommerceWorkspace: React.FC<EcommerceWorkspaceProps> = ({ activeSubMenu = 'Storefront' }) => {
  const { success, warning, error: notifyError } = useNotification();
  const { translateEntity, t } = useI18n();
  const cart = useEcommerceCart();

  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [promotions, setPromotions] = useState<CampaignItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);

  const [productSearch, setProductSearch] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);

  // Drafts
  const [productDraft, setProductDraft] = useState<CreateProductPayload>({
    sku: '',
    name: '',
    category: 'Consumer Goods',
    price: 99.99,
    stock: 50,
    tags: ['featured', 'new-arrival'],
    image_urls: [],
  });

  const [promoDraft, setPromoDraft] = useState<SavePromotionPayload>({
    name: 'End of Summer Flash Sale',
    status: 'Active',
    channel: 'Storefront',
    window: 'Aug 25 - Sep 15',
    discount_percent: 20,
    audience: 'All Registered Customers',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [ov, prods, ords, promos, ana] = await Promise.all([
        ecommerceService.getOverview().catch(() => null),
        ecommerceService.getProducts().catch(() => []),
        ecommerceService.getOrders().catch(() => []),
        ecommerceService.getPromotions().catch(() => []),
        ecommerceService.getAnalytics().catch(() => null),
      ]);
      setOverview(ov);
      setProducts(prods);
      setOrders(ords);
      setPromotions(promos);
      setAnalytics(ana);
    } catch (err: any) {
      notifyError('Failed to load eCommerce data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredProducts = products.filter((p) => {
    const q = productSearch.toLowerCase().trim();
    return !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productDraft.sku || !productDraft.name) {
      warning('Please provide product SKU and name.');
      return;
    }
    try {
      await ecommerceService.createProduct(productDraft);
      success(`Product ${productDraft.name} published to store!`);
      setShowProductModal(false);
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Failed to publish product');
    }
  };

  const handleCreatePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ecommerceService.createPromotion(promoDraft);
      success(`Campaign ${promoDraft.name} launched!`);
      setShowPromotionModal(false);
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Failed to save campaign');
    }
  };

  const handleOrderStatus = async (orderId: number, status: any) => {
    try {
      await ecommerceService.updateOrderStatus(orderId, status);
      success(`Order updated to ${status}`);
      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'Failed to update order');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-primary-light)', color: 'var(--app-primary)' }}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Catalog')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{products.length}</div>
          </div>
        </div>

        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-success-bg)', color: 'var(--app-success)' }}>
            <ShoppingCart size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Orders')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{orders.length}</div>
          </div>
        </div>

        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-warning-bg)', color: 'var(--app-warning)' }}>
            <Tag size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Promotions')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{promotions.length}</div>
          </div>
        </div>

        <div className="erp-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--app-hover)', color: 'var(--app-text)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', fontWeight: 600 }}>{translateEntity('Total Revenue')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--app-primary)' }}>
              ${orders.reduce((sum, o) => sum + (parseFloat(o.value.replace(/[^0-9.]/g, '')) || 0), 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* SubMenu Views */}
      {activeSubMenu === 'Products' ? (
        /* Products Management Tab */
        <div className="erp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '24rem' }}>
              <Search size={16} color="var(--app-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder={translateEntity('Search') + '...'}
                className="erp-input"
                style={{ paddingLeft: '2.25rem' }}
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => void loadData()} className="erp-btn erp-btn-secondary erp-btn-sm">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {translateEntity('Refresh')}
              </button>
              <button onClick={() => setShowProductModal(true)} className="erp-btn erp-btn-primary erp-btn-sm">
                <Plus size={14} /> {translateEntity('Add Item')}
              </button>
            </div>
          </div>

          <div className="erp-table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{translateEntity('SKU')}</th>
                  <th>{translateEntity('Item Name')}</th>
                  <th>{translateEntity('Category')}</th>
                  <th>{translateEntity('Price')}</th>
                  <th>{translateEntity('Stock Available')}</th>
                  <th>Conversion</th>
                  <th>{translateEntity('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--app-muted)' }}>
                      No products found.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--app-primary)' }}>{p.sku}</td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>
                        <span className="erp-badge erp-badge-info">{p.category}</span>
                      </td>
                      <td style={{ fontWeight: 800 }}>{p.price}</td>
                      <td style={{ fontWeight: 700 }}>{p.stock}</td>
                      <td>{p.conversion}</td>
                      <td>
                        <span className={`erp-badge ${p.status === 'Healthy' ? 'erp-badge-success' : 'erp-badge-warning'}`}>
                          {translateEntity(p.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeSubMenu === 'Orders' ? (
        /* Orders Tab */
        <div className="erp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{translateEntity('Orders')}</h3>
            <button onClick={() => void loadData()} className="erp-btn erp-btn-secondary erp-btn-sm">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {translateEntity('Refresh')}
            </button>
          </div>

          <div className="erp-table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{translateEntity('Order #')}</th>
                  <th>{translateEntity('Customer')}</th>
                  <th>{translateEntity('Channel')}</th>
                  <th>{translateEntity('Payment')}</th>
                  <th>{translateEntity('Due Date')}</th>
                  <th>{translateEntity('Total Value')}</th>
                  <th>{translateEntity('Status')}</th>
                  <th style={{ textAlign: 'right' }}>{translateEntity('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--app-muted)' }}>
                      No orders recorded.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--app-primary)' }}>{o.order_number}</td>
                      <td style={{ fontWeight: 600 }}>{o.customer}</td>
                      <td>{o.channel}</td>
                      <td>{o.payment_provider} ({o.payment_method})</td>
                      <td>{o.fulfillment_eta}</td>
                      <td style={{ fontWeight: 800 }}>{o.value}</td>
                      <td>
                        <span
                          className={`erp-badge ${
                            o.status === 'Shipped' || o.status === 'Packed'
                              ? 'erp-badge-success'
                              : o.status === 'Delayed'
                              ? 'erp-badge-danger'
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
                          onChange={(e) => handleOrderStatus(o.id, e.target.value)}
                        >
                          <option value="New">{translateEntity('Pending')}</option>
                          <option value="Packed">{translateEntity('In Progress')}</option>
                          <option value="Shipped">{translateEntity('Completed')}</option>
                          <option value="Delayed">{translateEntity('Rejected')}</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeSubMenu === 'Promotions' ? (
        /* Promotions Tab */
        <div className="erp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{translateEntity('Promotions')}</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => void loadData()} className="erp-btn erp-btn-secondary erp-btn-sm">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {translateEntity('Refresh')}
              </button>
              <button onClick={() => setShowPromotionModal(true)} className="erp-btn erp-btn-primary erp-btn-sm">
                <Plus size={14} /> {translateEntity('Add Campaign')}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {promotions.map((p) => (
              <div key={p.id} style={{ padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-hover)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem' }}>{p.name}</span>
                  <span className={`erp-badge ${p.status === 'Active' ? 'erp-badge-success' : 'erp-badge-info'}`}>{p.status}</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--app-muted)' }}>Channel: {p.channel} • Window: {p.window}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--app-primary)' }}>{p.discount_percent}% OFF</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--app-text-subtle)' }}>Audience: {p.audience}</div>
              </div>
            ))}
          </div>
        </div>
      ) : activeSubMenu === 'Analytics' ? (
        /* Analytics Tab */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="erp-card">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Conversion Funnel Stages</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {analytics?.funnel.map((f) => (
                <div key={f.label} style={{ padding: '0.625rem', borderRadius: '0.5rem', backgroundColor: 'var(--app-hover)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>{f.label}</span>
                    <strong>{f.value} ({f.completion}%)</strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--app-border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${f.completion}%`, height: '100%', backgroundColor: 'var(--app-primary)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="erp-card">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Regional Revenue Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {analytics?.regions.map((r) => (
                <div key={r.region} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem', borderRadius: '0.5rem', backgroundColor: 'var(--app-hover)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                    <Globe2 size={16} color="var(--app-primary)" />
                    <span>{r.region}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'var(--app-primary)' }}>{r.revenue}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)' }}>{r.share}% share</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Storefront SubMenu (Default) */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
          {products.map((p) => (
            <div key={p.id} className="erp-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span className="erp-badge erp-badge-info">{translateEntity(p.category)}</span>
                  <span className="erp-badge erp-badge-success">{p.stock} in stock</span>
                </div>
                <h4 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: '0.5rem' }}>{p.name}</h4>
                <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)', marginBottom: '1rem' }}>SKU: {p.sku}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--app-border)', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--app-primary)' }}>{p.price}</span>
                <button
                  type="button"
                  onClick={() => {
                    cart.addProduct(p);
                    success(`Added ${p.name} to cart!`);
                  }}
                  className="erp-btn erp-btn-primary erp-btn-sm"
                >
                  <ShoppingCart size={14} /> {translateEntity('Add Item')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Product Modal */}
      {showProductModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ padding: '1.5rem', maxWidth: '30rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Add E-Commerce Product</h3>
            <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>SKU *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    placeholder="ECOM-101"
                    value={productDraft.sku}
                    onChange={(e) => setProductDraft({ ...productDraft, sku: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Product Name *</label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    value={productDraft.name}
                    onChange={(e) => setProductDraft({ ...productDraft, name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Category</label>
                  <input
                    type="text"
                    className="erp-input"
                    value={productDraft.category}
                    onChange={(e) => setProductDraft({ ...productDraft, category: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0.01}
                    required
                    className="erp-input"
                    value={productDraft.price}
                    onChange={(e) => setProductDraft({ ...productDraft, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Stock Quantity</label>
                <input
                  type="number"
                  min={0}
                  className="erp-input"
                  value={productDraft.stock}
                  onChange={(e) => setProductDraft({ ...productDraft, stock: Number(e.target.value) })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowProductModal(false)} className="erp-btn erp-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="erp-btn erp-btn-primary">
                  Publish Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Promotion Modal */}
      {showPromotionModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ padding: '1.5rem', maxWidth: '30rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Launch Marketing Campaign</h3>
            <form onSubmit={handleCreatePromotion} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Campaign Name *</label>
                <input
                  type="text"
                  required
                  className="erp-input"
                  value={promoDraft.name}
                  onChange={(e) => setPromoDraft({ ...promoDraft, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Channel</label>
                  <input
                    type="text"
                    className="erp-input"
                    value={promoDraft.channel}
                    onChange={(e) => setPromoDraft({ ...promoDraft, channel: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Discount %</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="erp-input"
                    value={promoDraft.discount_percent}
                    onChange={(e) => setPromoDraft({ ...promoDraft, discount_percent: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Target Audience</label>
                <input
                  type="text"
                  className="erp-input"
                  value={promoDraft.audience}
                  onChange={(e) => setPromoDraft({ ...promoDraft, audience: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowPromotionModal(false)} className="erp-btn erp-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="erp-btn erp-btn-primary">
                  Save Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
