import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireApiAuth } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { auth, response } = await requireApiAuth(request, ['Cashier', 'Manager', 'Admin']);
    if (response) {
      return response;
    }

    if (!auth?.branchId) {
      return NextResponse.json({ error: 'No branch assigned to employee.' }, { status: 403 });
    }

    const { data: itemData, error: itemError } = await supabaseAdmin
      .from('items')
      .select('id, name, unit_price, stock_quantity, category_id')
      .eq('status', 'active')
      .eq('branch_id', auth.branchId);

    if (itemError || !itemData) {
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
    }

    const categoryIds = Array.from(new Set(itemData.map((item) => item.category_id).filter(Boolean)));

    const { data: categoryData, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('id, name')
      .in('id', categoryIds);

    if (categoryError) {
      console.warn('Could not fetch category lookup:', categoryError.message);
    }

    const categoryMap = new Map<string, string>((categoryData || []).map((row) => [row.id, row.name || 'Uncategorized']));

    type ItemRecord = {
      id: string;
      name: string;
      category_id: string;
      unit_price: number;
      stock_quantity: number;
    };

    const formattedProducts = itemData.map((item: ItemRecord) => ({
      id: item.id,
      name: item.name,
      category: categoryMap.get(item.category_id) || 'Uncategorized',
      price: item.unit_price,
      stock: item.stock_quantity ?? 0,
    }));

    return NextResponse.json(formattedProducts);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
