import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireApiAuth } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireApiAuth(request, ['Admin', 'Manager']);
    if (response) {
      return response;
    }

    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data || [], { status: 200 });
  } catch (err) {
    const errorMsg = `Error fetching categories: ${err instanceof Error ? err.message : 'Unknown error'}`;
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireApiAuth(request, ['Admin', 'Manager']);
    if (response) {
      return response;
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Category name is required.' }, { status: 400 });
    }

    // Generate category ID
    const { data: allCategories } = await supabaseAdmin
      .from('categories')
      .select('id');

    let nextNum = 1;
    if (allCategories && allCategories.length > 0) {
      const nums = allCategories
        .map(c => {
          const match = c.id.match(/CAT-(\d+)/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter(n => !isNaN(n));
      
      if (nums.length > 0) {
        nextNum = Math.max(...nums) + 1;
      }
    }

    const nextId = `CAT-${String(nextNum).padStart(3, '0')}`;

    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert({
        id: nextId,
        name: name.trim(),
        description: description?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Category creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const errorMsg = `Error creating category: ${err instanceof Error ? err.message : 'Unknown error'}`;
    console.error('Category creation exception:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
