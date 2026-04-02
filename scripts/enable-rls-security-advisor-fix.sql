-- ============================================================================
-- SECURITY ADVISOR FIX
-- Enables RLS, adds safe policies, and switches views to SECURITY INVOKER
-- Run in Supabase SQL Editor.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER) to avoid recursive RLS policy checks
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id
  FROM public.employees e
  WHERE e.supabase_user_id = auth.uid()
    AND e.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_employee_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.role
  FROM public.employees e
  WHERE e.supabase_user_id = auth.uid()
    AND e.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_employee_branch_id()
RETURNS varchar
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.branch_id
  FROM public.employees e
  WHERE e.supabase_user_id = auth.uid()
    AND e.status = 'active'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_employee_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_employee_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_employee_branch_id() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_employee_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_employee_branch_id() TO authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS on public tables flagged by Security Advisor
-- ---------------------------------------------------------------------------
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Drop old policies (idempotent)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS branches_select_authenticated ON public.branches;
DROP POLICY IF EXISTS branches_write_admin ON public.branches;

DROP POLICY IF EXISTS categories_select_authenticated ON public.categories;
DROP POLICY IF EXISTS categories_write_admin_manager ON public.categories;

DROP POLICY IF EXISTS employees_select_scoped ON public.employees;
DROP POLICY IF EXISTS employees_insert_admin ON public.employees;
DROP POLICY IF EXISTS employees_update_admin ON public.employees;
DROP POLICY IF EXISTS employees_delete_admin ON public.employees;

DROP POLICY IF EXISTS items_select_scoped ON public.items;
DROP POLICY IF EXISTS items_insert_scoped ON public.items;
DROP POLICY IF EXISTS items_update_scoped ON public.items;
DROP POLICY IF EXISTS items_delete_scoped ON public.items;

DROP POLICY IF EXISTS orders_select_scoped ON public.orders;
DROP POLICY IF EXISTS orders_insert_scoped ON public.orders;
DROP POLICY IF EXISTS orders_update_scoped ON public.orders;
DROP POLICY IF EXISTS orders_delete_scoped ON public.orders;

DROP POLICY IF EXISTS order_items_select_scoped ON public.order_items;
DROP POLICY IF EXISTS order_items_insert_scoped ON public.order_items;
DROP POLICY IF EXISTS order_items_update_scoped ON public.order_items;
DROP POLICY IF EXISTS order_items_delete_scoped ON public.order_items;

DROP POLICY IF EXISTS refunds_select_scoped ON public.refunds;
DROP POLICY IF EXISTS refunds_write_scoped ON public.refunds;

DROP POLICY IF EXISTS stock_movements_select_scoped ON public.stock_movements;
DROP POLICY IF EXISTS stock_movements_write_scoped ON public.stock_movements;

DROP POLICY IF EXISTS reports_select_scoped ON public.reports;
DROP POLICY IF EXISTS reports_write_scoped ON public.reports;

-- ---------------------------------------------------------------------------
-- branches
-- ---------------------------------------------------------------------------
CREATE POLICY branches_select_authenticated
  ON public.branches
  FOR SELECT
  TO authenticated
  USING (
    public.current_employee_role() = 'Admin'
    OR id = public.current_employee_branch_id()
  );

CREATE POLICY branches_write_admin
  ON public.branches
  FOR ALL
  TO authenticated
  USING (public.current_employee_role() = 'Admin')
  WITH CHECK (public.current_employee_role() = 'Admin');

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
CREATE POLICY categories_select_authenticated
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY categories_write_admin_manager
  ON public.categories
  FOR ALL
  TO authenticated
  USING (public.current_employee_role() IN ('Admin', 'Manager'))
  WITH CHECK (public.current_employee_role() IN ('Admin', 'Manager'));

-- ---------------------------------------------------------------------------
-- employees
-- ---------------------------------------------------------------------------
CREATE POLICY employees_select_scoped
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    supabase_user_id = auth.uid()
    OR public.current_employee_role() = 'Admin'
    OR (
      public.current_employee_role() = 'Manager'
      AND branch_id = public.current_employee_branch_id()
    )
  );

CREATE POLICY employees_insert_admin
  ON public.employees
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_employee_role() = 'Admin');

CREATE POLICY employees_update_admin
  ON public.employees
  FOR UPDATE
  TO authenticated
  USING (public.current_employee_role() = 'Admin')
  WITH CHECK (public.current_employee_role() = 'Admin');

CREATE POLICY employees_delete_admin
  ON public.employees
  FOR DELETE
  TO authenticated
  USING (public.current_employee_role() = 'Admin');

-- ---------------------------------------------------------------------------
-- items
-- ---------------------------------------------------------------------------
CREATE POLICY items_select_scoped
  ON public.items
  FOR SELECT
  TO authenticated
  USING (
    public.current_employee_role() = 'Admin'
    OR branch_id = public.current_employee_branch_id()
  );

CREATE POLICY items_insert_scoped
  ON public.items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_employee_role() = 'Admin'
    OR (
      public.current_employee_role() = 'Manager'
      AND branch_id = public.current_employee_branch_id()
    )
  );

CREATE POLICY items_update_scoped
  ON public.items
  FOR UPDATE
  TO authenticated
  USING (
    public.current_employee_role() = 'Admin'
    OR (
      public.current_employee_role() = 'Manager'
      AND branch_id = public.current_employee_branch_id()
    )
  )
  WITH CHECK (
    public.current_employee_role() = 'Admin'
    OR (
      public.current_employee_role() = 'Manager'
      AND branch_id = public.current_employee_branch_id()
    )
  );

