-- ============================================================================
-- DISABLE ROW LEVEL SECURITY - Clean up infinite recursion issues
-- The application uses server-side APIs with admin role, so RLS is not needed
-- ============================================================================

-- Disable RLS on all tables
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE items DISABLE ROW LEVEL SECURITY;
ALTER TABLE refunds DISABLE ROW LEVEL SECURITY;
ALTER TABLE branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;

-- Drop all problematic policies
DROP POLICY IF EXISTS "cashier_branch_items" ON items;
DROP POLICY IF EXISTS "employee_self_view" ON employees;
DROP POLICY IF EXISTS "public_branches_read" ON branches;
DROP POLICY IF EXISTS "admin_branches_write" ON branches;
DROP POLICY IF EXISTS "admin_branches_update" ON branches;
DROP POLICY IF EXISTS "admin_branches_delete" ON branches;
DROP POLICY IF EXISTS "public_categories_read" ON categories;
DROP POLICY IF EXISTS "order_items_for_owner" ON order_items;
DROP POLICY IF EXISTS "stock_movements_for_branch" ON stock_movements;
DROP POLICY IF EXISTS "reports_admin_only" ON reports;
