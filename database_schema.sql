-- ============================================================================
-- 1ST SIGHT KENKEY AVENUE - DATABASE SCHEMA DDL
-- PostgreSQL / Supabase Implementation
-- ============================================================================

-- Clear existing tables (for fresh setup - comment out if data exists)
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS refunds CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS branches CASCADE;

-- ============================================================================
-- TABLE 1: BRANCHES
-- ============================================================================
CREATE TABLE branches (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  location VARCHAR(255),
  manager_id UUID,
  contact_phone VARCHAR(20),
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE branches IS 'Store locations/outlets information';
COMMENT ON COLUMN branches.id IS 'Format: BR-001';

-- ============================================================================
-- TABLE 2: EMPLOYEES
-- ============================================================================
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_user_id UUID UNIQUE NOT NULL,
  employee_id VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Manager', 'Cashier', 'Supervisor')),
  branch_id VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',
  hire_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_employees_supabase_user FOREIGN KEY (supabase_user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_employees_branch FOREIGN KEY (branch_id) 
    REFERENCES branches(id) ON DELETE SET NULL,
  CONSTRAINT status_check CHECK (status IN ('active', 'inactive', 'suspended'))
);

CREATE INDEX idx_employees_supabase_user_id ON employees(supabase_user_id);
CREATE INDEX idx_employees_branch_id ON employees(branch_id);
CREATE INDEX idx_employees_role ON employees(role);

COMMENT ON TABLE employees IS 'Employee/staff information linked to Supabase auth';
COMMENT ON COLUMN employees.id IS 'Internal UUID';
COMMENT ON COLUMN employees.employee_id IS 'Format: EMP-001';

-- Add foreign key for branch managers
ALTER TABLE branches 
  ADD CONSTRAINT fk_branches_manager FOREIGN KEY (manager_id) 
    REFERENCES employees(id) ON DELETE SET NULL;

-- ============================================================================
-- TABLE 3: CATEGORIES
-- ============================================================================
CREATE TABLE categories (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE categories IS 'Product categories for inventory classification';
COMMENT ON COLUMN categories.id IS 'Format: CAT-001';

-- ============================================================================
-- TABLE 4: ITEMS
-- ============================================================================
CREATE TABLE items (
  id VARCHAR(20) PRIMARY KEY,
  branch_id VARCHAR(20) NOT NULL,
  category_id VARCHAR(20) NOT NULL,
  created_by UUID,
  name VARCHAR(150) NOT NULL,
  size VARCHAR(50),
  stock_quantity INT NOT NULL DEFAULT 0,
  stock_min_threshold INT DEFAULT 5,
  stock_max_threshold INT DEFAULT 100,
  unit_price DECIMAL(10, 2) NOT NULL,
  reorder_cost DECIMAL(10, 2),
  supplier_name VARCHAR(100),
  last_restocked_date DATE,
  expiry_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_items_branch FOREIGN KEY (branch_id) 
    REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_category FOREIGN KEY (category_id) 
    REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_items_created_by FOREIGN KEY (created_by)
    REFERENCES employees(id) ON DELETE SET NULL,
  CONSTRAINT status_check CHECK (status IN ('active', 'discontinued'))
);

CREATE INDEX idx_items_branch_id ON items(branch_id);
CREATE INDEX idx_items_category_id ON items(category_id);
CREATE INDEX idx_items_name ON items(name);
CREATE INDEX idx_items_status ON items(status);

COMMENT ON TABLE items IS 'Inventory/product information';
COMMENT ON COLUMN items.id IS 'Format: ITM-001';

-- ============================================================================
-- TABLE 5: ORDERS
-- ============================================================================
CREATE TABLE orders (
  id VARCHAR(20) PRIMARY KEY,
  branch_id VARCHAR(20) NOT NULL,
  cashier_id UUID NOT NULL,
  customer_name VARCHAR(100),
  order_date DATE NOT NULL,
  order_time TIME NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  discount_applied DECIMAL(12, 2) DEFAULT 0,
  final_amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(50),
  payment_status VARCHAR(20) DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_orders_branch FOREIGN KEY (branch_id) 
    REFERENCES branches(id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_cashier FOREIGN KEY (cashier_id) 
    REFERENCES employees(id) ON DELETE RESTRICT,
  CONSTRAINT payment_method_check CHECK (payment_method IN ('Cash', 'Card', 'Mobile Money', 'Cheque')),
  CONSTRAINT payment_status_check CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded'))
);

CREATE INDEX idx_orders_branch_id ON orders(branch_id);
CREATE INDEX idx_orders_cashier_id ON orders(cashier_id);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);

COMMENT ON TABLE orders IS 'Sales/transaction orders';
COMMENT ON COLUMN orders.id IS 'Format: ORD-001';

-- ============================================================================
-- TABLE 6: ORDER_ITEMS
-- ============================================================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(20) NOT NULL,
  item_id VARCHAR(20) NOT NULL,
  quantity_sold INT NOT NULL,
  unit_price_at_sale DECIMAL(10, 2) NOT NULL,
  line_total DECIMAL(12, 2) NOT NULL,
  discount_per_item DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) 
    REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_item FOREIGN KEY (item_id) 
    REFERENCES items(id) ON DELETE RESTRICT,
  CONSTRAINT quantity_check CHECK (quantity_sold > 0)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_item_id ON order_items(item_id);

COMMENT ON TABLE order_items IS 'Line items in each order (many-to-many relationship)';

-- ============================================================================
-- TABLE 7: REFUNDS
-- ============================================================================
CREATE TABLE refunds (
  id VARCHAR(20) PRIMARY KEY,
  order_id VARCHAR(20) NOT NULL,
  refund_reason TEXT NOT NULL,
  refund_amount DECIMAL(12, 2) NOT NULL,
  refund_status VARCHAR(20) DEFAULT 'pending',
  approved_by UUID,
  approved_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_refunds_order FOREIGN KEY (order_id) 
    REFERENCES orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_refunds_approved_by FOREIGN KEY (approved_by) 
    REFERENCES employees(id) ON DELETE SET NULL,
  CONSTRAINT status_check CHECK (refund_status IN ('pending', 'approved', 'rejected', 'completed'))
);

CREATE INDEX idx_refunds_order_id ON refunds(order_id);
CREATE INDEX idx_refunds_status ON refunds(refund_status);

COMMENT ON TABLE refunds IS 'Track refund requests and status';
COMMENT ON COLUMN refunds.id IS 'Format: REF-001';

-- ============================================================================
-- TABLE 8: STOCK_MOVEMENTS
-- ============================================================================
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20) NOT NULL,
  movement_type VARCHAR(50),
  quantity_change INT NOT NULL,
  reference_id VARCHAR(20),
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_stock_movements_item FOREIGN KEY (item_id) 
    REFERENCES items(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_movements_branch FOREIGN KEY (branch_id) 
    REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_movements_recorded_by FOREIGN KEY (recorded_by) 
    REFERENCES employees(id) ON DELETE SET NULL,
  CONSTRAINT movement_type_check CHECK (movement_type IN ('sale', 'restock', 'adjustment', 'damage', 'expiry'))
);