CREATE POLICY items_delete_scoped
  ON public.items
  FOR DELETE
  TO authenticated
  USING (
    public.current_employee_role() = 'Admin'
    OR (
      public.current_employee_role() = 'Manager'
      AND branch_id = public.current_employee_branch_id()
    )
  );

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
CREATE POLICY orders_select_scoped
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    public.current_employee_role() = 'Admin'
    OR (
      public.current_employee_role() = 'Manager'
      AND branch_id = public.current_employee_branch_id()
    )
    OR cashier_id = public.current_employee_id()
  );

CREATE POLICY orders_insert_scoped
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    cashier_id = public.current_employee_id()
    AND (
      public.current_employee_role() = 'Admin'
      OR branch_id = public.current_employee_branch_id()
    )
  );

CREATE POLICY orders_update_scoped
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (
    public.current_employee_role() = 'Admin'
    OR (
      public.current_employee_role() = 'Manager'
      AND branch_id = public.current_employee_branch_id()
    )
  )
  WITH CHECK (
    public.current_employee_role() = 'Admin'
    OR (
      public.current_employee_role() = 'Manager'
      AND branch_id = public.current_employee_branch_id()
    )
  );

CREATE POLICY orders_delete_scoped
  ON public.orders
  FOR DELETE
  TO authenticated
  USING (public.current_employee_role() = 'Admin');

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------
CREATE POLICY order_items_select_scoped
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (
          public.current_employee_role() = 'Admin'
          OR (
            public.current_employee_role() = 'Manager'
            AND o.branch_id = public.current_employee_branch_id()
          )
          OR o.cashier_id = public.current_employee_id()
        )
    )
  );

CREATE POLICY order_items_insert_scoped
  ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.cashier_id = public.current_employee_id()
    )
  );

CREATE POLICY order_items_update_scoped
  ON public.order_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (
          public.current_employee_role() = 'Admin'
          OR (
            public.current_employee_role() = 'Manager'
            AND o.branch_id = public.current_employee_branch_id()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (
          public.current_employee_role() = 'Admin'
          OR (
            public.current_employee_role() = 'Manager'
            AND o.branch_id = public.current_employee_branch_id()
          )
        )
    )
  );

CREATE POLICY order_items_delete_scoped
  ON public.order_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_items.order_id
        AND public.current_employee_role() = 'Admin'
    )
  );

-- ---------------------------------------------------------------------------
-- refunds
-- ---------------------------------------------------------------------------
CREATE POLICY refunds_select_scoped
  ON public.refunds
  FOR SELECT
  TO authenticated
  USING (
    public.current_employee_role() = 'Admin'
    OR EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = refunds.order_id
        AND (
          o.branch_id = public.current_employee_branch_id()
          OR o.cashier_id = public.current_employee_id()
        )
    )
  );

CREATE POLICY refunds_write_scoped
  ON public.refunds
  FOR ALL
  TO authenticated
  USING (
    public.current_employee_role() IN ('Admin', 'Manager')
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = refunds.order_id
        AND (
          public.current_employee_role() = 'Admin'
          OR o.branch_id = public.current_employee_branch_id()
        )
    )
  )
  WITH CHECK (
    public.current_employee_role() IN ('Admin', 'Manager')
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = refunds.order_id
        AND (
          public.current_employee_role() = 'Admin'
          OR o.branch_id = public.current_employee_branch_id()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- stock_movements
-- ---------------------------------------------------------------------------
CREATE POLICY stock_movements_select_scoped
  ON public.stock_movements
  FOR SELECT
  TO authenticated
  USING (
    public.current_employee_role() = 'Admin'
    OR branch_id = public.current_employee_branch_id()
  );

CREATE POLICY stock_movements_write_scoped
  ON public.stock_movements
  FOR ALL
  TO authenticated
  USING (
    public.current_employee_role() = 'Admin'
    OR (
      public.current_employee_role() = 'Manager'
      AND branch_id = public.current_employee_branch_id()
    )
  )
  WITH CHECK (
    public.current_employee_role() = 'Admin'
    OR (
      public.current_employee_role() = 'Manager'
      AND branch_id = public.current_employee_branch_id()
    )
  );

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------
CREATE POLICY reports_select_scoped
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (
    public.current_employee_role() = 'Admin'
    OR generated_by = public.current_employee_id()
    OR (
      public.current_employee_role() = 'Manager'
      AND branch_id = public.current_employee_branch_id()
    )
  );

CREATE POLICY reports_write_scoped
  ON public.reports
  FOR ALL
  TO authenticated
  USING (
    public.current_employee_role() = 'Admin'
    OR (
      public.current_employee_role() = 'Manager'
      AND branch_id = public.current_employee_branch_id()
    )
  )
  WITH CHECK (
    (
      public.current_employee_role() = 'Admin'
      OR (
        public.current_employee_role() = 'Manager'
        AND branch_id = public.current_employee_branch_id()
      )
    )
    AND generated_by = public.current_employee_id()
  );

-- ---------------------------------------------------------------------------
-- View warnings: use SECURITY INVOKER (not definer)
-- ---------------------------------------------------------------------------
ALTER VIEW public.sales_by_branch SET (security_invoker = true);
ALTER VIEW public.inventory_status SET (security_invoker = true);

COMMIT;

-- ---------------------------------------------------------------------------
-- Extra warning fix: mutable search_path on public.is_admin
-- This updates ALL overloads of public.is_admin, if they exist.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT
      p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_admin'
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_catalog', fn.signature);
  END LOOP;
END $$;

-- ============================================================================
-- IMPORTANT:
-- 1) Do NOT run disable-rls.sql after this migration.
-- 2) Test admin/manager/cashier flows immediately after applying.
-- 3) "Leaked Password Protection" warning is an Auth setting:
--    Dashboard -> Authentication -> Settings -> Password Security ->
--    Enable leaked password protection.
-- ============================================================================
