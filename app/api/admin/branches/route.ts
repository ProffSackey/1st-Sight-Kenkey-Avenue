import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireApiAuth } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireApiAuth(request, ['Admin']);
    if (response) {
      return response;
    }

    const { data, error } = await supabaseAdmin
      .from('branches')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    const errorMsg = `Error fetching branches: ${err instanceof Error ? err.message : 'Unknown error'}`;
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireApiAuth(request, ['Admin']);
    if (response) {
      return response;
    }

    const body = await request.json();
    const { name, location } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Branch name is required.' }, { status: 400 });
    }

    // Simple approach: use a timestamp-based unique ID with counter
    // Format: BR-{timestamp}-{random}
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const nextId = `BR-${String(timestamp).slice(-6)}-${String(random).padStart(4, '0')}`;

    const { data, error } = await supabaseAdmin
      .from('branches')
      .insert({
        id: nextId,
        name: name.trim(),
        location: location?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Branch creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const errorMsg = `Error creating branch: ${err instanceof Error ? err.message : 'Unknown error'}`;
    console.error('Branch creation exception:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { response } = await requireApiAuth(request, ['Admin']);
    if (response) {
      return response;
    }

    const body = await request.json();
    const { id, name, location } = body;

    if (!id) {
      return NextResponse.json({ error: 'Branch ID is required.' }, { status: 400 });
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Branch name is required.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('branches')
      .update({
        name: name.trim(),
        location: location?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    const errorMsg = `Error updating branch: ${err instanceof Error ? err.message : 'Unknown error'}`;
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { response } = await requireApiAuth(request, ['Admin']);
    if (response) {
      return response;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Branch ID is required.' }, { status: 400 });
    }

    // Delete dependent items first
    await supabaseAdmin
      .from('items')
      .delete()
      .eq('branch_id', id);

    // Then delete the branch
    const { error } = await supabaseAdmin
      .from('branches')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Branch deleted successfully' }, { status: 200 });
  } catch (err) {
    const errorMsg = `Error deleting branch: ${err instanceof Error ? err.message : 'Unknown error'}`;
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