CREATE INDEX idx_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX idx_stock_movements_branch_id ON stock_movements(branch_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at);

COMMENT ON TABLE stock_movements IS 'Audit trail for inventory changes';

-- ============================================================================
-- TABLE 9: REPORTS
-- ============================================================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_name VARCHAR(150) NOT NULL,
  report_type VARCHAR(50),
  generated_by UUID NOT NULL,
  start_date DATE,
  end_date DATE,
  branch_id VARCHAR(20),
  summary_data JSONB,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_reports_generated_by FOREIGN KEY (generated_by) 
    REFERENCES employees(id) ON DELETE SET NULL,
  CONSTRAINT fk_reports_branch FOREIGN KEY (branch_id) 
    REFERENCES branches(id) ON DELETE SET NULL,
  CONSTRAINT report_type_check CHECK (report_type IN ('sales', 'inventory', 'employee', 'branch', 'custom'))
);

CREATE INDEX idx_reports_generated_at ON reports(generated_at);
CREATE INDEX idx_reports_branch_id ON reports(branch_id);

COMMENT ON TABLE reports IS 'Pre-generated or parameterized reports for analytics';

-- ============================================================================
-- SAMPLE DATA (Optional - Comment out if not needed)
-- ============================================================================

-- Branches
INSERT INTO branches (id, name, location, contact_phone, email) VALUES
  ('BR-001', 'East Legon', 'East Legon Walk, Accra', '+233 5XX XXX 0001', 'eastlegon@1stkaa.com'),
  ('BR-002', 'Accra Mall', 'Accra Mall, Accra', '+233 5XX XXX 0002', 'accramall@1stkaa.com'),
  ('BR-003', 'Osu', 'Osu Centre, Accra', '+233 5XX XXX 0003', 'osu@1stkaa.com')
