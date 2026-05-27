-- Create database
CREATE DATABASE erp_system;

-- Connect to erp_system database and create tables
\c erp_system;

-- Create modules table
CREATE TABLE modules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create menu_items table
CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    route VARCHAR(255),
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(150),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ecommerce products table
CREATE TABLE ecommerce_products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price_cents BIGINT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL,
    conversion_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    tags TEXT,
    image_urls TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ecommerce customers table
CREATE TABLE ecommerce_customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    segment VARCHAR(120) NOT NULL,
    tier VARCHAR(50) NOT NULL,
    region VARCHAR(100) NOT NULL,
    lifetime_value_cents BIGINT NOT NULL DEFAULT 0,
    next_action TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ecommerce orders table
CREATE TABLE ecommerce_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(100) NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL REFERENCES ecommerce_customers(id) ON DELETE CASCADE,
    channel VARCHAR(100) NOT NULL,
    value_cents BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL,
    fulfillment_eta VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ecommerce promotions table
CREATE TABLE ecommerce_promotions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL,
    channel VARCHAR(120) NOT NULL,
    uplift_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    window_label VARCHAR(150) NOT NULL,
    discount_percent INTEGER NOT NULL DEFAULT 0,
    audience VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample modules
INSERT INTO modules (name, icon, "order") VALUES
('Sales', 'shopping_cart', 1),
('Inventory', 'inventory', 2),
('HR', 'people', 3),
('CRM', 'support_agent', 4),
('Finance', 'account_balance_wallet', 5),
('Purchase', 'receipt_long', 6),
('E-Commerce', 'storefront', 7);

-- Insert sample menu items for Sales
INSERT INTO menu_items (module_id, name, route, "order") VALUES
(1, 'POS', '/sales/pos', 1),
(1, 'Orders', '/sales/orders', 2),
(1, 'Invoices', '/sales/invoices', 3),
(1, 'Customers', '/sales/customers', 4);

-- Insert sample menu items for Inventory
INSERT INTO menu_items (module_id, name, route, "order") VALUES
(2, 'Stock', '/inventory/stock', 1),
(2, 'Suppliers', '/inventory/suppliers', 2),
(2, 'Reports', '/inventory/reports', 3);

-- Insert sample menu items for HR
INSERT INTO menu_items (module_id, name, route, "order") VALUES
(3, 'Employees', '/hr/employees', 1),
(3, 'Payroll', '/hr/payroll', 2),
(3, 'Attendance', '/hr/attendance', 3);

-- Insert sample menu items for CRM
INSERT INTO menu_items (module_id, name, route, "order") VALUES
(4, 'Overview', '/crm/overview', 1),
(4, 'Leads', '/crm/leads', 2),
(4, 'Accounts', '/crm/accounts', 3),
(4, 'Pipeline', '/crm/pipeline', 4);

-- Insert sample menu items for Finance
INSERT INTO menu_items (module_id, name, route, "order") VALUES
(5, 'Overview', '/finance/overview', 1),
(5, 'Journal', '/finance/journal', 2),
(5, 'Invoices', '/finance/invoices', 3),
(5, 'Expenses', '/finance/expenses', 4),
(5, 'Reports', '/finance/reports', 5);

-- Insert sample menu items for Purchase
INSERT INTO menu_items (module_id, name, route, "order") VALUES
(6, 'Overview', '/purchase/overview', 1),
(6, 'Requisitions', '/purchase/requisitions', 2),
(6, 'Orders', '/purchase/orders', 3),
(6, 'Vendors', '/purchase/vendors', 4);

-- Insert sample menu items for E-Commerce
INSERT INTO menu_items (module_id, name, route, "order") VALUES
(7, 'Dashboard', '/ecommerce/dashboard', 1),
(7, 'Storefront', '/ecommerce/storefront', 2),
(7, 'Cart', '/ecommerce/cart', 3),
(7, 'Payment', '/ecommerce/payment', 4),
(7, 'Products', '/ecommerce/products', 5),
(7, 'Checkout', '/ecommerce/checkout', 6),
(7, 'Orders', '/ecommerce/orders', 7),
(7, 'Customers', '/ecommerce/customers', 8),
(7, 'Promotions', '/ecommerce/promotions', 9),
(7, 'Analytics', '/ecommerce/analytics', 10);

