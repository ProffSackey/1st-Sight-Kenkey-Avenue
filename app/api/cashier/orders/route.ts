import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';

export interface CreateOrderRequest {
  branchName: string;
  orderDate: string;
  orderTime: string;
  items: Array<{
    id: string;
    name: string;
    qty: number;
    price: number;
  }>;
  totalAmount: number;
  customerName: string;
  paymentMethod: string;
  comment: string;
}

export async function POST(request: NextRequest) {
  try {
    const { auth, response } = await requireApiAuth(request, ['Cashier', 'Manager', 'Admin']);
    if (response) {
      return response;
    }

    const payload: CreateOrderRequest = await request.json();

    const { data: branchData, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('id')
      .eq('name', payload.branchName)
      .single();

    if (branchError || !branchData) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 400 });
    }

    if (auth?.role === 'Cashier' && auth.branchId && auth.branchId !== branchData.id) {
      return NextResponse.json({ error: 'Forbidden branch access.' }, { status: 403 });
    }

    const orderId = `ORD-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`;

    let notes = payload.comment || '';
    if (payload.customerName) {
      notes = `Customer: ${payload.customerName}${notes ? ' | ' + notes : ''}`;
    }

    const orderData = {
      id: orderId,
      branch_id: branchData.id,
      cashier_id: auth?.employeeId,
      order_date: payload.orderDate,
      order_time: payload.orderTime,
      total_amount: payload.totalAmount,
      discount_applied: 0,
      final_amount: payload.totalAmount,
      payment_method: payload.paymentMethod,
      payment_status: 'completed',
      notes,
    };

    const { error: orderError } = await supabaseAdmin.from('orders').insert(orderData);
    if (orderError) {
      return NextResponse.json(
        { error: 'Failed to create order', details: orderError.message, code: orderError.code },
        { status: 500 },
      );
    }

    const orderItems = payload.items.map((item) => ({
      order_id: orderId,
      item_id: item.id,
      quantity_sold: item.qty,
      unit_price_at_sale: item.price,
      line_total: item.price * item.qty,
    }));

    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItems);
    if (itemsError) {
      return NextResponse.json(
        { error: 'Failed to save order items', details: itemsError.message, code: itemsError.code },
        { status: 500 },
      );
    }

    for (const i of payload.items) {
      const { data: itemData, error: itemFetchError } = await supabaseAdmin
        .from('items')
        .select('stock_quantity')
        .eq('id', i.id)
        .single();

      if (itemFetchError || !itemData) {
        continue;
      }

      const newQty = (itemData.stock_quantity ?? 0) - i.qty;
      if (newQty < 0) {
        continue;
      }

      await supabaseAdmin.from('items').update({ stock_quantity: newQty }).eq('id', i.id);
    }

    return NextResponse.json({ success: true, orderId, message: 'Order completed successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { auth, response } = await requireApiAuth(request, ['Cashier', 'Manager', 'Admin']);
    if (response) {
      return response;
    }

    if (!auth?.employeeId) {
      return NextResponse.json({ error: 'Cashier not found' }, { status: 404 });
    }

    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id,branch_id,cashier_id,final_amount,total_amount,payment_method,order_date,order_time,notes')
      .eq('cashier_id', auth.employeeId)
      .order('order_date', { ascending: false })
      .order('order_time', { ascending: false });

    if (ordersError) {
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: ordersError.message, code: ordersError.code },
        { status: 500 },
      );
    }

    const orderIds = (ordersData || []).map((order) => order.id);
    if (orderIds.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    const { data: orderItemsData, error: orderItemsError } = await supabaseAdmin
      .from('order_items')
      .select('order_id,quantity_sold,line_total,item_id')
      .in('order_id', orderIds);

    if (orderItemsError) {
      return NextResponse.json({ orders: ordersData });
    }

    const itemIds = Array.from(new Set((orderItemsData || []).map((oi) => oi.item_id)));
    const { data: itemsData } = await supabaseAdmin.from('items').select('id,name').in('id', itemIds);

    const itemMap = new Map((itemsData || []).map((item) => [item.id, item.name]));

    const orderItemsWithName = (orderItemsData || []).map((oi) => ({
      order_id: oi.order_id,
      quantity_sold: oi.quantity_sold,
      line_total: oi.line_total,
      items: { name: itemMap.get(oi.item_id) || 'Unknown' },
    }));

    const ordersWithItems = (ordersData || []).map((order) => ({
      ...order,
      order_items: orderItemsWithName.filter((oi) => oi.order_id === order.id),
    }));

    return NextResponse.json({ orders: ordersWithItems });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