ON CONFLICT (id) DO NOTHING;

-- Categories
INSERT INTO categories (id, name, description) VALUES
  ('CAT-001', 'Beverages', 'Drinks and beverages'),
  ('CAT-002', 'Dairy', 'Milk, yogurt, cheese'),
  ('CAT-003', 'Staples', 'Grains, flour, sugar'),
  ('CAT-004', 'Snacks', 'Packaged snacks and treats')
ON CONFLICT (id) DO NOTHING;

-- Items (Milo, Milk, Corn Dough)
INSERT INTO items (id, branch_id, category_id, name, size, stock_quantity, unit_price, supplier_name, status) VALUES
  ('ITM-001', 'BR-001', 'CAT-001', 'Milo', '500g', 45, 15.99, 'Nestlé Ghana', 'active'),
  ('ITM-002', 'BR-001', 'CAT-002', 'Milk', '1L', 60, 8.99, 'Fan Milk', 'active'),
  ('ITM-003', 'BR-001', 'CAT-003', 'Corn Dough', '2kg', 30, 12.50, 'Local Supplier', 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY DISABLED
-- ============================================================================
-- RLS is disabled because the application uses server-side APIs with admin role
-- All database operations go through Next.js API routes using supabaseAdmin client
-- This approach is simpler, faster, and avoids circular policy dependencies
-- Access control is enforced at the API layer instead


-- ============================================================================
-- VIEWS (Optional - Common Queries)
-- ============================================================================

-- Sales Summary by Branch
CREATE OR REPLACE VIEW sales_by_branch AS
  SELECT 
    b.id,
    b.name,
    COUNT(o.id) AS total_orders,
    SUM(o.final_amount) AS total_revenue,
    AVG(o.final_amount) AS avg_order_value,
    o.order_date
  FROM branches b
  LEFT JOIN orders o ON b.id = o.branch_id
  GROUP BY b.id, b.name, o.order_date
  ORDER BY o.order_date DESC;

-- Inventory Status
CREATE OR REPLACE VIEW inventory_status AS
  SELECT 
    i.id,
    i.name,
    i.size,
    i.stock_quantity,
    i.stock_min_threshold,
    i.stock_max_threshold,
    b.name AS branch,
    c.name AS category,
    CASE 
      WHEN i.stock_quantity < i.stock_min_threshold THEN 'Low Stock'
      WHEN i.stock_quantity > i.stock_max_threshold THEN 'Overstock'
      ELSE 'OK'
    END AS stock_status
  FROM items i
  JOIN branches b ON i.branch_id = b.id
  JOIN categories c ON i.category_id = c.id;

-- ============================================================================
-- MIGRATION VERSION (Track schema changes)
-- ============================================================================
-- Run this to track schema versions in production:
CREATE TABLE IF NOT EXISTS schema_migrations (
 version VARCHAR(50) PRIMARY KEY,
 description TEXT,
executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
INSERT INTO schema_migrations (version, description) VALUES
 ('001', 'Initial schema creation - branches, employees, categories, items, orders, order_items, refunds, stock_movements, reports')
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- END OF SCHEMA DDL
-- ============================================================================
