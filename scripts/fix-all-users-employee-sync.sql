-- ============================================================================
-- FIX ALL USERS: AUTH <-> EMPLOYEES SYNC
-- Run this in Supabase SQL Editor (safe to run multiple times).
-- ============================================================================

BEGIN;

-- 1) Normalize existing employee records
UPDATE public.employees
SET
  role = CASE
    WHEN lower(trim(role)) = 'admin' THEN 'Admin'
    WHEN lower(trim(role)) = 'manager' THEN 'Manager'
    WHEN lower(trim(role)) = 'cashier' THEN 'Cashier'
    WHEN lower(trim(role)) = 'supervisor' THEN 'Supervisor'
    ELSE 'Cashier'
  END,
  status = CASE
    WHEN lower(trim(status)) IN ('active', 'inactive', 'suspended') THEN lower(trim(status))
    ELSE 'active'
  END;

-- 2) Sync supabase_user_id by matching email
-- (skip rows where the target user id is already used by another employee)
UPDATE public.employees e
SET supabase_user_id = u.id
FROM auth.users u
WHERE lower(e.email) = lower(u.email)
  AND e.supabase_user_id IS DISTINCT FROM u.id
  AND NOT EXISTS (
    SELECT 1
    FROM public.employees e2
    WHERE e2.supabase_user_id = u.id
      AND e2.id <> e.id
  );

-- 3) Insert missing employee records for auth users that do not exist in employees
WITH missing_users AS (
  SELECT
    u.id AS auth_user_id,
    COALESCE(NULLIF(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1)) AS full_name,
    u.email,
    COALESCE(NULLIF(trim(u.raw_user_meta_data ->> 'phone'), ''), '') AS phone,
    CASE
      WHEN lower(trim(COALESCE(u.raw_user_meta_data ->> 'role', ''))) = 'admin' THEN 'Admin'
      WHEN lower(trim(COALESCE(u.raw_user_meta_data ->> 'role', ''))) = 'manager' THEN 'Manager'
      WHEN lower(trim(COALESCE(u.raw_user_meta_data ->> 'role', ''))) = 'cashier' THEN 'Cashier'
      WHEN lower(trim(COALESCE(u.raw_user_meta_data ->> 'role', ''))) = 'supervisor' THEN 'Supervisor'
      ELSE 'Cashier'
    END AS normalized_role,
    NULLIF(trim(u.raw_user_meta_data ->> 'branch'), '') AS branch_name
  FROM auth.users u
  LEFT JOIN public.employees e
    ON e.supabase_user_id = u.id
    OR lower(e.email) = lower(u.email)
  WHERE e.id IS NULL
    AND u.email IS NOT NULL
),
numbered AS (
  SELECT
    m.*,
    ROW_NUMBER() OVER (ORDER BY m.auth_user_id) AS rn
  FROM missing_users m
),
max_emp AS (
  SELECT COALESCE(MAX(NULLIF(regexp_replace(employee_id, '[^0-9]', '', 'g'), '')::int), 0) AS max_n
  FROM public.employees
),
prepared AS (
  SELECT
    n.auth_user_id,
    n.full_name,
    n.email,
    n.phone,
    n.normalized_role,
    b.id AS branch_id,
    'EMP-' || LPAD((max_emp.max_n + n.rn)::text, 6, '0') AS employee_id
  FROM numbered n
  CROSS JOIN max_emp
  LEFT JOIN public.branches b
    ON lower(b.name) = lower(n.branch_name)
)
INSERT INTO public.employees (
  supabase_user_id,
  employee_id,
  full_name,
  email,
  phone,
  role,
  branch_id,
  status
)
SELECT
  p.auth_user_id,
  p.employee_id,
  p.full_name,
  p.email,
  p.phone,
  p.normalized_role,
  CASE WHEN p.normalized_role = 'Admin' THEN NULL ELSE p.branch_id END,
  'active'
FROM prepared p
ON CONFLICT (email) DO NOTHING;

COMMIT;

-- Optional verification:
-- SELECT e.full_name, e.email, e.role, e.status, e.supabase_user_id, u.id AS auth_uid
-- FROM public.employees e
-- LEFT JOIN auth.users u ON u.id = e.supabase_user_id
-- ORDER BY e.created_at DESC;