-- Insert ecommerce customers
INSERT INTO ecommerce_customers (name, email, segment, tier, region, lifetime_value_cents, next_action) VALUES
('Meera Patel', 'meera.patel@example.com', 'VIP repeat buyers', 'Gold', 'West India', 482000, 'Invite to ambassador bundle preview.'),
('Arjun Verma', 'arjun.verma@example.com', 'First-order shoppers', 'Silver', 'North India', 194000, 'Recommend replenishment on earbuds accessories.'),
('Divya Rao', 'divya.rao@example.com', 'VIP repeat buyers', 'VIP', 'South India', 811000, 'Protect with priority fulfillment and white-glove support.'),
('Aarav Sharma', 'aarav.sharma@example.com', 'High intent browsers', 'Silver', 'South India', 94000, 'Retarget outerwear category with fit guidance.'),
('Priya Nair', 'priya.nair@example.com', 'At-risk subscribers', 'Gold', 'South India', 286000, 'Send replenishment reminder before 30-day churn point.'),
('Nila Krishnan', 'nila.krishnan@example.com', 'High intent browsers', 'Gold', 'International', 312000, 'Offer expedited shipping on repeat basket items.'),
('Rahul Menon', 'rahul.menon@example.com', 'At-risk subscribers', 'Silver', 'West India', 176000, 'Recover checkout with address support outreach.'),
('Kavya Reddy', 'kavya.reddy@example.com', 'VIP repeat buyers', 'VIP', 'South India', 1248000, 'Schedule premium account review and concierge support.');

-- Insert ecommerce products
INSERT INTO ecommerce_products (sku, name, category, price_cents, stock, status, conversion_rate, tags, image_urls) VALUES
('SKU-101', 'AeroFit Trail Jacket', 'Apparel', 12900, 182, 'Healthy', 5.6, '["Hero SKU","High margin"]', '["/catalog/aerofit-trail-jacket-hero.svg","/catalog/aerofit-trail-jacket-detail.svg"]'),
('SKU-117', 'Urban Carry Sling', 'Accessories', 7400, 28, 'Reorder', 4.8, '["Low stock","Bundle pick"]', '["/catalog/urban-carry-sling-hero.svg","/catalog/urban-carry-sling-angle.svg"]'),
('SKU-145', 'Pulse Pro Earbuds', 'Electronics', 19900, 0, 'Backorder', 6.2, '["Preorder","Top rated"]', '["/catalog/pulse-pro-earbuds-hero.svg","/catalog/pulse-pro-earbuds-case.svg"]'),
('SKU-168', 'Hydra Smart Bottle', 'Home', 5900, 91, 'Healthy', 3.9, '["Seasonal","Giftable"]', '["/catalog/hydra-smart-bottle-hero.svg","/catalog/hydra-smart-bottle-packaging.svg"]'),
('SKU-204', 'Nimbus Desk Lamp', 'Home', 8900, 34, 'Reorder', 4.1, '["Cross-sell","Editorial pick"]', '["/catalog/nimbus-desk-lamp-hero.svg","/catalog/nimbus-desk-lamp-desk.svg"]'),
('SKU-221', 'Studio Knit Set', 'Apparel', 14900, 116, 'Healthy', 5.1, '["Repeat buyer","New arrival"]', '["/catalog/studio-knit-set-hero.svg","/catalog/studio-knit-set-lifestyle.svg"]');

-- Insert ecommerce orders
INSERT INTO ecommerce_orders (order_number, customer_id, channel, value_cents, status, fulfillment_eta) VALUES
('EC-5401', 4, 'Web storefront', 21400, 'New', 'Pack in 24 min'),
('EC-5398', 5, 'Marketplace', 8900, 'Packed', 'Carrier pickup at 14:30'),
('EC-5392', 6, 'Social commerce', 16200, 'Shipped', 'Delivered tomorrow'),
('EC-5387', 7, 'Web storefront', 30800, 'Delayed', 'Address verification pending'),
('EC-5379', 8, 'B2B portal', 124800, 'Packed', 'Carrier pickup at 14:30');

-- Insert ecommerce promotions
INSERT INTO ecommerce_promotions (name, status, channel, uplift_percent, window_label, discount_percent, audience) VALUES
('Weekend cart recovery', 'Active', 'Email + SMS', 14.2, 'Live now', 10, 'Abandoned carts'),
('Monsoon hero bundle', 'Scheduled', 'Homepage', 9.8, 'Starts tomorrow 09:00', 18, 'Returning customers'),
('VIP loyalty top-up', 'Draft', 'App push', 6.1, 'Awaiting approval', 12, 'VIP repeat buyers'),
('Marketplace rating harvest', 'Active', 'Post-purchase email', 11.4, 'Live now', 8, 'Delivered orders');
