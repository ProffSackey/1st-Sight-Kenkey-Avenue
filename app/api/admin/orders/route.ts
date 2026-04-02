import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireApiAuth } from '@/lib/api-auth';

type OrderRow = {
  id: string;
  branch_id: string;
  final_amount: number | null;
  payment_method: string | null;
  order_date: string;
  order_time: string;
  total_amount: number | null;
  discount_applied: number | null;
  notes: string | null;
  cashier_id: string | null;
};

type OrderItemRow = {
  order_id: string;
  item_id: string;
  quantity_sold: number | null;
  line_total: number | null;
};

export async function GET(request: NextRequest) {
  try {
    const { auth, response } = await requireApiAuth(request, ['Admin', 'Manager']);
    if (response) {
      return response;
    }

    let ordersQuery = supabaseAdmin
      .from('orders')
      .select('id, branch_id, final_amount, payment_method, order_date, order_time, total_amount, discount_applied, notes, cashier_id')
      .order('order_date', { ascending: false })
      .order('order_time', { ascending: false });

    if (auth?.role === 'Manager' && auth.branchId) {
      ordersQuery = ordersQuery.eq('branch_id', auth.branchId);
    }

    const { data: ordersData, error: ordersError } = await ordersQuery;
    if (ordersError) {
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: ordersError.message, code: ordersError.code },
        { status: 500 },
      );
    }

    const orders = (ordersData || []) as OrderRow[];
    if (!orders.length) {
      return NextResponse.json({ orders: [] });
    }

    const orderIds = Array.from(new Set(orders.map((o) => o.id)));
    const branchIds = Array.from(new Set(orders.map((o) => o.branch_id).filter(Boolean)));
    const cashierIds = Array.from(new Set(orders.map((o) => o.cashier_id).filter(Boolean))) as string[];

    const [orderItemsRes, branchesRes, employeesRes] = await Promise.all([
      supabaseAdmin.from('order_items').select('order_id, item_id, quantity_sold, line_total').in('order_id', orderIds),
      branchIds.length
        ? supabaseAdmin.from('branches').select('id, name').in('id', branchIds)
        : Promise.resolve({ data: [], error: null }),
      cashierIds.length
        ? supabaseAdmin.from('employees').select('id, full_name, email').in('id', cashierIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (orderItemsRes.error) {
      return NextResponse.json(
        { error: 'Failed to fetch order items', details: orderItemsRes.error.message, code: orderItemsRes.error.code },
        { status: 500 },
      );
    }

    const orderItems = (orderItemsRes.data || []) as OrderItemRow[];
    const itemIds = Array.from(new Set(orderItems.map((oi) => oi.item_id).filter(Boolean)));
    const { data: itemsData } = itemIds.length
      ? await supabaseAdmin.from('items').select('id, name').in('id', itemIds)
      : { data: [] as Array<{ id: string; name: string | null }> };

    const branchMap = new Map<string, string>(
      ((branchesRes.data || []) as Array<{ id: string; name: string | null }>).map((b) => [b.id, b.name || b.id]),
    );
    const employeeMap = new Map<string, { full_name: string | null; email: string | null }>(
      ((employeesRes.data || []) as Array<{ id: string; full_name: string | null; email: string | null }>).map((e) => [
        e.id,
        { full_name: e.full_name, email: e.email },
      ]),
    );
    const itemMap = new Map<string, string>(((itemsData || []) as Array<{ id: string; name: string | null }>).map((i) => [i.id, i.name || i.id]));

    const ordersWithLookups = orders.map((order) => {
      const cashier = order.cashier_id ? employeeMap.get(order.cashier_id) : null;
      const items = orderItems
        .filter((oi) => oi.order_id === order.id)
        .map((oi) => ({
          item_id: oi.item_id,
          quantity_sold: oi.quantity_sold ?? 0,
          line_total: oi.line_total ?? 0,
          item: {
            name: itemMap.get(oi.item_id) || 'Unknown Item',
          },
        }));

      return {
        ...order,
        branch: {
          id: order.branch_id,
          name: branchMap.get(order.branch_id) || order.branch_id,
        },
        cashier: {
          id: order.cashier_id,
          full_name: cashier?.full_name || null,
          email: cashier?.email || null,
        },
        order_items: items,
      };
    });

    return NextResponse.json({ orders: ordersWithLookups });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
