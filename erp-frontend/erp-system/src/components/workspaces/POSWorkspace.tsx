import React, { useState, useEffect, useMemo } from 'react';
import {
  ecommerceService,
  ProductItem,
  OrderItem,
  PaymentProviderOption,
  PaymentMethod,
  CheckoutPayload,
} from '../../services/ecommerceService';
import { useNotification } from '../../context/NotificationContext';
import { useI18n } from '../../i18n/I18nContext';
import {
  Store,
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Printer,
  CheckCircle2,
  RefreshCw,
  Clock,
  User,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PosCartItem {
  productId: number;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  priceLabel: string;
  availableStock: number;
}

interface POSWorkspaceProps {
  activeSubMenu?: string;
}

export const POSWorkspace: React.FC<POSWorkspaceProps> = ({ activeSubMenu = 'Register' }) => {
  const { success, warning, error: notifyError } = useNotification();
  const { translateEntity, t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [paymentProviders, setPaymentProviders] = useState<PaymentProviderOption[]>([]);

  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProvider, setSelectedProvider] = useState('razorpay');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('card');

  const [customer, setCustomer] = useState({
    fullName: 'Walk-in Customer',
    email: 'walkin@eco-pos.local',
    phone: '555-0199',
    address: 'Counter sale',
    city: 'In-store',
  });

  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [lastReceipt, setLastReceipt] = useState<OrderItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, ords, provs] = await Promise.all([
        ecommerceService.getProducts().catch(() => []),
        ecommerceService.getOrders().catch(() => []),
        ecommerceService.getPaymentOptions().catch(() => []),
      ]);
      setProducts(prods);
      setOrders(ords);
      setPaymentProviders(provs);
      if (provs.length > 0 && !selectedProvider) {
        setSelectedProvider(provs[0].id);
      }
    } catch (err: any) {
      notifyError('Failed to load POS data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [products, selectedCategory, productSearch]);

  const parsePrice = (priceStr: string) => {
    const n = parseFloat((priceStr || '').replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const addToCart = (product: ProductItem) => {
    if (product.stock <= 0) {
      warning(`${product.name} is currently out of stock.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          warning(`Max stock reached for ${product.name}`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          quantity: 1,
          unitPrice: parsePrice(product.price),
          priceLabel: product.price,
          availableStock: product.stock,
        },
      ];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (nextQty > item.availableStock) {
              warning('Cannot exceed available stock');
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter(Boolean) as PosCartItem[]
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const tax = cartSubtotal * 0.05;
  const cartTotal = cartSubtotal + tax;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      warning('Cart is empty. Add items to proceed with checkout.');
      return;
    }

    setSubmitting(true);
    const payload: CheckoutPayload = {
      full_name: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      channel: 'POS Counter Register',
      payment_provider: selectedProvider || 'razorpay',
      payment_method: selectedPaymentMethod,
      items: cart.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
    };

    try {
      const res = await ecommerceService.checkout(payload);
      success(`POS Sale complete! Receipt #${res.order.order_number}`);
      setLastReceipt(res.order);
      setCart([]);

      // Confetti burst for sale completion
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      void loadData();
    } catch (err: any) {
      notifyError(err.message || 'POS Checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Dynamic SubMenu Views */}
      {activeSubMenu === 'Orders' || activeSubMenu === 'Receipts' ? (
        /* Orders / Receipts Tab */
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
                  <th>Provider</th>
                  <th>{translateEntity('Total')}</th>
                  <th>{translateEntity('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--app-muted)' }}>
                      No orders placed yet.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--app-primary)' }}>{o.order_number}</td>
                      <td style={{ fontWeight: 600 }}>{o.customer}</td>
                      <td>
                        <span className="erp-badge erp-badge-info">{o.channel}</span>
                      </td>
                      <td style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>{o.payment_method}</td>
                      <td>{o.payment_provider}</td>
                      <td style={{ fontWeight: 800 }}>{o.value}</td>
                      <td>
                        <span className={`erp-badge ${o.status === 'Packed' || o.status === 'Shipped' ? 'erp-badge-success' : 'erp-badge-warning'}`}>
                          {translateEntity(o.status)}
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
        /* Main Point of Sale Register Layout (Grid with Products on left, Cart / Checkout on right) */
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1.2fr)', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left Column: Product Selection Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="erp-card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '12rem' }}>
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

                <select
                  className="erp-select"
                  style={{ width: 'auto' }}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c === 'All' ? translateEntity('All') : translateEntity(c)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Product Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="erp-card"
                  style={{
                    cursor: p.stock > 0 ? 'pointer' : 'not-allowed',
                    opacity: p.stock > 0 ? 1 : 0.6,
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: 'var(--app-muted)' }}>{p.sku}</span>
                      <span className={`erp-badge ${p.stock > 5 ? 'erp-badge-success' : p.stock > 0 ? 'erp-badge-warning' : 'erp-badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                        {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '0.25rem' }}>{p.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--app-muted)' }}>{p.category}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                    <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--app-primary)' }}>{p.price}</span>
                    <button
                      type="button"
                      disabled={p.stock <= 0}
                      className="erp-btn erp-btn-primary erp-btn-sm"
                      style={{ padding: '0.35rem 0.65rem' }}
                    >
                      <Plus size={14} /> {translateEntity('Add Item')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: POS Cart, Customer info, Payment & Tender */}
          <div className="erp-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'sticky', top: '5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--app-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.125rem' }}>
                <ShoppingCart size={20} color="var(--app-primary)" />
                <span>{translateEntity('Cart')}</span>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  style={{ background: 'none', border: 'none', color: 'var(--app-danger)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div style={{ maxHeight: '16rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--app-muted)', fontSize: '0.875rem' }}>
                  No items in cart. Click on products to ring them up.
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.5rem',
                      backgroundColor: 'var(--app-hover)',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)' }}>
                        ${item.unitPrice.toFixed(2)} × {item.quantity} = ${(item.unitPrice * item.quantity).toFixed(2)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="erp-btn erp-btn-secondary erp-btn-sm"
                        style={{ padding: '0.15rem 0.4rem' }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontWeight: 700, fontSize: '0.8125rem', minWidth: '1.25rem', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="erp-btn erp-btn-secondary erp-btn-sm"
                        style={{ padding: '0.15rem 0.4rem' }}
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId)}
                        style={{ background: 'none', border: 'none', color: 'var(--app-muted)', cursor: 'pointer', padding: '0.2rem' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Method Selector */}
            <div style={{ borderTop: '1px solid var(--app-border)', paddingTop: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--app-muted)', marginBottom: '0.35rem' }}>
                {translateEntity('Payment Method')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
                {(['card', 'upi', 'cod'] as PaymentMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(m)}
                    style={{
                      padding: '0.4rem',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--app-border)',
                      backgroundColor: selectedPaymentMethod === m ? 'var(--app-primary-light)' : 'var(--app-surface)',
                      color: selectedPaymentMethod === m ? 'var(--app-primary)' : 'var(--app-text)',
                      fontWeight: selectedPaymentMethod === m ? 700 : 500,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                    }}
                  >
                    {m === 'cod' ? 'Cash' : m}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary Totals & Tender */}
            <div style={{ borderTop: '1px solid var(--app-border)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--app-muted)' }}>
                <span>Subtotal</span>
                <span>${cartSubtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--app-muted)' }}>
                <span>{translateEntity('Tax')} (5%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800, color: 'var(--app-text)', marginTop: '0.25rem' }}>
                <span>{translateEntity('Total')}</span>
                <span style={{ color: 'var(--app-primary)' }}>${cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={submitting || cart.length === 0}
              className="erp-btn erp-btn-primary"
              style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', fontWeight: 700 }}
            >
              <Zap size={18} />
              <span>{submitting ? 'Processing Tender...' : `${translateEntity('Checkout')} • $${cartTotal.toFixed(2)}`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Receipt Modal Popup */}
      {lastReceipt && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ padding: '2rem', maxWidth: '24rem', textAlign: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'var(--app-success-bg)',
                color: 'var(--app-success)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <CheckCircle2 size={28} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Payment Received</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--app-muted)', marginTop: '0.25rem' }}>Receipt #{lastReceipt.order_number}</p>

            <div style={{ background: 'var(--app-hover)', padding: '1rem', borderRadius: '0.75rem', margin: '1.25rem 0', textAlign: 'left', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--app-muted)' }}>Customer</span>
                <strong>{lastReceipt.customer}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--app-muted)' }}>Amount Paid</span>
                <strong style={{ color: 'var(--app-primary)', fontSize: '1.125rem' }}>{lastReceipt.value}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--app-muted)' }}>Payment Channel</span>
                <span>{lastReceipt.payment_method.toUpperCase()} via {lastReceipt.payment_provider}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => window.print()}
                className="erp-btn erp-btn-secondary"
                style={{ flex: 1 }}
              >
                <Printer size={16} /> Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setLastReceipt(null)}
                className="erp-btn erp-btn-primary"
                style={{ flex: 1 }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
