import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireApiAuth } from '@/lib/api-auth';

type ItemQueryRow = {
  id: string;
  branch_id: string;
  category_id: string;
  name: string;
  size: string | null;
  stock_quantity: number;
  unit_price: number;
  status: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
};

type LookupRow = { id: string; name?: string | null; full_name?: string | null; email?: string | null };

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireApiAuth(request, ['Admin', 'Manager']);
    if (response) {
      return response;
    }

    const baseSelect = `
      id,
      branch_id,
      category_id,
      name,
      size,
      stock_quantity,
      unit_price,
      status,
      created_at,
      updated_at
    `;

    let hasCreatedByColumn = true;
    let data: ItemQueryRow[] | null = null;
    let error: { message?: string } | null = null;

    const withCreatorResult = await supabaseAdmin
      .from('items')
      .select(`${baseSelect}, created_by`)
      .order('created_at', { ascending: false });

    if (withCreatorResult.error) {
      const errorMessage = withCreatorResult.error.message || '';
      const missingColumn = errorMessage.toLowerCase().includes('created_by');

      if (missingColumn) {
        hasCreatedByColumn = false;
        const fallbackResult = await supabaseAdmin
          .from('items')
          .select(baseSelect)
          .order('created_at', { ascending: false });
        data = fallbackResult.data;
        error = fallbackResult.error;
      } else {
        data = withCreatorResult.data;
        error = withCreatorResult.error;
      }
    } else {
      data = withCreatorResult.data;
      error = null;
    }

    if (error) {
      console.error('GET items database error:', error);
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 400 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const branchIds = Array.from(new Set(data.map((item) => item.branch_id).filter(Boolean)));
    const categoryIds = Array.from(new Set(data.map((item) => item.category_id).filter(Boolean)));
    const creatorIds = hasCreatedByColumn
      ? Array.from(new Set(data.map((item) => item.created_by).filter(Boolean))) as string[]
      : [];

    const [branchRes, categoryRes, employeeRes] = await Promise.all([
      branchIds.length
        ? supabaseAdmin.from('branches').select('id, name').in('id', branchIds)
        : Promise.resolve({ data: [] as LookupRow[], error: null }),
      categoryIds.length
        ? supabaseAdmin.from('categories').select('id, name').in('id', categoryIds)
        : Promise.resolve({ data: [] as LookupRow[], error: null }),
      creatorIds.length
        ? supabaseAdmin.from('employees').select('id, full_name, email').in('id', creatorIds)
        : Promise.resolve({ data: [] as LookupRow[], error: null }),
    ]);

    if (branchRes.error) {
      console.warn('Could not fetch branch lookup map:', branchRes.error.message);
    }
    if (categoryRes.error) {
      console.warn('Could not fetch category lookup map:', categoryRes.error.message);
    }
    if (employeeRes.error) {
      console.warn('Could not fetch employee lookup map:', employeeRes.error.message);
    }

    const branchMap = new Map<string, string>((branchRes.data || []).map((row) => [row.id, row.name || 'Unknown']));
    const categoryMap = new Map<string, string>((categoryRes.data || []).map((row) => [row.id, row.name || 'Unknown']));
    const employeeMap = new Map<string, { name: string | null; email: string | null }>(
      (employeeRes.data || []).map((row) => [row.id, { name: row.full_name || null, email: row.email || null }]),
    );

    const itemsWithNames = data.map((item) => {
      const employee = item.created_by ? employeeMap.get(item.created_by) : null;
      return {
        ...item,
        branch_name: branchMap.get(item.branch_id) || 'Unknown',
        category_name: categoryMap.get(item.category_id) || 'Unknown',
        added_by: hasCreatedByColumn ? item.created_by || null : null,
        added_by_name: employee?.name || null,
        added_by_email: employee?.email || null,
      };
    });

    return NextResponse.json(itemsWithNames, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('GET items exception:', errorMsg, err);
    return NextResponse.json({ error: `Server error: ${errorMsg}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { auth, response } = await requireApiAuth(request, ['Admin', 'Manager']);
    if (response) {
      return response;
    }

    const body = await request.json();
    const { branchId, categoryId, name, size, stock, price } = body;

    if (!branchId?.trim() || !categoryId?.trim() || !name?.trim()) {
      return NextResponse.json({ error: 'Branch ID, Category ID, and Item Name are required.' }, { status: 400 });
    }

    const { data: branchExists, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('id')
      .eq('id', branchId)
      .single();

    if (branchError || !branchExists) {
      console.error('Branch not found:', branchId);
      return NextResponse.json({ error: 'Invalid branch.' }, { status: 400 });
    }

    const { data: categoryExists, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .single();

    if (categoryError || !categoryExists) {
      console.error('Category not found:', categoryId);
      return NextResponse.json({ error: 'Invalid category.' }, { status: 400 });
    }

    const { data: allItems } = await supabaseAdmin
      .from('items')
      .select('id');

    let nextNum = 1;
    if (allItems && allItems.length > 0) {
      const nums = allItems
        .map((i) => {
          const match = i.id.match(/ITM-(\d+)/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter((n) => !isNaN(n));

      if (nums.length > 0) {
        nextNum = Math.max(...nums) + 1;
      }
    }

    const nextId = `ITM-${String(nextNum).padStart(3, '0')}`;


    const insertPayload = {
      id: nextId,
      branch_id: branchId,
      category_id: categoryId,
      name: name.trim(),
      size: size?.trim() || null,
      stock_quantity: parseInt(stock) || 0,
      unit_price: parseFloat(price) || 0,
      stock_min_threshold: 5,
      stock_max_threshold: 100,
      status: 'active',
      created_by: auth?.employeeId,
    };

    let { data, error } = await supabaseAdmin
      .from('items')
      .insert(insertPayload)
      .select()
      .single();

    if (error && error.message?.toLowerCase().includes('created_by')) {
      const fallbackPayload = {
        id: nextId,
        branch_id: branchId,
        category_id: categoryId,
        name: name.trim(),
        size: size?.trim() || null,
        stock_quantity: parseInt(stock) || 0,
        unit_price: parseFloat(price) || 0,
        stock_min_threshold: 5,
        stock_max_threshold: 100,
        status: 'active',
      };
      const fallback = await supabaseAdmin
        .from('items')
        .insert(fallbackPayload)
        .select()
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('Item creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const errorMsg = `Error creating item: ${err instanceof Error ? err.message : 'Unknown error'}`;
    console.error('Item creation exception:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
