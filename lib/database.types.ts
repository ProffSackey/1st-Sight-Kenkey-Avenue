/**
 * Database Schema Types
 * These types correspond 1:1 with the PostgreSQL schema in database_schema.sql
 * 
 * Usage: Import and use these types throughout the application
 * Location: lib/database.types.ts
 */

// ============================================================================
// BRANCHES TABLE
// ============================================================================

export interface Branch {
  id: string;                    // PK: BR-001, BR-002, etc.
  name: string;                  // "East Legon", "Accra Mall", etc.
  location?: string;             // Physical address
  manager_id?: string;           // FK: UUID -> employees.id
  contact_phone?: string;
  email?: string;
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
}

export interface CreateBranchInput {
  id: string;
  name: string;
  location?: string;
  contact_phone?: string;
  email?: string;
}

// ============================================================================
// CATEGORIES TABLE
// ============================================================================

export interface Category {
  id: string;                    // PK: CAT-001, CAT-002, etc.
  name: string;                  // "Beverages", "Dairy", "Staples"
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryInput {
  id: string;
  name: string;
  description?: string;
}

// ============================================================================
// ITEMS TABLE
// ============================================================================

export interface Item {
  id: string;                    // PK: ITM-001, ITM-002, etc.
  branch_id: string;             // FK: branches.id
  category_id: string;           // FK: categories.id
  name: string;                  // "Milo", "Milk", "Corn Dough"
  size?: string;                 // "500g", "1L", "2kg"
  stock_quantity: number;        // Current stock level
  stock_min_threshold: number;   // Alert level
  stock_max_threshold: number;   // Maximum capacity
  unit_price: number;            // GHC
  reorder_cost?: number;         // Purchasing cost
  supplier_name?: string;
  last_restocked_date?: string;  // ISO date
  expiry_date?: string;          // ISO date (for perishables)
  status: ItemStatus;            // 'active' | 'discontinued'
  created_at: string;
  updated_at: string;
}

export type ItemStatus = 'active' | 'discontinued';

export interface CreateItemInput {
  id: string;
  branch_id: string;
  category_id: string;
  name: string;
  size?: string;
  stock_quantity: number;
  stock_min_threshold: number;
  stock_max_threshold: number;
  unit_price: number;
  reorder_cost?: number;
  supplier_name?: string;
  expiry_date?: string;
}

export interface UpdateItemInput {
  name?: string;
  size?: string;
  stock_quantity?: number;
  stock_min_threshold?: number;
  stock_max_threshold?: number;
  unit_price?: number;
  reorder_cost?: number;
  supplier_name?: string;
  last_restocked_date?: string;
  expiry_date?: string;
  status?: ItemStatus;
}

// ============================================================================
// EMPLOYEES TABLE
// ============================================================================

export type EmployeeRole = 'Admin' | 'Manager' | 'Cashier' | 'Supervisor';
export type EmployeeStatus = 'active' | 'inactive' | 'suspended';

export interface Employee {
  id: string;                    // PK: UUID (internal)
  supabase_user_id: string;      // FK: auth.users.id
  employee_id: string;           // Display ID: EMP-001, EMP-002
  full_name: string;
  email: string;                 // Unique
  phone?: string;
  role: EmployeeRole;
  branch_id?: string;            // FK: branches.id
  status: EmployeeStatus;        // 'active', 'inactive', 'suspended'
  hire_date?: string;            // ISO date
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeInput {
  employee_id: string;           // Must be unique
  full_name: string;
  email: string;
  phone?: string;
  role: EmployeeRole;
  branch_id?: string;
  hire_date?: string;
  password: string;              // For creating Supabase auth user
}

export interface UpdateEmployeeInput {
  full_name?: string;
  phone?: string;
  role?: EmployeeRole;
  branch_id?: string;
  status?: EmployeeStatus;
  hire_date?: string;
}

export interface EmployeeWithBranch extends Employee {
  branch?: Branch;               // Denormalized
}

// ============================================================================
// ORDERS TABLE
// ============================================================================

export type PaymentMethod = 'Cash' | 'Card' | 'Mobile Money' | 'Cheque';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Order {
  id: string;                    // PK: ORD-001, ORD-002
  branch_id: string;             // FK: branches.id
  cashier_id: string;            // FK: employees.id (UUID)
  order_date: string;            // ISO date
  order_time: string;            // HH:MM:SS format
  total_amount: number;          // Before discount
  discount_applied: number;      // GHC
  final_amount: number;          // After discount
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderInput {
  id: string;
  branch_id: string;
  cashier_id: string;
  order_date: string;
  order_time: string;
  items: CreateOrderItemInput[];  // Must include at least 1 item
  discount_applied?: number;
  payment_method: PaymentMethod;
  notes?: string;
}

export interface UpdateOrderInput {
  discount_applied?: number;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  notes?: string;
}

export interface OrderWithDetails extends Order {
  items: OrderItem[];            // Denormalized
  cashier?: Employee;
  branch?: Branch;
}

// ============================================================================
// ORDER_ITEMS TABLE
// ============================================================================

export interface OrderItem {
  id: string;                    // PK: UUID
  order_id: string;              // FK: orders.id
  item_id: string;               // FK: items.id
  quantity_sold: number;         // > 0
  unit_price_at_sale: number;    // Historical price
  line_total: number;            // quantity_sold * unit_price_at_sale - discount_per_item
  discount_per_item?: number;
  created_at: string;
}

export interface CreateOrderItemInput {
  item_id: string;
  quantity_sold: number;
  unit_price_at_sale?: number;   // If not provided, fetch from items table
  discount_per_item?: number;
}

export interface OrderItemWithDetails extends OrderItem {
  item?: Item;                   // Denormalized
}

// ============================================================================
// REFUNDS TABLE
// ============================================================================

export type RefundStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface Refund {
  id: string;                    // PK: REF-001, REF-002
  order_id: string;              // FK: orders.id (Unique constraint)
  refund_reason: string;
  refund_amount: number;
  refund_status: RefundStatus;
  approved_by?: string;          // FK: employees.id (UUID)
  approved_date?: string;        // ISO timestamp
  created_at: string;
  updated_at: string;
}

export interface CreateRefundInput {
  id: string;
  order_id: string;              // Must be unique (one refund per order)
  refund_reason: string;
  refund_amount: number;
}

export interface ApproveRefundInput {
  approved_by: string;           // Approver's employee ID (UUID)
  refund_status: 'approved' | 'rejected';
  notes?: string;
}

export interface RefundWithDetails extends Refund {
  order?: Order;                 // Denormalized
  approver?: Employee;           // Denormalized
}

// ============================================================================
// STOCK_MOVEMENTS TABLE (AUDIT TRAIL)
// ============================================================================

export type MovementType = 'sale' | 'restock' | 'adjustment' | 'damage' | 'expiry';

export interface StockMovement {
  id: string;                    // PK: UUID
  item_id: string;               // FK: items.id
  branch_id: string;             // FK: branches.id
  movement_type: MovementType;
  quantity_change: number;       // Positive (in) or negative (out)
  reference_id?: string;         // Order ID, Refund ID, etc.
  notes?: string;
  recorded_by?: string;          // FK: employees.id (UUID)
  created_at: string;
}

export interface CreateStockMovementInput {
  item_id: string;
  branch_id: string;
  movement_type: MovementType;
  quantity_change: number;
  reference_id?: string;
  notes?: string;
  recorded_by?: string;
}

// ============================================================================
// REPORTS TABLE
// ============================================================================

export type ReportType = 'sales' | 'inventory' | 'employee' | 'branch' | 'custom';

export interface Report {
  id: string;                    // PK: UUID
  report_name: string;
  report_type: ReportType;
  generated_by: string;          // FK: employees.id (UUID)
  start_date?: string;           // ISO date
  end_date?: string;             // ISO date
  branch_id?: string;            // FK: branches.id
  summary_data?: Record<string, unknown>; // JSONB
  generated_at: string;
}

export interface CreateReportInput {
  report_name: string;
  report_type: ReportType;
  generated_by: string;
  start_date?: string;
  end_date?: string;
  branch_id?: string;
  summary_data?: Record<string, unknown>;
}

// ============================================================================
// COMPUTED/DERIVED TYPES (Not in DB, but used in app)
// ============================================================================

export interface DashboardSummary {
  total_revenue: number;
  total_orders: number;
  low_stock_items: Item[];
  pending_refunds: Refund[];
  active_employees: Employee[];
}

export interface SalesByBranch {
  branch_id: string;
  branch_name: string;
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
}

export interface InventoryStatus {
  item_id: string;
  item_name: string;
  branch_name: string;
  current_stock: number;
  stock_status: 'Low Stock' | 'OK' | 'Overstock';
  min_threshold: number;
  max_threshold: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================================
// VALIDATION INPUT TYPES (Partial for forms)
// ============================================================================

export interface EmployeeFormData {
  full_name: string;
  email: string;
  phone?: string;
  role: EmployeeRole;
  branch_id?: string;
  password: string;
  confirmPassword: string;
}

export interface ItemFormData {
  name: string;
  category_id: string;
  size?: string;
  stock_quantity: number;
  stock_min_threshold: number;
  stock_max_threshold: number;
  unit_price: number;
  reorder_cost?: number;
  supplier_name?: string;
  expiry_date?: string;
}

export interface OrderFormData {
  items: Array<{
    item_id: string;
    quantity_sold: number;
    discount_per_item?: number;
  }>;
  discount_applied?: number;
  payment_method: PaymentMethod;
  notes?: string;
}

export interface RefundFormData {
  order_id: string;
  refund_reason: string;
  refund_amount?: number;  // Optional - can calculate from order
}

// ============================================================================
// FILTER/QUERY TYPES
// ============================================================================

export interface EmployeeFilter {
  search?: string;               // Search full_name, email, phone
  role?: EmployeeRole;
  branch_id?: string;
  status?: EmployeeStatus;
}

export interface ItemFilter {
  search?: string;               // Search name
  category_id?: string;
  branch_id?: string;
  status?: ItemStatus;
  low_stock_only?: boolean;
}

export interface OrderFilter {
  start_date?: string;
  end_date?: string;
  branch_id?: string;
  cashier_id?: string;
  payment_status?: PaymentStatus;
  payment_method?: PaymentMethod;
}

export interface RefundFilter {
  status?: RefundStatus;
  start_date?: string;
  end_date?: string;
  branch_id?: string;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

// Types are exported individually above
