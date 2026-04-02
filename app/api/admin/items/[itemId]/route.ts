import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireApiAuth } from '@/lib/api-auth';

type RouteContext = {
  params: { itemId: string } | Promise<{ itemId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { response } = await requireApiAuth(request, ['Admin', 'Manager']);
    if (response) {
      return response;
    }

    const resolvedParams = await context.params;
    const pathItemId = request.nextUrl.pathname.split('/').filter(Boolean).at(-1) || '';
    const itemId = resolvedParams?.itemId || pathItemId;

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required.' }, { status: 400 });
    }

    const withCreator = await supabaseAdmin
      .from('items')
      .select('id, branch_id, category_id, name, size, stock_quantity, unit_price, created_at, created_by')
      .eq('id', itemId)
      .single();

    let item = withCreator.data as Record<string, unknown> | null;
    let itemError = withCreator.error;

    if (itemError && itemError.message?.toLowerCase().includes('created_by')) {
      const fallback = await supabaseAdmin
        .from('items')
        .select('id, branch_id, category_id, name, size, stock_quantity, unit_price, created_at')
        .eq('id', itemId)
        .single();
      item = fallback.data as Record<string, unknown> | null;
      itemError = fallback.error;
    }

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
    }

    const branchId = String(item.branch_id || '');
    const categoryId = String(item.category_id || '');
    const createdBy = typeof item.created_by === 'string' ? item.created_by : null;

    const [branchRes, categoryRes, employeeRes] = await Promise.all([
      branchId ? supabaseAdmin.from('branches').select('name').eq('id', branchId).single() : Promise.resolve({ data: null, error: null }),
      categoryId ? supabaseAdmin.from('categories').select('name').eq('id', categoryId).single() : Promise.resolve({ data: null, error: null }),
      createdBy ? supabaseAdmin.from('employees').select('full_name, email').eq('id', createdBy).single() : Promise.resolve({ data: null, error: null }),
    ]);

    return NextResponse.json(
      {
        ...item,
        branch_name: branchRes.data?.name || 'Unknown',
        category_name: categoryRes.data?.name || 'Unknown',
        added_by: createdBy,
        added_by_name: employeeRes.data?.full_name || null,
        added_by_email: employeeRes.data?.email || null,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Error loading item: ${message}` }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { response } = await requireApiAuth(request, ['Admin', 'Manager']);
    if (response) {
      return response;
    }

    const resolvedParams = await context.params;
    const pathItemId = request.nextUrl.pathname.split('/').filter(Boolean).at(-1) || '';
    const itemId = resolvedParams?.itemId || pathItemId;
    const body = await request.json();
    const { branchId, categoryId, name, size, stock, price } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required.' }, { status: 400 });
    }

    if (!branchId?.trim() || !categoryId?.trim() || !name?.trim()) {
      return NextResponse.json({ error: 'Branch ID, Category ID, and Item Name are required.' }, { status: 400 });
    }

    const { data: existingItem, error: existingItemError } = await supabaseAdmin
      .from('items')
      .select('id')
      .eq('id', itemId)
      .single();

    if (existingItemError || !existingItem) {
      return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
    }

    const { data: branchExists, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('id')
      .eq('id', branchId)
      .single();

    if (branchError || !branchExists) {
      return NextResponse.json({ error: 'Invalid branch.' }, { status: 400 });
    }

    const { data: categoryExists, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .single();

    if (categoryError || !categoryExists) {
      return NextResponse.json({ error: 'Invalid category.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('items')
      .update({
        branch_id: branchId,
        category_id: categoryId,
        name: name.trim(),
        size: size?.trim() || null,
        stock_quantity: Number(stock) || 0,
        unit_price: Number(price) || 0,
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Error updating item: ${message}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { response } = await requireApiAuth(request, ['Admin', 'Manager']);
    if (response) {
      return response;
    }

    const resolvedParams = await context.params;
    const itemId = resolvedParams?.itemId || '';
    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('items')
      .delete()
      .eq('id', itemId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Error deleting item: ${message}` }, { status: 500 });
  }
}
